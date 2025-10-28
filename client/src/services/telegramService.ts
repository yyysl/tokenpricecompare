import type { PriceComparison } from './priceStreamService';

interface DurationTracker {
  [symbol: string]: number | null; // Timestamp when diff exceeded threshold, or null if below
}

class TelegramAlertService {
  private alertThreshold = 1.0; // 1%
  private durationTrackers: DurationTracker = {};
  private lastAlertTimes: Map<string, number> = new Map();
  private alertCooldown = 5 * 60 * 1000; // 5 minutes cooldown between alerts for same symbol
  private apiEndpoint: string;

  constructor() {
    // Auto-detect API endpoint based on environment
    if (process.env.REACT_APP_TELEGRAM_API_URL) {
      this.apiEndpoint = process.env.REACT_APP_TELEGRAM_API_URL;
    } else if (typeof window !== 'undefined' && 
               window.location.hostname !== 'localhost' && 
               window.location.hostname !== '127.0.0.1') {
      // Production environment
      this.apiEndpoint = 'https://telegram-alert-service.352848845.workers.dev/api/price-alert';
    } else {
      // Local development
      this.apiEndpoint = 'http://localhost:3001/api/price-alert';
    }
    
    // Load saved threshold from localStorage
    const savedThreshold = localStorage.getItem('alertThreshold');
    if (savedThreshold) {
      this.alertThreshold = parseFloat(savedThreshold);
    }
  }

  /**
   * Set alert threshold dynamically
   */
  setAlertThreshold(threshold: number): void {
    if (threshold > 0 && threshold <= 100) {
      this.alertThreshold = threshold;
      console.log(`Telegram alert threshold updated to ${threshold}%`);
    }
  }

  /**
   * Get current alert threshold
   */
  getAlertThreshold(): number {
    return this.alertThreshold;
  }

  /**
   * Check price comparisons and send alerts if threshold exceeded
   */
  async checkAndAlert(priceComparisons: PriceComparison[]): Promise<void> {
    const now = Date.now();

    console.log(`🔔 Checking ${priceComparisons.length} price comparisons for alerts (threshold: ${this.alertThreshold}%)`);

    // Filter comparisons that need alerting
    const alerts: Array<{
      comparison: PriceComparison;
      durationMs: number;
    }> = [];

    for (const comparison of priceComparisons) {
      const { symbol, hyperliquidPrice, binancePrice, priceDiffPercent } = comparison;

      // Only check symbols that have both prices
      if (hyperliquidPrice <= 0 || binancePrice <= 0) {
        // Reset tracker if price data missing
        const symbolKey = symbol.toLowerCase();
        if (this.durationTrackers[symbolKey] !== null && this.durationTrackers[symbolKey] !== undefined) {
          this.durationTrackers[symbolKey] = null;
        }
        continue;
      }

      const absDiffPercent = Math.abs(priceDiffPercent);
      const symbolKey = symbol.toLowerCase();

      // Check if price diff exceeds threshold (1%)
      if (absDiffPercent >= this.alertThreshold) {
        // Start tracking duration if not already tracking
        if (this.durationTrackers[symbolKey] === null || this.durationTrackers[symbolKey] === undefined) {
          this.durationTrackers[symbolKey] = now;
          console.log(`⏱️ Started tracking ${symbol} with ${absDiffPercent.toFixed(4)}% diff`);
        }

        const durationStart = this.durationTrackers[symbolKey]!;
        const durationMs = now - durationStart;

        // Check cooldown (avoid spam)
        const lastAlertTime = this.lastAlertTimes.get(symbolKey) || 0;
        const timeSinceLastAlert = now - lastAlertTime;

        if (timeSinceLastAlert >= this.alertCooldown) {
          console.log(`🚨 Alert triggered for ${symbol}: ${absDiffPercent.toFixed(4)}% diff, duration: ${(durationMs / 1000).toFixed(0)}s`);
          alerts.push({
            comparison: comparison as PriceComparison & { durationMs: number },
            durationMs,
          });
          this.lastAlertTimes.set(symbolKey, now);
        } else {
          const cooldownRemaining = Math.ceil((this.alertCooldown - timeSinceLastAlert) / 1000);
          console.log(`⏳ ${symbol} in cooldown, ${cooldownRemaining}s remaining`);
        }
      } else {
        // Price diff below threshold, reset duration tracker
        const symbolKey = symbol.toLowerCase();
        if (this.durationTrackers[symbolKey] !== null && this.durationTrackers[symbolKey] !== undefined) {
          this.durationTrackers[symbolKey] = null;
        }
      }
    }

    // Send alerts to backend
    if (alerts.length > 0) {
      console.log(`📤 Sending ${alerts.length} alerts to Telegram...`);
      await this.sendAlerts(alerts);
    } else {
      console.log(`✅ No alerts to send (checked ${priceComparisons.length} comparisons)`);
    }
  }

  /**
   * Send alerts to backend API
   */
  private async sendAlerts(alerts: Array<{ comparison: PriceComparison; durationMs: number }>): Promise<void> {
    try {
      // Include durationMs in the comparison data
      const alertData = alerts.map(({ comparison, durationMs }) => ({
        ...comparison,
        durationMs,
      }));

      console.log(`📡 Sending request to: ${this.apiEndpoint}`);
      console.log(`📊 Alert data:`, alertData);
      
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceComparisons: alertData,
        }),
      });

      if (!response.ok) {
        console.error('❌ Failed to send Telegram alerts:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      } else {
        const result = await response.json();
        console.log('✅ Telegram alert sent successfully:', result);
      }
    } catch (error) {
      // Silent fail - don't block the UI if Telegram service is unavailable
      console.error('Error sending Telegram alerts:', error);
    }
  }

  /**
   * Get duration for a symbol in milliseconds
   */
  getDuration(symbol: string): number | null {
    const symbolKey = symbol.toLowerCase();
    const startTime = this.durationTrackers[symbolKey];
    
    if (startTime === null || startTime === undefined) {
      return null;
    }
    
    return Date.now() - startTime;
  }

  /**
   * Format duration text
   */
  formatDuration(ms: number): string {
    if (ms <= 0) return '0秒';
    
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}小时${minutes}分${seconds}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${seconds}秒`;
    } else {
      return `${seconds}秒`;
    }
  }
}

export const telegramAlertService = new TelegramAlertService();

