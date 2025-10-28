// Trading related types
export interface ApiKeyConfig {
  apiKey: string; // API wallet address for trading
  apiSecret?: string;
  accountAddress?: string; // Main account address for info queries
}

export interface Symbol {
  name: string;
  displayName: string;
}

export interface TradingOrder {
  symbol: string;
  side: 'Buy' | 'Sell';
  size: number; // Position size
  leverage?: number;
  orderType?: 'Market' | 'Limit';
  price?: number; // For limit orders
}

export interface EstimatedFee {
  makerFee: number;
  takerFee: number;
  totalFee: number;
  estimatedFee: number; // Based on order type
}

export interface Position {
  symbol: string;
  size: number; // Current position size
  entryPrice: number;
  markPrice: number;
  liquidationPrice?: number;
  notionalValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  leverage: number;
}

export interface FundingInfo {
  symbol: string;
  fundingRate: number; // Current funding rate (e.g., 0.0001 = 0.01%)
  nextFundingTime: number; // Timestamp
  paidFunding: number; // Total funding paid/received
  lastFundingPayment?: number;
}

export interface TradingResult {
  orderId?: string;
  status: 'success' | 'failed' | 'pending';
  message?: string;
  position?: Position;
  fundingInfo?: FundingInfo;
  timestamp: number;
}

export interface MarketInfo {
  symbol: string;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  volume24h: number;
  fundingRate: number;
  nextFundingTime: number;
}

export interface AssetBalance {
  coin: string;
  hold: string; // Holdings amount
  pendingWithdraw?: string;
  total?: string; // Total balance
  usdValue?: number; // USD value
}

export interface UserAssets {
  balances: AssetBalance[];
  accountValue?: number; // Total account value in USD
  marginSummary?: {
    accountValue: number;
    totalMarginUsed: number;
    totalNtlPos: number;
    totalRawUsd: number;
  };
}

