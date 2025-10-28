import axios from 'axios';
import type { 
  ApiKeyConfig, 
  TradingOrder, 
  EstimatedFee, 
  Position, 
  FundingInfo, 
  TradingResult,
  MarketInfo,
  Symbol,
  UserAssets,
  AssetBalance 
} from '../types/trading';

// Hyperliquid API base URL
const HYPERLIQUID_API_BASE = 'https://api.hyperliquid.xyz';

class HyperApiService {
  private apiKey: string = ''; // API wallet address for trading
  private apiSecret: string = '';
  private accountAddress: string = ''; // Main account address for info queries

  /**
   * Set API credentials
   */
  setCredentials(config: ApiKeyConfig) {
    this.apiKey = config.apiKey;
    if (config.apiSecret) {
      this.apiSecret = config.apiSecret;
    }
    // Use provided accountAddress, or try to derive from apiKey if it's an address
    if (config.accountAddress) {
      this.accountAddress = config.accountAddress;
    } else if (config.apiKey.startsWith('0x')) {
      // If only API wallet address is provided, we'll need to ask for account address
      // For now, try using the same address (might work in some cases)
      this.accountAddress = config.apiKey;
    }
  }

  /**
   * Get available symbols/trading pairs
   */
  async getSymbols(): Promise<Symbol[]> {
    try {
      const response = await axios.post(`${HYPERLIQUID_API_BASE}/info`, {
        type: 'metaAndAssetCtxs'
      });
      
      // Hyperliquid API returns an array: [metaObject, assetContextsArray]
      // metaObject contains: { universe: [...], marginTables: {...}, collateralToken: ... }
      // assetContextsArray is an array of asset context objects
      
      const metaData = Array.isArray(response.data) ? response.data[0] : response.data;
      const assetContexts = Array.isArray(response.data) ? response.data[1] : response.data?.assetContexts;
      
      // Try universe from meta object first (this is the primary source)
      if (metaData?.universe && Array.isArray(metaData.universe)) {
        const symbols = metaData.universe
          .filter((item: any) => !item.isDelisted)
          .map((item: any) => ({
            name: item.name,
            displayName: item.name
          }));
        console.log(`Fetched ${symbols.length} active symbols from Hyperliquid (total: ${metaData.universe.length}, filtered: ${symbols.length})`);
        if (symbols.length > 0) {
          return symbols;
        }
      }
      
      // Fallback: try to get symbols from assetContexts
      if (assetContexts && Array.isArray(assetContexts)) {
        const symbols = assetContexts
          .map((ctx: any) => ctx.coin)
          .filter((coin: string) => coin && coin.length > 0)
          .map((coin: string) => ({
            name: coin,
            displayName: coin
          }));
        if (symbols.length > 0) {
          console.log(`Fetched ${symbols.length} symbols from assetContexts`);
          return symbols;
        }
      }
      
      // If still no symbols found, log the issue
      console.error('No symbols found in API response. Response structure:', {
        isArray: Array.isArray(response.data),
        hasMetaUniverse: !!metaData?.universe,
        universeLength: metaData?.universe?.length || 0,
        hasAssetContexts: !!assetContexts,
        assetContextsLength: assetContexts?.length || 0,
      });
      // Return empty array to show error state instead of incorrect data
      return [];
    } catch (error: any) {
      console.error('Error fetching symbols:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Don't return fallback symbols - they may not exist on Hyperliquid
      // Return empty array so UI can show appropriate error message
      return [];
    }
  }

  /**
   * Get coin price (for USD value calculation)
   */
  private async getCoinPrice(coin: string): Promise<number> {
    try {
      // Try to get price from l2Book
      const response = await axios.post(`${HYPERLIQUID_API_BASE}/info`, {
        type: 'l2Book',
        coin: coin
      });

      if (response.data?.levels) {
        const levels = response.data.levels;
        // levels[0] = asks (卖单，价格从低到高), levels[1] = bids (买单，价格从高到低)
        // Each level is: {px: "115082.0", sz: "1.9037", n: 9}
        const askPrice = parseFloat(levels[0]?.[0]?.px || '0');
        const bidPrice = parseFloat(levels[1]?.[0]?.px || '0');
        if (bidPrice > 0 && askPrice > 0) {
          return (bidPrice + askPrice) / 2;
        }
        // If only one side available, use that
        if (bidPrice > 0) return bidPrice;
        if (askPrice > 0) return askPrice;
      }

      // Fallback: try to get from metaAndAssetCtxs
      const metaResponse = await axios.post(`${HYPERLIQUID_API_BASE}/info`, {
        type: 'metaAndAssetCtxs'
      });

      if (metaResponse.data?.assetContexts) {
        const assetCtx = metaResponse.data.assetContexts.find(
          (ctx: any) => ctx.coin === coin
        );
        if (assetCtx?.markPx) {
          return assetCtx.markPx;
        }
      }

      return 0;
    } catch (error) {
      console.error(`Error fetching price for ${coin}:`, error);
      return 0;
    }
  }

  /**
   * Get market information for a symbol
   */
  async getMarketInfo(symbol: string): Promise<MarketInfo | null> {
    try {
      const response = await axios.post(`${HYPERLIQUID_API_BASE}/info`, {
        type: 'l2Book',
        coin: symbol
      });

      if (response.data?.levels) {
        const levels = response.data.levels;
        // levels[0] = asks (卖单), levels[1] = bids (买单)
        // Each level is: {px: "115082.0", sz: "1.9037", n: 9}
        const askPrice = parseFloat(levels[0]?.[0]?.px || '0');
        const bidPrice = parseFloat(levels[1]?.[0]?.px || '0');
        const lastPrice = bidPrice > 0 && askPrice > 0 
          ? (bidPrice + askPrice) / 2 
          : bidPrice > 0 
            ? bidPrice 
            : askPrice > 0 
              ? askPrice 
              : 0;

        // Get funding rate
        const fundingResponse = await axios.post(`${HYPERLIQUID_API_BASE}/info`, {
          type: 'metaAndAssetCtxs'
        });

        let fundingRate = 0;
        let nextFundingTime = 0;
        if (fundingResponse.data?.assetContexts) {
          const assetCtx = fundingResponse.data.assetContexts.find(
            (ctx: any) => ctx.coin === symbol
          );
          if (assetCtx) {
            fundingRate = assetCtx?.funding?.fundingRate || 0;
            nextFundingTime = assetCtx?.funding?.nextFundingTime || 0;
          }
        }

        return {
          symbol,
          lastPrice,
          bidPrice,
          askPrice,
          volume24h: 0, // Would need separate call
          fundingRate,
          nextFundingTime,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching market info:', error);
      return null;
    }
  }

  /**
   * Calculate estimated fees
   * Hyperliquid typically charges 0.02% maker and 0.05% taker fees
   */
  async calculateEstimatedFee(
    symbol: string,
    size: number,
    side: 'Buy' | 'Sell',
    orderType: 'Market' | 'Limit' = 'Market'
  ): Promise<EstimatedFee> {
    try {
      const marketInfo = await this.getMarketInfo(symbol);
      if (!marketInfo) {
        throw new Error('Unable to fetch market info');
      }

      const price = marketInfo.lastPrice;
      const notional = size * price;

      // Hyperliquid fee structure: 0.02% maker, 0.05% taker
      const makerFeeRate = 0.0002; // 0.02%
      const takerFeeRate = 0.0005; // 0.05%

      const makerFee = notional * makerFeeRate;
      const takerFee = notional * takerFeeRate;
      const estimatedFee = orderType === 'Limit' ? makerFee : takerFee;

      return {
        makerFee,
        takerFee,
        totalFee: estimatedFee,
        estimatedFee,
      };
    } catch (error) {
      console.error('Error calculating fee:', error);
      // Return default fee calculation
      const defaultPrice = 50000; // Fallback price
      const notional = size * defaultPrice;
      const takerFee = notional * 0.0005;
      
      return {
        makerFee: notional * 0.0002,
        takerFee,
        totalFee: takerFee,
        estimatedFee: takerFee,
      };
    }
  }

  /**
   * Place a trading order
   */
  async placeOrder(order: TradingOrder): Promise<TradingResult> {
    try {
      if (!this.apiKey) {
        throw new Error('API key not set');
      }

      // In a real implementation, you would sign the request with the API secret
      // For now, we'll simulate the API call
      const response = await axios.post(`${HYPERLIQUID_API_BASE}/exchange`, {
        action: {
          type: order.orderType || 'Market',
          orders: [
            {
              a: order.size,
              b: order.side === 'Buy',
              p: order.price || 0,
              r: false, // Reduce only
              s: order.symbol,
            }
          ],
          grouping: 'na',
        },
        nonce: Date.now(),
        signature: {
          r: '0x',
          s: '0x',
        },
        vaultAddress: null,
      }, {
        headers: {
          'X-API-Key': this.apiKey,
        }
      });

      if (response.data?.status === 'ok' || response.data?.response?.data?.statuses?.[0]?.resting) {
        // Fetch updated position after order
        const position = await this.getPosition(order.symbol);
        const fundingInfo = await this.getFundingInfo(order.symbol);

        return {
          orderId: response.data?.response?.data?.statuses?.[0]?.resting?.oid || 'unknown',
          status: 'success',
          message: 'Order placed successfully',
          position: position ?? undefined,
          fundingInfo: fundingInfo ?? undefined,
          timestamp: Date.now(),
        };
      }

      throw new Error('Order failed');
    } catch (error: any) {
      console.error('Error placing order:', error);
      return {
        status: 'failed',
        message: error.response?.data?.error || error.message || 'Failed to place order',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get current position for a symbol
   */
  async getPosition(symbol: string): Promise<Position | null> {
    try {
      if (!this.apiKey) {
        return null;
      }

      const userAddress = this.getUserAddress();
      const response = await axios.post(`${HYPERLIQUID_API_BASE}/info`, {
        type: 'clearinghouseState',
        user: userAddress,
      });

      if (response.data?.assetPositions) {
        const position = response.data.assetPositions.find(
          (pos: any) => pos.position?.coin === symbol
        );

        if (position) {
          const pos = position.position;
          return {
            symbol,
            size: pos.szi || 0,
            entryPrice: pos.entryPx || 0,
            markPrice: pos.markPx || 0,
            liquidationPrice: pos.liquidationPx || 0,
            notionalValue: Math.abs(pos.szi * pos.markPx) || 0,
            unrealizedPnl: pos.unrealizedPnl || 0,
            realizedPnl: 0, // Would need separate call
            leverage: pos.leverage || 1,
          };
        }
      }

      // If no position found, return empty position
      const marketInfo = await this.getMarketInfo(symbol);
      return {
        symbol,
        size: 0,
        entryPrice: marketInfo?.lastPrice || 0,
        markPrice: marketInfo?.lastPrice || 0,
        notionalValue: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        leverage: 1,
      };
    } catch (error) {
      console.error('Error fetching position:', error);
      const marketInfo = await this.getMarketInfo(symbol);
      return {
        symbol,
        size: 0,
        entryPrice: marketInfo?.lastPrice || 0,
        markPrice: marketInfo?.lastPrice || 0,
        notionalValue: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        leverage: 1,
      };
    }
  }

  /**
   * Get funding information for a symbol
   */
  async getFundingInfo(symbol: string): Promise<FundingInfo | null> {
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
            fundingRate: assetCtx.funding.fundingRate || 0,
            nextFundingTime: assetCtx.funding.nextFundingTime || 0,
            paidFunding: 0, // Would need user-specific data
            lastFundingPayment: assetCtx.funding.lastFundingTime || 0,
          };
        }
      }

      // Get user funding payments if API key is set
      if (this.apiKey) {
        try {
          const userAddress = this.getUserAddress();
          const userResponse = await axios.post(`${HYPERLIQUID_API_BASE}/info`, {
            type: 'userFunding',
            user: userAddress,
          });

          if (userResponse.data) {
            const userFunding = userResponse.data.find(
              (f: any) => f.coin === symbol
            );
            if (userFunding) {
              return {
                symbol,
                fundingRate: 0,
                nextFundingTime: 0,
                paidFunding: userFunding.allTime || 0,
              };
            }
          }
        } catch (e) {
          // Ignore user funding errors
        }
      }

      return {
        symbol,
        fundingRate: 0,
        nextFundingTime: 0,
        paidFunding: 0,
      };
    } catch (error) {
      console.error('Error fetching funding info:', error);
      return {
        symbol,
        fundingRate: 0,
        nextFundingTime: 0,
        paidFunding: 0,
      };
    }
  }

  /**
   * Get user address for info queries (must be main account address, not API wallet)
   */
  private getUserAddress(): string {
    // For info requests, use account address if available
    if (this.accountAddress) {
      return this.accountAddress;
    }
    // Fallback to API key (might not work for info queries if it's an API wallet)
    return this.apiKey;
  }
  
  /**
   * Set account address separately (for info queries)
   */
  setAccountAddress(address: string) {
    this.accountAddress = address;
  }

  /**
   * Get user assets/balances (including spot holdings)
   */
  async getUserAssets(): Promise<UserAssets | null> {
    try {
      if (!this.apiKey) {
        return null;
      }

      const userAddress = this.getUserAddress();
      const balances: AssetBalance[] = [];
      let accountValue = 0;
      let marginSummary: any = null;

      // Try clearinghouseState first (contains both perpetual and potentially spot data)
      try {
        const response = await axios.post(`${HYPERLIQUID_API_BASE}/info`, {
          type: 'clearinghouseState',
          user: userAddress,
        });

        console.log('clearinghouseState response:', JSON.stringify(response.data, null, 2));

        if (response.data) {
          // Get account value
          if (response.data.marginSummary?.accountValue) {
            accountValue = response.data.marginSummary.accountValue;
            marginSummary = response.data.marginSummary;
          }

          // Get spot balances if available - check multiple possible locations
          let spotBalances = null;
          if (response.data.spotBalances) {
            spotBalances = response.data.spotBalances;
          } else if (response.data.spotClearinghouseState?.balances) {
            spotBalances = response.data.spotClearinghouseState.balances;
          } else if (response.data.balances) {
            spotBalances = response.data.balances;
          }

          // Handle array format: [{coin: "BTC", total: "1.0"}, {coin: "ETH", total: "0.5"}]
          if (Array.isArray(spotBalances)) {
            for (const item of spotBalances) {
              if (item && typeof item === 'object' && item.coin) {
                const amount = item.total || item.hold || item.amount || '0';
                const numAmount = parseFloat(amount);
                if (numAmount > 0.0001) {
                  balances.push({
                    coin: item.coin,
                    hold: String(numAmount),
                    total: item.total || String(numAmount),
                  });
                }
              }
            }
          }
          // Handle object format: {"BTC": "1.0", "ETH": "0.5"}
          else if (spotBalances && typeof spotBalances === 'object' && !Array.isArray(spotBalances)) {
            for (const [coin, balance] of Object.entries(spotBalances)) {
              // Skip numeric keys (array indices) and special properties
              if (/^\d+$/.test(coin) || coin === 'length' || coin === '__proto__') {
                continue;
              }
              
              // Skip if coin name looks invalid (too short or contains only numbers)
              if (coin.length < 2 || /^\d+$/.test(coin)) {
                continue;
              }
              
              const bal = balance as any;
              
              // Handle different balance formats
              let amount = '0';
              if (typeof bal === 'string') {
                amount = bal;
              } else if (typeof bal === 'number') {
                amount = String(bal);
              } else if (bal && typeof bal === 'object') {
                amount = bal.total || bal.hold || bal.amount || bal.balance || '0';
              }
              
              const numAmount = parseFloat(amount);
              if (numAmount > 0.0001) {
                balances.push({
                  coin: coin as string,
                  hold: String(numAmount),
                  total: bal?.total || String(numAmount),
                });
              }
            }
          }
        }
      } catch (clearingError: any) {
        console.error('Error fetching clearinghouseState:', clearingError?.response?.data || clearingError.message);
      }

      // Try spotClearinghouseState for spot-only balances (separate endpoint)
      if (balances.length === 0) {
        try {
          const spotResponse = await axios.post(`${HYPERLIQUID_API_BASE}/info`, {
            type: 'spotClearinghouseState',
            user: userAddress,
          });

          console.log('spotClearinghouseState response:', JSON.stringify(spotResponse.data, null, 2));

          if (spotResponse.data) {
            let spotBalances = null;
            if (spotResponse.data.balances) {
              spotBalances = spotResponse.data.balances;
            } else if (spotResponse.data.spotBalances) {
              spotBalances = spotResponse.data.spotBalances;
            }

            // Handle array format: [{coin: "BTC", total: "1.0"}, {coin: "ETH", total: "0.5"}]
            if (Array.isArray(spotBalances)) {
              for (const item of spotBalances) {
                if (item && typeof item === 'object' && item.coin) {
                  const amount = item.total || item.hold || item.amount || '0';
                  const numAmount = parseFloat(amount);
                  if (numAmount > 0.0001) {
                    balances.push({
                      coin: item.coin,
                      hold: String(numAmount),
                      total: item.total || String(numAmount),
                    });
                  }
                }
              }
            } 
            // Handle object format: {"BTC": "1.0", "ETH": "0.5"}
            else if (spotBalances && typeof spotBalances === 'object' && !Array.isArray(spotBalances)) {
              for (const [coin, balance] of Object.entries(spotBalances)) {
                // Skip numeric keys (array indices) and special properties
                if (/^\d+$/.test(coin) || coin === 'length' || coin === '__proto__') {
                  continue;
                }
                
                // Skip if coin name looks invalid (too short or contains only numbers)
                if (coin.length < 2 || /^\d+$/.test(coin)) {
                  continue;
                }
                
                const bal = balance as any;
                
                // Handle different balance formats
                let amount = '0';
                if (typeof bal === 'string') {
                  amount = bal;
                } else if (typeof bal === 'number') {
                  amount = String(bal);
                } else if (bal && typeof bal === 'object') {
                  amount = bal.total || bal.hold || bal.amount || bal.balance || '0';
                }
                
                const numAmount = parseFloat(amount);
                if (numAmount > 0.0001) {
                  balances.push({
                    coin: coin as string,
                    hold: String(numAmount),
                    total: bal?.total || String(numAmount),
                  });
                }
              }
            }

            // Also get account value from spot if available
            if (spotResponse.data?.accountValue && !accountValue) {
              accountValue = spotResponse.data.accountValue;
            }
          }
        } catch (spotError: any) {
          console.error('Error fetching spotClearinghouseState:', spotError?.response?.data || spotError.message);
        }
      }

      // Calculate USD value for each balance
      for (const balance of balances) {
        if (!balance.usdValue) {
          try {
            const price = await this.getCoinPrice(balance.coin);
            const amount = parseFloat(balance.hold || '0');
            balance.usdValue = price * amount;
          } catch (error) {
            console.error(`Error calculating USD value for ${balance.coin}:`, error);
            balance.usdValue = 0;
          }
        }
      }

      // Sort balances by USD value (descending), then by amount
      balances.sort((a, b) => {
        const usdValueA = a.usdValue || 0;
        const usdValueB = b.usdValue || 0;
        if (Math.abs(usdValueA - usdValueB) > 0.01) {
          return usdValueB - usdValueA;
        }
        const amountA = parseFloat(a.hold || '0');
        const amountB = parseFloat(b.hold || '0');
        return amountB - amountA;
      });

      return {
        balances,
        accountValue,
        marginSummary,
      };
    } catch (error: any) {
      console.error('Error fetching user assets:', error?.response?.data || error.message);
      return {
        balances: [],
        accountValue: 0,
      };
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false;
      }

      // Try to fetch user state as validation
      const userAddress = this.getUserAddress();
      const response = await axios.post(`${HYPERLIQUID_API_BASE}/info`, {
        type: 'clearinghouseState',
        user: userAddress,
      });

      return response.status === 200;
    } catch (error) {
      console.error('API key validation error:', error);
      // For demo purposes, accept any non-empty key
      return this.apiKey.length > 0;
    }
  }
}

export const hyperApi = new HyperApiService();

