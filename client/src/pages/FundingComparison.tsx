import React, { useState, useEffect, useCallback } from 'react';
import { hyperApi } from '../services/hyperApi';
import { fundingService } from '../services/fundingService';
import type { SymbolFundingComparison, PositionEstimate } from '../types/funding';

const FundingComparison: React.FC = () => {
  const [fundingComparisons, setFundingComparisons] = useState<SymbolFundingComparison[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [positionInputs, setPositionInputs] = useState<Record<string, number>>({});
  const [positionEstimates, setPositionEstimates] = useState<Record<string, PositionEstimate>>({});
  const [isCalculating, setIsCalculating] = useState<Record<string, boolean>>({});
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  // Refresh only prices (faster update)
  const refreshPrices = useCallback(async () => {
    if (fundingComparisons.length === 0) return;
    
    try {
      const updatedComparisons = await Promise.all(
        fundingComparisons.map(async (comparison) => {
          const price = await fundingService.getSymbolPrice(comparison.symbol);
          return {
            ...comparison,
            price: price > 0 ? price : comparison.price,
            priceUpdateTime: Date.now(),
          };
        })
      );
      setFundingComparisons(updatedComparisons);
      setLastUpdateTime(Date.now());
    } catch (error) {
      console.error('Error refreshing prices:', error);
    }
  }, [fundingComparisons]);

  // Load symbols and funding rates
  useEffect(() => {
    loadData();
  }, []);

  // Set up price refresh interval
  useEffect(() => {
    if (fundingComparisons.length === 0) return;
    
    // Refresh prices every 3 seconds
    const priceInterval = setInterval(() => {
      refreshPrices();
    }, 3000);
    
    // Refresh full data every 30 seconds
    const fullInterval = setInterval(loadData, 30000);
    
    return () => {
      clearInterval(priceInterval);
      clearInterval(fullInterval);
    };
  }, [fundingComparisons.length, refreshPrices]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const syms = await hyperApi.getSymbols();
      
      const symbolNames = syms.map(s => s.name);
      const comparisons = await fundingService.getFundingRateComparisons(symbolNames);
      setFundingComparisons(comparisons);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePositionInputChange = async (symbol: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setPositionInputs(prev => ({ ...prev, [symbol]: numValue }));

    if (numValue > 0) {
      setIsCalculating(prev => ({ ...prev, [symbol]: true }));
      try {
        const estimate = await fundingService.calculatePositionEstimate(symbol, numValue);
        if (estimate) {
          setPositionEstimates(prev => ({ ...prev, [symbol]: estimate }));
        }
      } catch (error) {
        console.error(`Error calculating estimate for ${symbol}:`, error);
      } finally {
        setIsCalculating(prev => ({ ...prev, [symbol]: false }));
      }
    } else {
      setPositionEstimates(prev => {
        const updated = { ...prev };
        delete updated[symbol];
        return updated;
      });
    }
  };

  const formatFundingRate = (rate: number) => {
    return (rate * 100).toFixed(4) + '%';
  };

  const formatTimeToFunding = (ms: number) => {
    if (ms <= 0) return '已结算';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toFixed(decimals);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">资金费率对比</h1>
          {lastUpdateTime > 0 && (
            <div className="text-sm text-gray-500 mt-1">
              价格更新: {new Date(lastUpdateTime).toLocaleTimeString('zh-CN')}
            </div>
          )}
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? '加载中...' : '刷新全部'}
        </button>
      </div>

      {isLoading && fundingComparisons.length === 0 ? (
        <div className="card text-center py-8">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : (
        <div className="space-y-3">
          {fundingComparisons.map((comparison) => {
            const estimate = positionEstimates[comparison.symbol];
            const positionSize = positionInputs[comparison.symbol] || 0;
            const isCalc = isCalculating[comparison.symbol];

            return (
              <div key={comparison.symbol} className="card hover:shadow-md transition-shadow">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  {/* Symbol and Basic Info */}
                  <div className="md:col-span-1">
                    <div className="font-bold text-lg mb-1">{comparison.symbol}</div>
                    {comparison.price && (
                      <div className="text-sm font-semibold text-gray-700">
                        ${formatNumber(comparison.price, 2)}
                      </div>
                    )}
                    {comparison.timeToFunding > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        结算: {formatTimeToFunding(comparison.timeToFunding)}
                      </div>
                    )}
                  </div>

                  {/* Hyperliquid Funding */}
                  <div className="md:col-span-2">
                    <div className="text-xs font-medium text-gray-600 mb-1">Hyperliquid</div>
                    {comparison.hyperliquid ? (
                      <div>
                        <div className={`font-bold text-base ${
                          comparison.hyperliquid.fundingRate > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatFundingRate(comparison.hyperliquid.fundingRate)}
                        </div>
                        {comparison.hyperliquid.nextFundingTime > 0 && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {new Date(comparison.hyperliquid.nextFundingTime).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">N/A</div>
                    )}
                  </div>

                  {/* Binance Funding */}
                  <div className="md:col-span-2">
                    <div className="text-xs font-medium text-gray-600 mb-1">币安</div>
                    {comparison.binance ? (
                      <div>
                        <div className={`font-bold text-base ${
                          comparison.binance.fundingRate > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatFundingRate(comparison.binance.fundingRate)}
                        </div>
                        {comparison.binance.nextFundingTime > 0 && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {new Date(comparison.binance.nextFundingTime).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">N/A</div>
                    )}
                  </div>

                  {/* Rate Difference */}
                  <div className="md:col-span-1">
                    <div className="text-xs font-medium text-gray-600 mb-1">费率差</div>
                    <div className={`font-semibold text-sm ${
                      comparison.rateDiff > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {comparison.rateDiff > 0 ? '+' : ''}
                      {formatFundingRate(comparison.rateDiff)}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {comparison.rateDiff > 0 ? 'Hyper更高' : 'BN更高'}
                    </div>
                  </div>

                  {/* Position Input */}
                  <div className="md:col-span-2">
                    <div className="text-xs font-medium text-gray-600 mb-1">仓位大小</div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={positionSize || ''}
                      onChange={(e) => handlePositionInputChange(comparison.symbol, e.target.value)}
                      placeholder="输入仓位"
                      className="input-field text-sm w-full"
                    />
                  </div>

                  {/* Estimates */}
                  <div className="md:col-span-4">
                    {isCalc ? (
                      <div className="text-xs text-gray-500">计算中...</div>
                    ) : estimate ? (
                      <div className="bg-gray-50 p-2 rounded space-y-1">
                        <div className="text-xs font-semibold text-gray-700 mb-1">预估费用</div>
                        <div className="text-xs space-y-0.5">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Maker:</span>
                            <span className="font-medium">${formatNumber(estimate.estimatedFee.maker, 4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Taker:</span>
                            <span className="font-medium">${formatNumber(estimate.estimatedFee.taker, 4)}</span>
                          </div>
                        </div>
                        <div className="border-t border-gray-200 pt-1 mt-1">
                          <div className="text-xs font-semibold text-gray-700 mb-1">8小时资金费</div>
                          <div className="text-xs space-y-0.5">
                            <div className={`flex justify-between ${
                              estimate.fundingFeeEstimate.hyperliquid > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              <span>Hyper:</span>
                              <span className="font-medium">
                                {estimate.fundingFeeEstimate.hyperliquid > 0 ? '+' : ''}
                                ${formatNumber(estimate.fundingFeeEstimate.hyperliquid, 4)}
                              </span>
                            </div>
                            <div className={`flex justify-between ${
                              estimate.fundingFeeEstimate.binance > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              <span>BN:</span>
                              <span className="font-medium">
                                {estimate.fundingFeeEstimate.binance > 0 ? '+' : ''}
                                ${formatNumber(estimate.fundingFeeEstimate.binance, 4)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="border-t border-gray-200 pt-1 mt-1">
                          <div className="text-xs font-semibold text-gray-700 mb-1">日资金费 (3次)</div>
                          <div className="text-xs space-y-0.5">
                            <div className={`flex justify-between ${
                              estimate.fundingFeeEstimate.daily.hyperliquid > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              <span>Hyper:</span>
                              <span className="font-medium">
                                {estimate.fundingFeeEstimate.daily.hyperliquid > 0 ? '+' : ''}
                                ${formatNumber(estimate.fundingFeeEstimate.daily.hyperliquid, 2)}
                              </span>
                            </div>
                            <div className={`flex justify-between ${
                              estimate.fundingFeeEstimate.daily.binance > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              <span>BN:</span>
                              <span className="font-medium">
                                {estimate.fundingFeeEstimate.daily.binance > 0 ? '+' : ''}
                                ${formatNumber(estimate.fundingFeeEstimate.daily.binance, 2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : positionSize > 0 ? (
                      <div className="text-xs text-gray-400">计算中...</div>
                    ) : (
                      <div className="text-xs text-gray-400">输入仓位查看预估</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FundingComparison;

