import axios from 'axios';
import type { FundingRateInfo, SymbolFundingComparison, PositionEstimate } from '../types/funding';

const HYPERLIQUID_API_BASE = 'https://api.hyperliquid.xyz';
const BINANCE_API_BASE = 'https://fapi.binance.com';

class FundingService {
  /**
   * Get current price for a symbol (public method)
   */
  async getSymbolPrice(symbol: string): Promise<number> {
    return this._getSymbolPrice(symbol);
  }
  
  /**
   * Get current price for a symbol (private)
   */
  private async _getSymbolPrice(symbol: string): Promise<number> {
    try {
      const response = await axios.post(`${HYPERLIQUID_API_BASE}/info`, {
        type: 'l2Book',
        coin: symbol
      });

      if (response.data?.levels) {
        const levels = response.data.levels;
        const askPrice = parseFloat(levels[0]?.[0]?.px || '0');
        const bidPrice = parseFloat(levels[1]?.[0]?.px || '0');
        if (bidPrice > 0 && askPrice > 0) {
          return (bidPrice + askPrice) / 2;
        }
        if (bidPrice > 0) return bidPrice;
        if (askPrice > 0) return askPrice;
      }
      return 0;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return 0;
    }
  }

  /**
   * Get Hyperliquid funding rate for a symbol
   */
  async getHyperliquidFundingRate(symbol: string): Promise<FundingRateInfo | null> {
    try {
      const response = await axios.post(`${HYPERLIQUID_API_BASE}/info`, {
        type: 'metaAndAssetCtxs'
      });

      if (response.data?.assetContexts) {
        const assetCtx = response.data.assetContexts.find(
          (ctx: any) => ctx.coin === symbol
        );

        if (assetCtx?.funding) {
          return {
            symbol,
            exchange: 'hyperliquid',
            fundingRate: assetCtx.funding.fundingRate || 0,
            nextFundingTime: assetCtx.funding.nextFundingTime || 0,
          };
        }
      }

      return null;
    } catch (error) {
      console.error(`Error fetching Hyperliquid funding rate for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get Binance funding rate for a symbol
   */
  async getBinanceFundingRate(symbol: string): Promise<FundingRateInfo | null> {
    try {
      // Binance uses different symbol format (e.g., BTCUSDT instead of BTC)
      const binanceSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;
      
      const response = await axios.get(`${BINANCE_API_BASE}/fapi/v1/premiumIndex`, {
        params: { symbol: binanceSymbol }
      });

      if (response.data && !response.data.code) {
        const fundingRate = parseFloat(response.data.lastFundingRate || '0');
        // Binance next funding time is in milliseconds
        const nextFundingTime = response.data.nextFundingTime 
          ? parseInt(response.data.nextFundingTime) 
          : Date.now() + 8 * 60 * 60 * 1000; // Default to 8 hours from now

        return {
          symbol,
          exchange: 'binance',
          fundingRate,
          nextFundingTime,
        };
      }

      return null;
    } catch (error: any) {
      // Symbol might not exist on Binance - this is normal, just return null
      if (error.response?.status !== 400) {
        console.error(`Error fetching Binance funding rate for ${symbol}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Get funding rate comparison for all symbols
   */
  async getFundingRateComparisons(symbols: string[]): Promise<SymbolFundingComparison[]> {
    const comparisons: SymbolFundingComparison[] = [];

    // Fetch all data in parallel for better performance
    const symbolDataPromises = symbols.map(async (symbol) => {
      const [hyperliquid, binance, price] = await Promise.all([
        this.getHyperliquidFundingRate(symbol),
        this.getBinanceFundingRate(symbol),
        this._getSymbolPrice(symbol)
      ]);

      const rateDiff = (hyperliquid?.fundingRate || 0) - (binance?.fundingRate || 0);
      const nextFundingTime = hyperliquid?.nextFundingTime || binance?.nextFundingTime || 0;
      const timeToFunding = nextFundingTime > 0 ? nextFundingTime - Date.now() : 0;

      return {
        symbol,
        hyperliquid,
        binance,
        rateDiff,
        timeToFunding,
        price: price > 0 ? price : undefined,
        priceUpdateTime: Date.now(),
      };
    });

    return Promise.all(symbolDataPromises);
  }

  /**
   * Calculate position estimates (fee + funding cost/return)
   */
  async calculatePositionEstimate(
    symbol: string,
    size: number
  ): Promise<PositionEstimate | null> {
    try {
      // Get current price
      const priceResponse = await axios.post(`${HYPERLIQUID_API_BASE}/info`, {
        type: 'l2Book',
        coin: symbol
      });

      let price = 0;
      if (priceResponse.data?.levels) {
        const levels = priceResponse.data.levels;
        const askPrice = parseFloat(levels[0]?.[0]?.px || '0');
        const bidPrice = parseFloat(levels[1]?.[0]?.px || '0');
        price = bidPrice > 0 && askPrice > 0 
          ? (bidPrice + askPrice) / 2 
          : bidPrice > 0 ? bidPrice : askPrice;
      }

      if (price === 0) {
        return null;
      }

      const notional = size * price;

      // Calculate fees (0.02% maker, 0.05% taker)
      const makerFee = notional * 0.0002;
      const takerFee = notional * 0.0005;

      // Get funding rates
      const [hyperliquidFunding, binanceFunding] = await Promise.all([
        this.getHyperliquidFundingRate(symbol),
        this.getBinanceFundingRate(symbol)
      ]);

      // Funding fee is calculated per 8 hours (3 times per day)
      // Funding fee = notional value * funding rate
      const hyperliquidFunding8h = notional * (hyperliquidFunding?.fundingRate || 0);
      const binanceFunding8h = notional * (binanceFunding?.fundingRate || 0);

      // Daily funding (3 times per day)
      const hyperliquidDaily = hyperliquidFunding8h * 3;
      const binanceDaily = binanceFunding8h * 3;

      return {
        symbol,
        size,
        estimatedFee: {
          maker: makerFee,
          taker: takerFee,
        },
        fundingFeeEstimate: {
          hyperliquid: hyperliquidFunding8h,
          binance: binanceFunding8h,
          daily: {
            hyperliquid: hyperliquidDaily,
            binance: binanceDaily,
          },
        },
        price,
      };
    } catch (error) {
      console.error(`Error calculating position estimate for ${symbol}:`, error);
      return null;
    }
  }
}

export const fundingService = new FundingService();

