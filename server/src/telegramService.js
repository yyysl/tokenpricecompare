const axios = require('axios');

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '';
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.alertThreshold = 1.0; // 1%
    this.alertedSymbols = new Map(); // Track which symbols have been alerted
    this.durationTrackers = new Map(); // Track duration for each symbol
  }

  /**
   * Send message to Telegram
   */
  async sendMessage(text, parseMode = 'HTML') {
    if (!this.botToken || !this.chatId) {
      console.warn('Telegram bot token or chat ID not configured');
      return false;
    }

    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: this.chatId,
        text: text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      });

      return response.data.ok;
    } catch (error) {
      console.error('Error sending Telegram message:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Check price differences and send alerts
   */
  async checkAndAlert(priceComparisons) {
    if (!this.botToken || !this.chatId) {
      return;
    }

    const now = Date.now();
    const alerts = [];

    for (const comparison of priceComparisons) {
      const { symbol, hyperliquidPrice, binancePrice, priceDiffPercent, priceDiff, durationMs } = comparison;

      // Only check symbols that have both prices
      if (hyperliquidPrice <= 0 || binancePrice <= 0) {
        // Reset tracking if price data missing
        const symbolKey = symbol.toLowerCase();
        if (this.durationTrackers.has(symbolKey)) {
          this.durationTrackers.delete(symbolKey);
        }
        continue;
      }

      const absDiffPercent = Math.abs(priceDiffPercent);
      const symbolKey = symbol.toLowerCase();

        // Check if price diff exceeds threshold (1%)
        if (absDiffPercent >= this.alertThreshold) {
          // Track duration - use provided durationMs if available, otherwise calculate
          let durationMsToUse = durationMs;
          
          if (durationMs === undefined || durationMs === null || durationMs === 0) {
            // Start tracking if not already tracking
            if (!this.durationTrackers.has(symbolKey)) {
              this.durationTrackers.set(symbolKey, now);
            }
            const durationStart = this.durationTrackers.get(symbolKey);
            durationMsToUse = now - durationStart;
          } else {
            // Client provided duration, ensure we track it
            if (!this.durationTrackers.has(symbolKey)) {
              // Track from now - duration
              this.durationTrackers.set(symbolKey, now - durationMsToUse);
            } else {
              // Update based on client duration to keep in sync
              const currentTracked = this.durationTrackers.get(symbolKey);
              const expectedStart = now - durationMsToUse;
              // Only update if significantly different (client is source of truth)
              if (Math.abs(currentTracked - expectedStart) > 1000) {
                this.durationTrackers.set(symbolKey, expectedStart);
              }
            }
          }

        // Format duration
        const durationHours = Math.floor(durationMsToUse / (1000 * 60 * 60));
        const durationMinutes = Math.floor((durationMsToUse % (1000 * 60 * 60)) / (1000 * 60));
        const durationSeconds = Math.floor((durationMsToUse % (1000 * 60)) / 1000);

        let durationText = '';
        if (durationHours > 0) {
          durationText = `${durationHours}小时${durationMinutes}分${durationSeconds}秒`;
        } else if (durationMinutes > 0) {
          durationText = `${durationMinutes}分${durationSeconds}秒`;
        } else {
          durationText = `${durationSeconds}秒`;
        }

        // Check if we've already sent an alert for this symbol (cooldown)
        const lastAlertTime = this.alertedSymbols.get(symbolKey);
        const timeSinceLastAlert = lastAlertTime ? now - lastAlertTime : Infinity;

        // Send alert if haven't sent one recently (avoid spam, send every 5 minutes)
        if (!lastAlertTime || timeSinceLastAlert >= 5 * 60 * 1000) {
          const isHyperHigher = hyperliquidPrice > binancePrice;
          const diffSign = isHyperHigher ? '+' : '-';
          
          const message = `🚨 <b>价差告警</b>\n\n` +
            `交易对: <b>${symbol}</b>\n` +
            `Hyperliquid: $${hyperliquidPrice.toFixed(2)}\n` +
            `币安: $${binancePrice.toFixed(2)}\n` +
            `价差: ${diffSign}$${Math.abs(priceDiff).toFixed(2)}\n` +
            `价差百分比: ${diffSign}${absDiffPercent.toFixed(4)}%\n` +
            `持续时间: ${durationText}\n\n` +
            `⚠️ 价差已超过 ${this.alertThreshold}%！`;

          alerts.push({ symbol, message, duration: durationText });
          this.alertedSymbols.set(symbolKey, now);
        }
      } else {
        // Price diff below threshold, reset duration tracker
        if (this.durationTrackers.has(symbolKey)) {
          const hadActiveAlert = this.alertedSymbols.has(symbolKey);
          this.durationTrackers.delete(symbolKey);
          
          // Send recovery message if was previously above threshold
          if (hadActiveAlert) {
            const recoveryMessage = `✅ <b>价差恢复</b>\n\n` +
              `交易对: <b>${symbol}</b>\n` +
              `价差已降至 ${absDiffPercent.toFixed(4)}%\n` +
              `持续时间已重置为 0`;
            
            await this.sendMessage(recoveryMessage);
            this.alertedSymbols.delete(symbolKey);
          }
        }
      }
    }

    // Send all alerts
    for (const alert of alerts) {
      await this.sendMessage(alert.message);
      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  /**
   * Send summary report
   */
  async sendSummary(priceComparisons) {
    if (!this.botToken || !this.chatId) {
      return;
    }

    const highDiffSymbols = priceComparisons
      .filter(c => c.hyperliquidPrice > 0 && c.binancePrice > 0 && Math.abs(c.priceDiffPercent) >= this.alertThreshold)
      .sort((a, b) => Math.abs(b.priceDiffPercent) - Math.abs(a.priceDiffPercent))
      .slice(0, 10);

    if (highDiffSymbols.length === 0) {
      return;
    }

    let message = `📊 <b>价差监控报告</b>\n\n`;
    message += `超过 ${this.alertThreshold}% 的交易对:\n\n`;

    for (const symbol of highDiffSymbols) {
      const isHyperHigher = symbol.hyperliquidPrice > symbol.binancePrice;
      const diffSign = isHyperHigher ? '+' : '-';
      const absDiff = Math.abs(symbol.priceDiffPercent);
      
      const symbolKey = symbol.symbol.toLowerCase();
      const durationStart = this.durationTrackers.get(symbolKey);
      let durationText = '-';
      
      if (durationStart) {
        const durationMs = Date.now() - durationStart;
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        const durationSeconds = Math.floor((durationMs % (1000 * 60)) / 1000);
        
        if (durationMinutes > 0) {
          durationText = `${durationMinutes}分${durationSeconds}秒`;
        } else {
          durationText = `${durationSeconds}秒`;
        }
      }

      message += `<b>${symbol.symbol}</b>\n`;
      message += `  Hyper: $${symbol.hyperliquidPrice.toFixed(2)} | 币安: $${symbol.binancePrice.toFixed(2)}\n`;
      message += `  价差: ${diffSign}${absDiff.toFixed(4)}% | 持续: ${durationText}\n\n`;
    }

    await this.sendMessage(message);
  }
}

module.exports = new TelegramService();

