import React, { useState, useEffect, useCallback, useRef } from 'react';
import { hyperApi } from '../services/hyperApi';
import { priceStreamService, type PriceComparison as PriceComparisonData } from '../services/priceStreamService';
import { telegramAlertService } from '../services/telegramService';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

// Track duration for symbols with >0.5% price diff
interface DurationTracker {
  [symbol: string]: number | null; // Timestamp when diff exceeded 0.5%, or null if below
}

const PriceComparison: React.FC = () => {
  const [priceComparisons, setPriceComparisons] = useState<PriceComparisonData[]>([]);
  const [commonSymbols, setCommonSymbols] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [volumeMap, setVolumeMap] = useState<Record<string, number>>({});
  const durationTrackerRef = useRef<DurationTracker>({});
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [pinnedThreshold, setPinnedThreshold] = useState<number>(1.0);

  // Auto-detect API URL based on environment
  const getApiUrl = () => {
    // Priority 1: Environment variable
    if (process.env.REACT_APP_TELEGRAM_API_URL) {
      return process.env.REACT_APP_TELEGRAM_API_URL.replace('/api/price-alert', '');
    }
    // Priority 2: Production environment (not localhost)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return 'https://telegram-alert-service.352848845.workers.dev';
    }
    // Priority 3: Local development
    return 'http://localhost:3001';
  };
  
  const API_URL = getApiUrl();

  // Load threshold from backend on mount
  useEffect(() => {
    const loadThreshold = async () => {
      try {
        const response = await fetch(`${API_URL}/api/threshold`);
        const data = await response.json();
        const value = data.threshold || 1.0;
        setPinnedThreshold(value);
        telegramAlertService.setAlertThreshold(value);
      } catch (error) {
        console.error('Failed to load threshold:', error);
        // Fallback to telegramService's current threshold
        setPinnedThreshold(telegramAlertService.getAlertThreshold());
      }
    };
    
    loadThreshold();
  }, [API_URL]);

  // Load volume data from Hyperliquid
  const loadVolumeData = useCallback(async () => {
    try {
      const response = await axios.post('https://api.hyperliquid.xyz/info', {
        type: 'metaAndAssetCtxs'
      });

      const metaData = Array.isArray(response.data) ? response.data[0] : response.data;
      const assetContexts = Array.isArray(response.data) ? response.data[1] : response.data?.assetContexts;
      
      if (metaData?.universe && Array.isArray(assetContexts)) {
        const volumes: Record<string, number> = {};
        // assetContexts array corresponds to universe array by index
        metaData.universe.forEach((item: any, index: number) => {
          const symbol = item.name;
          const ctx = assetContexts[index];
          if (symbol && ctx && ctx.dayNtlVlm !== undefined) {
            volumes[symbol] = parseFloat(ctx.dayNtlVlm || '0');
          }
        });
        setVolumeMap(volumes);
      }
    } catch (error) {
      console.error('Error loading volume data:', error);
    }
  }, []);

  // Update duration tracker based on price differences
  useEffect(() => {
    const tracker = durationTrackerRef.current;
    const now = Date.now();
    
    priceComparisons.forEach((comparison) => {
      const absDiffPercent = Math.abs(comparison.priceDiffPercent);
      const symbol = comparison.symbol;
      
      if (absDiffPercent > pinnedThreshold) {
        // If already tracking, keep the timestamp; otherwise, start tracking
        if (tracker[symbol] === null || tracker[symbol] === undefined) {
          tracker[symbol] = now;
        }
      } else {
        // Reset if diff goes below threshold
        tracker[symbol] = null;
      }
    });
    
    setCurrentTime(now);
  }, [priceComparisons]);

  // Update timer every second to show duration
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load symbols and initialize WebSocket connections
  useEffect(() => {
    let loadingTimeout: NodeJS.Timeout | null = null;
    let volumeInterval: NodeJS.Timeout | null = null;
    let unsubscribe: (() => void) | null = null;
    
    const initialize = async () => {
      try {
        console.log('Initializing price comparison...');
        setIsLoading(true);
        const syms = await hyperApi.getSymbols();
        console.log('Loaded symbols:', syms.length);
        
        const common = await priceStreamService.initialize(syms);
        console.log('Common symbols:', common.length);
        setCommonSymbols(common);
        
        // Load volume data (don't await to avoid blocking)
        loadVolumeData().catch(err => console.error('Volume data load error:', err));
        
        // Subscribe to price updates
        unsubscribe = priceStreamService.subscribe((comparisons) => {
          console.log('Price updates received:', comparisons.length, 'comparisons');
          setPriceComparisons(comparisons);
          setIsLoading(false);
          
          // Check and send Telegram alerts for price differences > 1%
          telegramAlertService.checkAndAlert(comparisons).catch(err => 
            console.error('Telegram alert error:', err)
          );
        });

        // Ensure loading state is cleared after a timeout
        loadingTimeout = setTimeout(() => {
          console.log('Loading timeout reached');
          setIsLoading(false);
        }, 10000); // 10 seconds timeout

        // Refresh volume data every 5 minutes
        volumeInterval = setInterval(() => {
          loadVolumeData().catch(err => console.error('Volume data refresh error:', err));
        }, 5 * 60 * 1000);

      } catch (error) {
        console.error('Error initializing price stream:', error);
        setIsLoading(false);
      }
    };

    initialize();
    
    return () => {
      console.log('Cleaning up price comparison...');
      if (unsubscribe) unsubscribe();
      priceStreamService.disconnect();
      if (volumeInterval) clearInterval(volumeInterval);
      if (loadingTimeout) clearTimeout(loadingTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  const formatNumber = (num: number, decimals: number = 2) => {
    if (num === 0) return '-';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatPriceDiff = (percent: number) => {
    if (percent === 0) return '0.00%';
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(4)}%`;
  };

  const getPriceDiffColor = (percent: number) => {
    if (Math.abs(percent) < 0.01) return 'text-gray-600';
    return percent > 0 ? 'text-red-600' : 'text-green-600';
  };

  // Get duration in seconds for symbols with >threshold diff
  const getDuration = (symbol: string): number => {
    const startTime = durationTrackerRef.current[symbol];
    if (startTime === null || startTime === undefined) return 0;
    return Math.floor((currentTime - startTime) / 1000);
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  // Separate comparisons: those with >threshold diff and others
  const highDiffComparisons = priceComparisons.filter(
    (c) => Math.abs(c.priceDiffPercent) > pinnedThreshold
  );
  const normalComparisons = priceComparisons.filter(
    (c) => Math.abs(c.priceDiffPercent) <= pinnedThreshold
  );

  // Sort high diff by duration (longest first), then by diff percentage
  const sortedHighDiff = [...highDiffComparisons].sort((a, b) => {
    const durationA = getDuration(a.symbol);
    const durationB = getDuration(b.symbol);
    if (durationA !== durationB) return durationB - durationA;
    return Math.abs(b.priceDiffPercent) - Math.abs(a.priceDiffPercent);
  });

  // Sort normal by volume (highest first), then by diff percentage
  const sortedNormal = [...normalComparisons].sort((a, b) => {
    const volumeA = volumeMap[a.symbol] || 0;
    const volumeB = volumeMap[b.symbol] || 0;
    if (volumeA !== volumeB) return volumeB - volumeA;
    return Math.abs(b.priceDiffPercent) - Math.abs(a.priceDiffPercent);
  });

  const sortedComparisons = [...sortedHighDiff, ...sortedNormal];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">实时价格对比</h1>
          <div className="text-sm text-gray-500 mt-1">
            显示 Hyperliquid 和币安都支持的交易对 | 数据实时更新
          </div>
        </div>
        <div className="text-sm text-gray-500">
          共 {commonSymbols.length} 个交易对
        </div>
      </div>

      {/* Pinned Section for >threshold price difference */}
      <div className="card bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-orange-900 flex items-center gap-2">
            <span>🔥</span>
            顶置：价差超过{pinnedThreshold}%的交易对
          </h2>
          <div className="text-sm text-orange-700 mt-1">
            以下交易对价差超过{pinnedThreshold}%，已按持续时间排序
          </div>
        </div>
        
        {sortedHighDiff.length === 0 ? (
          <div className="py-6 text-center text-gray-600 bg-white rounded-lg border border-gray-200">
            <div className="text-lg font-medium mb-1">当前没有价差超过{pinnedThreshold}%的交易对</div>
            <div className="text-sm text-gray-500">当有交易对价差超过{pinnedThreshold}%时，将自动显示在此区域</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-orange-200">
                  <th className="text-left py-3 px-4 font-semibold text-orange-900">交易对</th>
                  <th className="text-right py-3 px-4 font-semibold text-orange-900">Hyperliquid</th>
                  <th className="text-right py-3 px-4 font-semibold text-orange-900">币安</th>
                  <th className="text-right py-3 px-4 font-semibold text-orange-900">价差 (%)</th>
                  <th className="text-right py-3 px-4 font-semibold text-orange-900">持续时间</th>
                  <th className="text-right py-3 px-4 font-semibold text-orange-900">套利机会</th>
                </tr>
              </thead>
              <tbody>
                {sortedHighDiff.map((comparison) => {
                  const hasBothPrices = comparison.hyperliquidPrice > 0 && comparison.binancePrice > 0;
                  const isHyperHigher = comparison.hyperliquidPrice > comparison.binancePrice;
                  const duration = getDuration(comparison.symbol);

                  return (
                    <tr
                      key={comparison.symbol}
                      className="border-b border-orange-100 hover:bg-orange-50 transition-colors bg-white"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">{comparison.symbol}</div>
                      </td>
                      <td className="text-right py-3 px-4">
                        {comparison.hyperliquidPrice > 0 ? (
                          <div className="font-mono">
                            ${formatNumber(comparison.hyperliquidPrice, 2)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="text-right py-3 px-4">
                        {comparison.binancePrice > 0 ? (
                          <div className="font-mono">
                            ${formatNumber(comparison.binancePrice, 2)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="text-right py-3 px-4">
                        {hasBothPrices ? (
                          <div className={`font-bold text-lg ${getPriceDiffColor(comparison.priceDiffPercent)}`}>
                            {formatPriceDiff(comparison.priceDiffPercent)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="text-right py-3 px-4">
                        <div className="font-semibold text-orange-700">
                          {formatDuration(duration)}
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        {hasBothPrices ? (
                          <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-200 text-orange-900 rounded font-medium">
                            {isHyperHigher ? (
                              <>
                                <ArrowDownIcon className="w-4 h-4" />
                                币安买入
                              </>
                            ) : (
                              <>
                                <ArrowUpIcon className="w-4 h-4" />
                                Hyper买入
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Regular price comparison table */}
      <div>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-gray-700">全部交易对（按交易量排序）</h2>
        </div>
        {isLoading && priceComparisons.length === 0 ? (
          <div className="card text-center py-8">
            <div className="text-gray-500">正在连接实时价格流...</div>
          </div>
        ) : (
          <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">交易对</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Hyperliquid</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">币安</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">价差 (USD)</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">价差 (%)</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">套利机会</th>
              </tr>
            </thead>
            <tbody>
              {sortedComparisons.map((comparison) => {
                const hasBothPrices = comparison.hyperliquidPrice > 0 && comparison.binancePrice > 0;
                const isHyperHigher = comparison.hyperliquidPrice > comparison.binancePrice;
                const arbOpportunity = Math.abs(comparison.priceDiffPercent) > 0.1; // > 0.1% diff

                return (
                  <tr
                    key={comparison.symbol}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{comparison.symbol}</div>
                    </td>
                    <td className="text-right py-3 px-4">
                      {comparison.hyperliquidPrice > 0 ? (
                        <div className="font-mono">
                          ${formatNumber(comparison.hyperliquidPrice, 2)}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-right py-3 px-4">
                      {comparison.binancePrice > 0 ? (
                        <div className="font-mono">
                          ${formatNumber(comparison.binancePrice, 2)}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-right py-3 px-4">
                      {hasBothPrices ? (
                        <div className={`font-mono ${getPriceDiffColor(comparison.priceDiffPercent)}`}>
                          {comparison.priceDiff >= 0 ? '+' : ''}${formatNumber(Math.abs(comparison.priceDiff), 2)}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-right py-3 px-4">
                      {hasBothPrices ? (
                        <div className={`font-semibold ${getPriceDiffColor(comparison.priceDiffPercent)}`}>
                          {formatPriceDiff(comparison.priceDiffPercent)}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-right py-3 px-4">
                      {hasBothPrices && arbOpportunity ? (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                          {isHyperHigher ? (
                            <>
                              <ArrowDownIcon className="w-3 h-3" />
                              币安买入
                            </>
                          ) : (
                            <>
                              <ArrowUpIcon className="w-3 h-3" />
                              Hyper买入
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}

        {priceComparisons.length === 0 && !isLoading && (
          <div className="card text-center py-8">
            <div className="text-gray-500">暂无可用数据</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceComparison;

