import React, { useState, useEffect, useCallback } from 'react';
import { hyperApi } from '../services/hyperApi';
import type { 
  Symbol as SymbolType, 
  TradingOrder, 
  EstimatedFee, 
  Position, 
  FundingInfo,
  MarketInfo,
  UserAssets 
} from '../types/trading';
import { 
  ArrowUpIcon, 
  ArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

const Trading: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(''); // API Wallet Address for trading
  const [accountAddress, setAccountAddress] = useState<string>(''); // Main account address for info queries
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [symbols, setSymbols] = useState<SymbolType[]>([]);
  const [side, setSide] = useState<'Buy' | 'Sell'>('Buy');
  const [size, setSize] = useState<string>('');
  const [orderType, setOrderType] = useState<'Market' | 'Limit'>('Market');
  const [estimatedFee, setEstimatedFee] = useState<EstimatedFee | null>(null);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [fundingInfo, setFundingInfo] = useState<FundingInfo | null>(null);
  const [marketInfo, setMarketInfo] = useState<MarketInfo | null>(null);
  const [userAssets, setUserAssets] = useState<UserAssets | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [lastTradeResult, setLastTradeResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const loadSymbols = useCallback(async () => {
    try {
      const syms = await hyperApi.getSymbols();
      if (syms.length === 0) {
        setError('无法加载交易对列表。请检查网络连接或稍后重试。');
        setSymbols([]);
      } else {
        setSymbols(syms);
        setError('');
        if (syms.length > 0 && !selectedSymbol) {
          setSelectedSymbol(syms[0].name);
        }
      }
    } catch (err) {
      setError('无法加载交易对列表。请检查网络连接或稍后重试。');
      setSymbols([]);
    }
  }, [selectedSymbol]);

  const loadMarketInfo = useCallback(async () => {
    try {
      const info = await hyperApi.getMarketInfo(selectedSymbol);
      setMarketInfo(info);
    } catch (err) {
      console.error('Error loading market info:', err);
    }
  }, [selectedSymbol]);

  const loadPosition = useCallback(async () => {
    try {
      if (!apiKey) return;
      const pos = await hyperApi.getPosition(selectedSymbol);
      setPosition(pos);
    } catch (err) {
      console.error('Error loading position:', err);
    }
  }, [apiKey, selectedSymbol]);

  const loadFundingInfo = useCallback(async () => {
    try {
      if (!apiKey) return;
      const info = await hyperApi.getFundingInfo(selectedSymbol);
      setFundingInfo(info);
    } catch (err) {
      console.error('Error loading funding info:', err);
    }
  }, [apiKey, selectedSymbol]);

  const loadUserAssets = useCallback(async () => {
    try {
      if (!apiKey) return;
      setIsLoadingAssets(true);
      const assets = await hyperApi.getUserAssets();
      setUserAssets(assets);
    } catch (err) {
      console.error('Error loading user assets:', err);
    } finally {
      setIsLoadingAssets(false);
    }
  }, [apiKey]);

  const calculateFee = useCallback(async () => {
    if (!selectedSymbol || !size || parseFloat(size) <= 0) {
      return;
    }

    setIsCalculatingFee(true);
    try {
      const fee = await hyperApi.calculateEstimatedFee(
        selectedSymbol,
        parseFloat(size),
        side,
        orderType
      );
      setEstimatedFee(fee);
    } catch (err: any) {
      setError('计算手续费失败: ' + (err.message || '未知错误'));
    } finally {
      setIsCalculatingFee(false);
    }
  }, [selectedSymbol, size, side, orderType]);

  // Load symbols on mount
  useEffect(() => {
    loadSymbols();
  }, [loadSymbols]);

  // Fetch market info and position when symbol or API key changes
  useEffect(() => {
    if (selectedSymbol) {
      loadMarketInfo();
      if (apiKey) {
        loadPosition();
        loadFundingInfo();
      }
    }
  }, [selectedSymbol, apiKey, loadMarketInfo, loadPosition, loadFundingInfo]);

  // Calculate fee when size, symbol, or side changes
  useEffect(() => {
    if (selectedSymbol && size && parseFloat(size) > 0) {
      calculateFee();
    } else {
      setEstimatedFee(null);
    }
  }, [selectedSymbol, size, side, orderType, calculateFee]);

  const handleApiKeySubmit = async () => {
    if (!apiKey.trim()) {
      setError('请输入 API Wallet 地址');
      return;
    }

    // Account address is required for info queries
    const addressToUse = accountAddress.trim() || apiKey.trim();

    try {
      hyperApi.setCredentials({ 
        apiKey: apiKey.trim(),
        accountAddress: addressToUse 
      });
      
      // Validate using account address (for info queries)
      const isValid = await hyperApi.validateApiKey();
      if (isValid) {
        setError('');
        setLastTradeResult('配置验证成功 - API Wallet 用于交易，主账户地址用于查询');
        // Load assets immediately after validation
        await loadUserAssets();
        if (selectedSymbol) {
          loadPosition();
          loadFundingInfo();
        }
      } else {
        setError('验证失败，请检查地址是否正确');
      }
    } catch (err: any) {
      setError('验证失败: ' + (err.message || '未知错误'));
    }
  };

  const handlePlaceOrder = async () => {
    if (!apiKey) {
      setError('请先输入API Key');
      return;
    }

    if (!selectedSymbol) {
      setError('请选择交易对');
      return;
    }

    if (!size || parseFloat(size) <= 0) {
      setError('请输入有效的仓位大小');
      return;
    }

    setIsPlacingOrder(true);
    setError('');
    setLastTradeResult('');

    try {
      const order: TradingOrder = {
        symbol: selectedSymbol,
        side,
        size: parseFloat(size),
        orderType,
      };

      const result = await hyperApi.placeOrder(order);

      if (result.status === 'success') {
        setLastTradeResult('交易成功！订单ID: ' + (result.orderId || 'N/A'));
        if (result.position) {
          setPosition(result.position);
        }
        if (result.fundingInfo) {
          setFundingInfo(result.fundingInfo);
        }
        // Reload position, funding info, and assets
        await loadPosition();
        await loadFundingInfo();
        await loadUserAssets();
        setError('');
      } else {
        setError(result.message || '交易失败');
      }
    } catch (err: any) {
      setError('交易失败: ' + (err.message || '未知错误'));
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toFixed(decimals);
  };

  const formatFundingRate = (rate: number) => {
    return (rate * 100).toFixed(4) + '%';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">交易</h1>
      </div>

      {/* API Key Input */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">API 配置</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Wallet Address（用于交易）
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="请输入 API Wallet 地址 (0x...)"
              className="input-field"
            />
            <p className="mt-1 text-xs text-gray-500">
              API Wallet 地址用于执行交易操作（如 app.hyperliquid.xyz）
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              主账户地址（用于查询资产、仓位等信息）
            </label>
            <input
              type="text"
              value={accountAddress}
              onChange={(e) => setAccountAddress(e.target.value)}
              placeholder="请输入主账户地址 (0x...) - 用于查询信息"
              className="input-field"
            />
            <p className="mt-1 text-xs text-gray-500">
              根据 Hyperliquid 说明：信息查询必须使用主账户地址，而不是 API Wallet 地址
            </p>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleApiKeySubmit}
              className="btn-primary"
            >
              保存并验证
            </button>
          </div>
        </div>
      </div>

      {/* User Assets Display */}
      {apiKey && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">账户资产</h2>
          {isLoadingAssets ? (
            <div className="text-center py-4 text-gray-500">加载中...</div>
          ) : userAssets ? (
            <div className="space-y-4">
              {userAssets.accountValue !== undefined && userAssets.accountValue > 0 && (
                <div className="pb-3 border-b border-gray-200">
                  <div className="text-sm text-gray-500">账户总值</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${formatNumber(userAssets.accountValue, 2)}
                  </div>
                </div>
              )}
              {userAssets.balances && userAssets.balances.length > 0 ? (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">资产列表 (Spot)</div>
                  <div className="space-y-2">
                    {userAssets.balances.map((asset) => {
                      const amount = parseFloat(asset.hold || '0');
                      const usdValue = asset.usdValue || 0;
                      return (
                        <div
                          key={asset.coin}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{asset.coin}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">
                              {amount.toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 8,
                              })}
                            </div>
                            <div className={`text-sm font-medium ${usdValue > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                              ${formatNumber(usdValue, 2)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  {apiKey ? (
                    <div>
                      <div>暂无资产余额</div>
                      <div className="text-xs mt-2 text-gray-400">
                        提示：请确保在主账户地址字段输入了正确的主账户地址（不是API Wallet地址）
                      </div>
                    </div>
                  ) : (
                    '请先输入API Key'
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              {apiKey ? '无法加载资产信息' : '请先输入API Key'}
            </div>
          )}
        </div>
      )}

      {/* Trading Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Trading Inputs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">下单</h2>
            
            {/* Symbol Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                交易对
              </label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="input-field"
              >
                <option value="">请选择交易对</option>
                {symbols.map((sym) => (
                  <option key={sym.name} value={sym.name}>
                    {sym.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Market Info Display */}
            {marketInfo && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">最新价:</span>
                    <span className="ml-2 font-semibold">${formatNumber(marketInfo.lastPrice)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">买价:</span>
                    <span className="ml-2 font-semibold text-green-600">${formatNumber(marketInfo.bidPrice)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">卖价:</span>
                    <span className="ml-2 font-semibold text-red-600">${formatNumber(marketInfo.askPrice)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Order Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                订单类型
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderType('Market')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    orderType === 'Market'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  市价单
                </button>
                <button
                  onClick={() => setOrderType('Limit')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    orderType === 'Limit'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  限价单
                </button>
              </div>
            </div>

            {/* Buy/Sell Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                方向
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSide('Buy')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    side === 'Buy'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <ArrowUpIcon className="w-5 h-5" />
                  买入/做多
                </button>
                <button
                  onClick={() => setSide('Sell')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    side === 'Sell'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <ArrowDownIcon className="w-5 h-5" />
                  卖出/做空
                </button>
              </div>
            </div>

            {/* Size Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                仓位大小
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="请输入仓位大小"
                className="input-field"
              />
            </div>

            {/* Estimated Fee */}
            {estimatedFee && !isCalculatingFee && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">预估手续费</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Maker费率:</span>
                    <span className="font-medium">${formatNumber(estimatedFee.makerFee, 4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taker费率:</span>
                    <span className="font-medium">${formatNumber(estimatedFee.takerFee, 4)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-200">
                    <span className="font-semibold text-gray-900">
                      {orderType === 'Limit' ? '预估费用(Maker):' : '预估费用(Taker):'}
                    </span>
                    <span className="font-bold text-blue-600">
                      ${formatNumber(estimatedFee.estimatedFee, 4)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {isCalculatingFee && (
              <div className="mb-4 text-center text-gray-500">
                计算手续费中...
              </div>
            )}

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <ExclamationTriangleIcon className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {lastTradeResult && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                <CheckCircleIcon className="w-5 h-5" />
                <span>{lastTradeResult}</span>
              </div>
            )}

            {/* Place Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder || !apiKey || !selectedSymbol || !size}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
                side === 'Buy'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } disabled:bg-gray-400 disabled:cursor-not-allowed`}
            >
              {isPlacingOrder ? '提交中...' : `${side === 'Buy' ? '买入' : '卖出'} ${selectedSymbol || ''}`}
            </button>
          </div>
        </div>

        {/* Right Column: Position & Funding Info */}
        <div className="space-y-6">
          {/* Current Position */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">当前仓位</h2>
            {apiKey ? (
              position ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-500">交易对</div>
                    <div className="font-semibold text-lg">{position.symbol}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">仓位大小</div>
                    <div className={`font-semibold text-lg ${
                      position.size > 0 ? 'text-green-600' : position.size < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {position.size > 0 ? '+' : ''}{formatNumber(position.size, 4)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-gray-500">开仓价</div>
                      <div className="font-medium">${formatNumber(position.entryPrice)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">标记价</div>
                      <div className="font-medium">${formatNumber(position.markPrice)}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">未实现盈亏</div>
                    <div className={`font-bold text-lg ${
                      position.unrealizedPnl > 0 ? 'text-green-600' : position.unrealizedPnl < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {position.unrealizedPnl > 0 ? '+' : ''}${formatNumber(position.unrealizedPnl, 2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">已实现盈亏</div>
                    <div className={`font-semibold ${
                      position.realizedPnl > 0 ? 'text-green-600' : position.realizedPnl < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {position.realizedPnl > 0 ? '+' : ''}${formatNumber(position.realizedPnl, 2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">名义价值</div>
                    <div className="font-medium">${formatNumber(position.notionalValue, 2)}</div>
                  </div>
                  {position.liquidationPrice && position.liquidationPrice > 0 && (
                    <div>
                      <div className="text-sm text-gray-500">强平价格</div>
                      <div className="font-medium text-orange-600">${formatNumber(position.liquidationPrice)}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-4">
                  暂无仓位或加载中...
                </div>
              )
            ) : (
              <div className="text-gray-500 text-center py-4">
                请先输入API Key以查看仓位
              </div>
            )}
          </div>

          {/* Funding Info */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">资金费率</h2>
            {fundingInfo ? (
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">当前资金费率</div>
                  <div className={`font-bold text-lg ${
                    fundingInfo.fundingRate > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatFundingRate(fundingInfo.fundingRate)}
                  </div>
                  {fundingInfo.fundingRate > 0 && (
                    <div className="text-xs text-gray-500 mt-1">做多需要支付，做空获得</div>
                  )}
                  {fundingInfo.fundingRate < 0 && (
                    <div className="text-xs text-gray-500 mt-1">做空需要支付，做多获得</div>
                  )}
                </div>
                {fundingInfo.nextFundingTime > 0 && (
                  <div>
                    <div className="text-sm text-gray-500">下次资金费率时间</div>
                    <div className="font-medium">
                      {new Date(fundingInfo.nextFundingTime).toLocaleString('zh-CN')}
                    </div>
                  </div>
                )}
                {apiKey && (
                  <div>
                    <div className="text-sm text-gray-500">累计资金费用</div>
                    <div className={`font-semibold ${
                      fundingInfo.paidFunding > 0 ? 'text-red-600' : fundingInfo.paidFunding < 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {fundingInfo.paidFunding > 0 ? '-' : ''}${formatNumber(Math.abs(fundingInfo.paidFunding), 4)}
                    </div>
                    {fundingInfo.paidFunding > 0 && <div className="text-xs text-gray-500 mt-1">已支付</div>}
                    {fundingInfo.paidFunding < 0 && <div className="text-xs text-gray-500 mt-1">已获得</div>}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">
                加载中...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Trading;

