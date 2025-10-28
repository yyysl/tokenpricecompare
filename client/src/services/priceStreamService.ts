import type { Symbol } from '../types/trading';

export interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
  exchange: 'hyperliquid' | 'binance';
}

export interface PriceComparison {
  symbol: string;
  hyperliquidPrice: number;
  binancePrice: number;
  priceDiff: number; // Absolute difference
  priceDiffPercent: number; // Percentage difference
  lastUpdate: number;
}

class PriceStreamService {
  private hyperliquidWs: WebSocket | null = null;
  private binanceWs: WebSocket | null = null;
  private binancePollInterval: NodeJS.Timeout | null = null;
  private prices: Map<string, PriceData> = new Map();
  private subscribers: Set<(comparisons: PriceComparison[]) => void> = new Set();
  private allSymbols: string[] = [];
  private commonSymbols: string[] = [];
  private binanceAvailableSymbols: Set<string> = new Set(); // Track which symbols are on Binance
  private isConnected = false;

  /**
   * Initialize WebSocket connections and get common symbols
   */
  async initialize(symbols: Symbol[]): Promise<string[]> {
    this.allSymbols = symbols.map(s => s.name);
    
    // Get common symbols (available on both exchanges)
    this.commonSymbols = await this.getCommonSymbols(symbols.map(s => s.name));
    
    if (this.commonSymbols.length > 0) {
      this.connectHyperliquid();
      this.connectBinance();
      this.isConnected = true;
    }
    
    return this.commonSymbols;
  }

  /**
   * Get symbols available on both exchanges
   * Using hardcoded list to avoid CORS issues with Binance API
   */
  private async getCommonSymbols(symbols: string[]): Promise<string[]> {
    console.log(`Hyperliquid symbols received: ${symbols.length}`, symbols.slice(0, 20));
    
    // Hardcoded list of major symbols available on both Binance and Hyperliquid
    // This avoids CORS issues when trying to fetch from Binance API directly
    const binanceSymbols = [
      'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'DOT', 'MATIC',
      'LTC', 'LINK', 'UNI', 'ATOM', 'ETC', 'ICP', 'APT', 'ARB', 'OP', 'SUI',
      'NEAR', 'FIL', 'IMX', 'HBAR', 'VET', 'TRX', 'AAVE', 'MKR', 'SNX', 'GRT',
      'INJ', 'RUNE', 'FTM', 'ALGO', 'EGLD', 'FLOW', 'XTZ', 'SAND', 'MANA', 'AXS',
      'THETA', 'EOS', 'KAVA', 'ZIL', 'CHZ', 'ENJ', 'BAT', 'ZRX', 'COMP', 'YFI',
      'CRV', 'SUSHI', '1INCH', 'LRC', 'DYDX', 'GMX', 'BLUR', 'PEPE', 'WLD', 'TIA',
      'SEI', 'ORDI', 'MEME', 'BONK', 'JTO', 'PYTH', 'STX', 'DYM', 'STRK', 'W',
      'ONDO', 'ENA', 'ETHFI', 'PIXEL', 'AEVO', 'PORTAL', 'NFP', 'AI', 'XAI', 'MANTA',
      'ALT', 'JUP', 'ACE', 'RONIN', 'LISTA', 'ZK', 'IO', 'NOT', 'TON', 'DOGS',
      'HMSTR', 'CATI', 'NEIRO', 'TURBO', 'GOAT', 'PNUT', 'ACT', 'MOVE', 'ME', 'USUAL',
      'PENGU', 'TRUMP', 'MELANIA', 'VINE', 'KOMA', 'GRIFFAIN', 'CGPT', 'FARTCOIN',
      // Add more as needed
    ];
    
    // Create a Set for faster lookup (case-insensitive)
    const binanceSet = new Set(binanceSymbols.map(s => s.toUpperCase()));
    
    // Store available Binance symbols for later use
    binanceSymbols.forEach(sym => {
      this.binanceAvailableSymbols.add(sym.toUpperCase());
    });
    
    console.log(`Binance symbols (hardcoded): ${binanceSymbols.length}`);

    // Find common symbols with case-insensitive matching
    const common: string[] = [];
    const hyperliquidSymbolSet = new Set<string>();
    
    symbols.forEach(sym => {
      const symUpper = sym.toUpperCase();
      if (binanceSet.has(symUpper)) {
        // Use the exact Hyperliquid symbol name for consistency
        if (!hyperliquidSymbolSet.has(sym)) {
          common.push(sym);
          hyperliquidSymbolSet.add(sym);
        }
      }
    });
    
    console.log(`Found ${common.length} common symbols:`, common.slice(0, 20));
    
    // If we have few common symbols, add more Hyperliquid-only symbols
    if (common.length < 30 && symbols.length > common.length) {
      const additionalSymbols = symbols
        .filter(sym => !common.includes(sym))
        .slice(0, 50 - common.length);
      const combined = [...common, ...additionalSymbols];
      console.log(`Combined ${common.length} common + ${additionalSymbols.length} additional = ${combined.length} total symbols`);
      return combined;
    }
    
    return common.length > 0 ? common : symbols.slice(0, 50);
  }

