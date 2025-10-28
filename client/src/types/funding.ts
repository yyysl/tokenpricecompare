// Funding rate related types
export interface FundingRateInfo {
  symbol: string;
  exchange: 'hyperliquid' | 'binance';
  fundingRate: number; // Funding rate (e.g., 0.0001 = 0.01%)
  nextFundingTime: number; // Timestamp of next funding
  predictedFundingRate?: number; // Predicted next funding rate
}

export interface SymbolFundingComparison {
  symbol: string;
  hyperliquid: FundingRateInfo | null;
  binance: FundingRateInfo | null;
  rateDiff: number; // Difference in funding rates
  timeToFunding: number; // Milliseconds until next funding
  price?: number; // Current market price
  priceUpdateTime?: number; // Timestamp of last price update
}

export interface PositionEstimate {
  symbol: string;
  size: number;
  estimatedFee: {
    maker: number;
    taker: number;
  };
  fundingFeeEstimate: {
    hyperliquid: number; // Per 8 hours
    binance: number; // Per 8 hours
    daily: {
      hyperliquid: number;
      binance: number;
    };
  };
  price: number;
}