  /**
   * Connect to Hyperliquid WebSocket for real-time price updates
   * Falls back to polling if WebSocket fails
   */
  private connectHyperliquid() {
    try {
      const wsUrl = 'wss://api.hyperliquid.xyz/ws';
      
      if (this.hyperliquidWs) {
        this.hyperliquidWs.close();
      }
      
      this.hyperliquidWs = new WebSocket(wsUrl);
      let wsConnected = false;

      this.hyperliquidWs.onopen = () => {
        console.log(`Hyperliquid WebSocket connected, subscribing to ${this.commonSymbols.length} symbols`);
        wsConnected = true;
        
        // Subscribe to l2Book (order book) for all common symbols for more frequent updates
        this.commonSymbols.forEach((symbol) => {
          const subscribeMsg = {
            method: 'subscribe',
            subscription: {
              type: 'l2Book',
              coin: symbol
            }
          };
          
          if (this.hyperliquidWs?.readyState === WebSocket.OPEN) {
            this.hyperliquidWs.send(JSON.stringify(subscribeMsg));
          }
        });
        
        // Also subscribe to trades for price updates
        this.commonSymbols.forEach((symbol) => {
          const subscribeMsg = {
            method: 'subscribe',
            subscription: {
              type: 'trades',
              coin: symbol
            }
          };
          
          if (this.hyperliquidWs?.readyState === WebSocket.OPEN) {
            this.hyperliquidWs.send(JSON.stringify(subscribeMsg));
          }
        });
      };

      this.hyperliquidWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle trade data
          if (data.channel === 'trades' && data.data) {
            const trades = Array.isArray(data.data) ? data.data : [data.data];
            trades.forEach((trade: any) => {
              const symbol = trade.coin;
              const price = parseFloat(trade.price || trade.px || '0');
              
              if (price > 0 && this.commonSymbols.includes(symbol)) {
                this.prices.set(`${symbol}_hyperliquid`, {
                  symbol,
                  price,
                  timestamp: Date.now(),
                  exchange: 'hyperliquid'
                });
                this.notifySubscribers();
              }
            });
          }
          
          // Handle l2Book subscription for order book updates
          if (data.channel === 'l2Book' && data.data) {
            const symbol = data.data.coin;
            const levels = data.data.levels;
            
            if (levels && this.commonSymbols.includes(symbol)) {
              const asks = levels[0] || [];
              const bids = levels[1] || [];
              
              const bestAsk = asks.length > 0 ? parseFloat((asks[0]?.px || asks[0]?.[0]?.px || '0').toString()) : 0;
              const bestBid = bids.length > 0 ? parseFloat((bids[0]?.px || bids[0]?.[0]?.px || '0').toString()) : 0;
              
              let price = 0;
              if (bestBid > 0 && bestAsk > 0) {
                price = (bestBid + bestAsk) / 2;
              } else if (bestBid > 0) {
                price = bestBid;
              } else if (bestAsk > 0) {
                price = bestAsk;
              }
              
              if (price > 0) {
                this.prices.set(`${symbol}_hyperliquid`, {
                  symbol,
                  price,
                  timestamp: Date.now(),
                  exchange: 'hyperliquid'
                });
                this.notifySubscribers();
              }
            }
          }
        } catch (error) {
          console.error('Error parsing Hyperliquid WebSocket message:', error, event.data);
        }
      };

      this.hyperliquidWs.onerror = (error) => {
        console.error('Hyperliquid WebSocket error:', error);
        wsConnected = false;
        // Fall back to polling after 5 seconds if WebSocket fails
        setTimeout(() => {
          if (this.isConnected && !wsConnected) {
            console.log('Falling back to polling for Hyperliquid prices');
            this.pollHyperliquidPrices();
          }
        }, 5000);
      };

      this.hyperliquidWs.onclose = () => {
        console.log('Hyperliquid WebSocket closed');
        wsConnected = false;
        // Fall back to polling
        if (this.isConnected) {
          setTimeout(() => {
            this.pollHyperliquidPrices();
          }, 1000);
        }
      };
      
      // Fallback: start polling after 10 seconds if WebSocket doesn't provide data
      setTimeout(() => {
        if (this.isConnected && !wsConnected) {
          console.log('Starting fallback polling for Hyperliquid');
          this.pollHyperliquidPrices();
        }
      }, 10000);
      
      // Always start polling as backup (every 2 seconds)
      setInterval(() => {
        if (this.isConnected) {
          this.pollHyperliquidPrices();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error connecting to Hyperliquid WebSocket:', error);
      // Fall back to polling
      this.pollHyperliquidPrices();
    }
  }

  /**
   * Poll Hyperliquid prices using REST API as fallback
   */
  private async pollHyperliquidPrices() {
    if (this.commonSymbols.length === 0) return;
    
    // Poll symbols in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < this.commonSymbols.length; i += batchSize) {
      const batch = this.commonSymbols.slice(i, i + batchSize);
      
      const pricePromises = batch.map(async (symbol) => {
        try {
          const response = await fetch('https://api.hyperliquid.xyz/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'l2Book', coin: symbol })
          });
          
          if (!response.ok) return;
          
          const data = await response.json();
          
          if (data && data.levels) {
            const levels = data.levels;
            const asks = levels[0] || [];
            const bids = levels[1] || [];
            
            // Handle both object format {px, sz} and array format [px, sz]
            const bestAsk = asks.length > 0 
              ? parseFloat((asks[0]?.px || asks[0]?.[0]?.px || asks[0]?.[0] || '0').toString()) 
              : 0;
            const bestBid = bids.length > 0 
              ? parseFloat((bids[0]?.px || bids[0]?.[0]?.px || bids[0]?.[0] || '0').toString()) 
              : 0;
            
            let price = 0;
            if (bestBid > 0 && bestAsk > 0) {
              price = (bestBid + bestAsk) / 2;
            } else if (bestBid > 0) {
              price = bestBid;
            } else if (bestAsk > 0) {
              price = bestAsk;
            }
            
            if (price > 0) {
              this.prices.set(`${symbol}_hyperliquid`, {
                symbol,
                price,
                timestamp: Date.now(),
                exchange: 'hyperliquid'
              });
              this.notifySubscribers();
            }
          }
        } catch (error) {
          // Silent fail for individual symbol errors
        }
      });

      await Promise.all(pricePromises);
    }
  }

  /**
   * Connect to Binance WebSocket
   */
  private connectBinance() {
    try {
      // Only subscribe to symbols that are actually on Binance
      const binanceSymbols = this.commonSymbols.filter(s => 
        this.binanceAvailableSymbols.has(s.toUpperCase())
      );
      
      if (binanceSymbols.length === 0) {
        console.log('No Binance symbols to subscribe to, using polling instead');
        this.pollBinancePrices();
        return;
      }
      
      // Binance WebSocket for mark prices (1 stream per 200 symbols)
      // Since we might have many symbols, we'll create streams in batches
      const streams = binanceSymbols
        .slice(0, 200) // Binance limits to 200 streams per connection
        .map(s => `${s.toLowerCase()}usdt@markPrice`)
        .join('/');
      
      const wsUrl = `wss://fstream.binance.com/stream?streams=${streams}`;
      
      if (this.binanceWs) {
        this.binanceWs.close();
      }
      
      this.binanceWs = new WebSocket(wsUrl);

      this.binanceWs.onopen = () => {
        console.log(`✅ Binance WebSocket connected for ${binanceSymbols.length} symbols`);
        console.log('Binance symbols subscribed:', binanceSymbols.slice(0, 20));
      };

      this.binanceWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.stream && data.data) {
            const streamData = data.data;
            // Remove 'USDT' suffix to match symbol format (case-insensitive match)
            const symbol = streamData.s.replace('USDT', '').toUpperCase();
            // Find matching symbol in commonSymbols (preserve original case)
            const matchingSymbol = this.commonSymbols.find(s => s.toUpperCase() === symbol);
            
            if (matchingSymbol) {
              const price = parseFloat(streamData.p || streamData.markPrice || '0');
              
              if (price > 0) {
                console.log(`📊 Binance price update: ${matchingSymbol} = $${price}`);
                this.prices.set(`${matchingSymbol}_binance`, {
                  symbol: matchingSymbol,
                  price,
                  timestamp: Date.now(),
                  exchange: 'binance'
                });
                this.notifySubscribers();
              }
            }
          }
        } catch (error) {
          console.error('❌ Error parsing Binance WebSocket message:', error);
        }
      };

      this.binanceWs.onerror = (error) => {
        console.error('❌ Binance WebSocket error:', error);
        console.log('🔄 Falling back to Binance polling...');
        // Fall back to polling
        this.pollBinancePrices();
      };

      this.binanceWs.onclose = () => {
        console.log('Binance WebSocket closed, falling back to polling');
        // Fall back to polling if still connected
        if (this.isConnected) {
          setTimeout(() => {
            this.pollBinancePrices();
          }, 1000);
        }
      };
      
      // Also start polling as backup (every 3 seconds)
      if (this.binancePollInterval) {
        clearInterval(this.binancePollInterval);
      }
      this.binancePollInterval = setInterval(() => {
        if (this.isConnected) {
          this.pollBinancePrices();
        }
      }, 3000);
      
    } catch (error) {
      console.error('Error connecting to Binance WebSocket:', error);
      // Fall back to polling
      this.pollBinancePrices();
    }
  }

  /**
   * Poll Binance prices using REST API as fallback
   */
  private async pollBinancePrices() {
    // Only poll symbols that are on Binance
    const binanceSymbols = this.commonSymbols.filter(s => 
      this.binanceAvailableSymbols.has(s.toUpperCase())
    );
    
    if (binanceSymbols.length === 0) {
      console.warn('⚠️ No Binance symbols to poll');
      return;
    }
    
    console.log(`🔄 Polling Binance prices for ${binanceSymbols.length} symbols...`);
    
    // Poll in batches to avoid rate limits
    const batchSize = 20;
    for (let i = 0; i < binanceSymbols.length; i += batchSize) {
      const batch = binanceSymbols.slice(i, i + batchSize);
      
      const pricePromises = batch.map(async (symbol) => {
        try {
          const binanceSymbol = `${symbol.toUpperCase()}USDT`;
          const response = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${binanceSymbol}`);
          
          if (!response.ok) return;
          
          const data = await response.json();
          const price = parseFloat(data.markPrice || data.lastPrice || '0');
          
          if (price > 0 && !data.code) {
            console.log(`📊 Binance polling price: ${symbol} = $${price}`);
            this.prices.set(`${symbol}_binance`, {
              symbol,
              price,
              timestamp: Date.now(),
              exchange: 'binance'
            });
            this.notifySubscribers();
          } else if (data.code) {
            console.error(`❌ Binance API error for ${symbol}:`, data.msg || data.code);
          }
        } catch (error) {
          // Silent fail for individual symbol errors
        }
      });

      await Promise.all(pricePromises);
      
      // Small delay between batches to avoid rate limits
      if (i + batchSize < binanceSymbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Notify all subscribers of price updates
   */
  private notifySubscribers() {
    // Include all symbols that have at least one price (Hyperliquid or Binance)
    const allSymbolsWithPrices = new Set<string>();
    this.prices.forEach((priceData, key) => {
      const symbol = priceData.symbol;
      if (priceData.price > 0) {
        allSymbolsWithPrices.add(symbol);
      }
    });
    
    // Combine with commonSymbols to ensure all listed symbols are shown
    const combinedSymbols = [...this.commonSymbols];
    allSymbolsWithPrices.forEach(symbol => {
      if (!combinedSymbols.includes(symbol)) {
        combinedSymbols.push(symbol);
      }
    });
    const symbolsToShow = combinedSymbols;
    
    const comparisons: PriceComparison[] = symbolsToShow.map(symbol => {
      const hyperPrice = this.prices.get(`${symbol}_hyperliquid`)?.price || 0;
      const binancePrice = this.prices.get(`${symbol}_binance`)?.price || 0;
      
      let priceDiff = 0;
      let priceDiffPercent = 0;
      
      if (hyperPrice > 0 && binancePrice > 0) {
        priceDiff = hyperPrice - binancePrice;
        priceDiffPercent = ((hyperPrice - binancePrice) / binancePrice) * 100;
      }
      
      const hyperTime = this.prices.get(`${symbol}_hyperliquid`)?.timestamp || 0;
      const binanceTime = this.prices.get(`${symbol}_binance`)?.timestamp || 0;
      
      return {
        symbol,
        hyperliquidPrice: hyperPrice,
        binancePrice: binancePrice,
        priceDiff,
        priceDiffPercent,
        lastUpdate: Math.max(hyperTime, binanceTime),
      };
    });

    this.subscribers.forEach(callback => callback(comparisons));
  }

  /**
   * Subscribe to price updates
   */
  subscribe(callback: (comparisons: PriceComparison[]) => void) {
    this.subscribers.add(callback);
    // Immediately send current data
    this.notifySubscribers();
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Disconnect all connections
   */
  disconnect() {
    this.isConnected = false;
    
    if (this.hyperliquidWs) {
      this.hyperliquidWs.close();
      this.hyperliquidWs = null;
    }
    
    if (this.binanceWs) {
      this.binanceWs.close();
      this.binanceWs = null;
    }
    
    if (this.binancePollInterval) {
      clearInterval(this.binancePollInterval);
      this.binancePollInterval = null;
    }
    
    this.subscribers.clear();
    this.prices.clear();
    this.binanceAvailableSymbols.clear();
  }
}

export const priceStreamService = new PriceStreamService();

