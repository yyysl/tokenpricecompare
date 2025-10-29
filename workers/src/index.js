/**
 * Cloudflare Workers 版本的 Telegram 告警服务
 * 
 * 使用方法：
 * 1. 安装依赖: npm install
 * 2. 配置 wrangler.toml 和 .dev.vars
 * 3. 部署: npx wrangler deploy
 */

export default {
  async fetch(request, env) {
    // 处理 CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Health check
    if (path === '/health' && request.method === 'GET') {
      return new Response(
        JSON.stringify({ status: 'ok', timestamp: Date.now() }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Get alert threshold
    if (path === '/api/threshold' && request.method === 'GET') {
      try {
        const threshold = await env.ALERT_SETTINGS.get('threshold');
        return new Response(
          JSON.stringify({ threshold: threshold ? parseFloat(threshold) : 1.0 }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ threshold: 1.0 }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    }

    // Set alert threshold
    if (path === '/api/threshold' && request.method === 'POST') {
      try {
        const { threshold } = await request.json();
        
        if (typeof threshold !== 'number' || threshold <= 0 || threshold > 100) {
          return new Response(
            JSON.stringify({ error: 'Invalid threshold value' }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        }

        await env.ALERT_SETTINGS.put('threshold', threshold.toString());
        
        return new Response(
          JSON.stringify({ success: true, threshold }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to save threshold' }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    }

    // Price alert endpoint
    if (path === '/api/price-alert' && request.method === 'POST') {
      try {
        const { priceComparisons } = await request.json();

        if (!priceComparisons || !Array.isArray(priceComparisons)) {
          return new Response(
            JSON.stringify({ error: 'Invalid price comparisons data' }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        }

        // Process alerts
        await checkAndAlert(priceComparisons, env);

        return new Response(
          JSON.stringify({ success: true, message: 'Price alerts processed' }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Internal server error', message: error.message }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    }

    // 404
    return new Response('Not Found', { status: 404 });
  },

  // Cron trigger handler - runs every minute
  async scheduled(event, env, ctx) {
    console.log('🕐 Cron trigger fired:', event.cron);
    
    try {
      // Fetch and compare prices
      const priceComparisons = await fetchAndComparePrices(env);
      
      if (priceComparisons && priceComparisons.length > 0) {
        console.log(`📊 Got ${priceComparisons.length} price comparisons`);
        
        // Check and send alerts with state management
        await checkAndAlertWithState(priceComparisons, env);
      } else {
        console.log('⚠️ No price comparisons available');
      }
    } catch (error) {
      console.error('❌ Error in scheduled task:', error.message);
    }
  }
};

/**
 * Fetch prices from Hyperliquid and Binance and compare them
 */
async function fetchAndComparePrices(env) {
  try {
    // Hardcoded list of major symbols (same as frontend)
    const symbols = [
      'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'DOT', 'MATIC',
      'LTC', 'LINK', 'UNI', 'ATOM', 'ETC', 'ICP', 'APT', 'ARB', 'OP', 'SUI',
      'NEAR', 'FIL', 'IMX', 'HBAR', 'VET', 'TRX', 'AAVE', 'MKR', 'SNX', 'GRT',
      'INJ', 'RUNE', 'FTM', 'ALGO', 'EGLD', 'FLOW', 'XTZ', 'SAND', 'MANA', 'AXS'
    ];

    console.log(`🔍 Fetching prices for ${symbols.length} symbols...`);

    const comparisons = [];

    // Fetch prices in batches to avoid overwhelming APIs
    for (const symbol of symbols.slice(0, 20)) { // Limit to 20 symbols to save resources
      try {
        // Fetch from both exchanges in parallel
        const [hyperPrice, binancePrice] = await Promise.all([
          fetchHyperliquidPrice(symbol),
          fetchBinancePrice(symbol)
        ]);

        if (hyperPrice > 0 && binancePrice > 0) {
          const priceDiff = hyperPrice - binancePrice;
          const priceDiffPercent = ((hyperPrice - binancePrice) / binancePrice) * 100;

          comparisons.push({
            symbol,
            hyperliquidPrice: hyperPrice,
            binancePrice: binancePrice,
            priceDiff,
            priceDiffPercent,
            lastUpdate: Date.now()
          });
        }
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error.message);
      }
    }

    console.log(`✅ Got ${comparisons.length} valid price comparisons`);
    return comparisons;
  } catch (error) {
    console.error('Error in fetchAndComparePrices:', error);
    return [];
  }
}

/**
 * Fetch price from Hyperliquid
 */
async function fetchHyperliquidPrice(symbol) {
  try {
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'l2Book', coin: symbol })
    });

    const data = await response.json();
    
    if (data && data.levels) {
      const asks = data.levels[0] || [];
      const bids = data.levels[1] || [];
      
      const bestAsk = asks.length > 0 ? parseFloat(asks[0]?.px || asks[0]?.[0] || '0') : 0;
      const bestBid = bids.length > 0 ? parseFloat(bids[0]?.px || bids[0]?.[0] || '0') : 0;
      
      if (bestAsk > 0 && bestBid > 0) {
        return (bestAsk + bestBid) / 2;
      }
    }
    
    return 0;
  } catch (error) {
    console.error(`Hyperliquid ${symbol} error:`, error.message);
    return 0;
  }
}

/**
 * Fetch price from Binance
 */
async function fetchBinancePrice(symbol) {
  try {
    const binanceSymbol = `${symbol.toUpperCase()}USDT`;
    const response = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${binanceSymbol}`);
    
    const data = await response.json();
    const price = parseFloat(data.markPrice || data.lastPrice || '0');
    
    return price > 0 && !data.code ? price : 0;
  } catch (error) {
    console.error(`Binance ${symbol} error:`, error.message);
    return 0;
  }
}

/**
 * Check and alert with state management using KV
 */
async function checkAndAlertWithState(priceComparisons, env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('⚠️ Telegram bot token or chat ID not configured');
    return;
  }

  // Get alert threshold from KV (default 1.0%)
  const thresholdStr = await env.ALERT_SETTINGS.get('threshold');
  const alertThreshold = thresholdStr ? parseFloat(thresholdStr) : 1.0;
  
  console.log(`🔔 Checking alerts with threshold: ${alertThreshold}%`);

  const now = Date.now();
  const cooldown = 5 * 60 * 1000; // 5 minutes

  for (const comparison of priceComparisons) {
    const { symbol, hyperliquidPrice, binancePrice, priceDiffPercent, priceDiff } = comparison;
    const absDiffPercent = Math.abs(priceDiffPercent);

    // Check if exceeds threshold
    if (absDiffPercent >= alertThreshold) {
      const symbolKey = symbol.toLowerCase();
      
      // Get duration tracker from KV
      const durationData = await env.ALERT_SETTINGS.get(`duration_${symbolKey}`);
      let durationStart = durationData ? parseInt(durationData) : null;
      
      // Get last alert time from KV
      const lastAlertData = await env.ALERT_SETTINGS.get(`last_alert_${symbolKey}`);
      const lastAlertTime = lastAlertData ? parseInt(lastAlertData) : 0;
      
      // Start tracking if not already
      if (!durationStart) {
        durationStart = now;
        await env.ALERT_SETTINGS.put(`duration_${symbolKey}`, now.toString());
        console.log(`⏱️ Started tracking ${symbol} with ${absDiffPercent.toFixed(4)}% diff`);
      }
      
      const durationMs = now - durationStart;
      const timeSinceLastAlert = now - lastAlertTime;
      
      // Check cooldown
      if (timeSinceLastAlert >= cooldown) {
        // Format duration
        const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
        const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        const durationSeconds = Math.floor((durationMs % (1000 * 60)) / 1000);

        let durationText = '';
        if (durationHours > 0) {
          durationText = `${durationHours}小时${durationMinutes}分${durationSeconds}秒`;
        } else if (durationMinutes > 0) {
          durationText = `${durationMinutes}分${durationSeconds}秒`;
        } else {
          durationText = `${durationSeconds}秒`;
        }

        // Create alert message
        const isHyperHigher = hyperliquidPrice > binancePrice;
        const diffSign = isHyperHigher ? '+' : '-';
        
        const message = `🚨 <b>价差告警</b>\n\n` +
          `交易对: <b>${symbol}</b>\n` +
          `Hyperliquid: $${hyperliquidPrice.toFixed(2)}\n` +
          `币安: $${binancePrice.toFixed(2)}\n` +
          `价差: ${diffSign}$${Math.abs(priceDiff).toFixed(2)}\n` +
          `价差百分比: ${diffSign}${absDiffPercent.toFixed(4)}%\n` +
          `持续时间: ${durationText}\n` +
          `阈值: ${alertThreshold}%`;

        try {
          console.log(`🚨 Sending alert for ${symbol}`);
          await sendTelegramMessage(botToken, chatId, message);
          
          // Update last alert time
          await env.ALERT_SETTINGS.put(`last_alert_${symbolKey}`, now.toString());
          console.log(`✅ Alert sent for ${symbol}`);
        } catch (error) {
          console.error(`❌ Failed to send alert for ${symbol}:`, error.message);
        }
      } else {
        const cooldownRemaining = Math.ceil((cooldown - timeSinceLastAlert) / 1000);
        console.log(`⏳ ${symbol} in cooldown, ${cooldownRemaining}s remaining`);
      }
    } else {
      // Reset duration if below threshold
      const symbolKey = symbol.toLowerCase();
      await env.ALERT_SETTINGS.delete(`duration_${symbolKey}`);
    }
  }
}

/**
 * Check price differences and send alerts (for frontend API)
 */
async function checkAndAlert(priceComparisons, env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  console.log('🔍 checkAndAlert called with', priceComparisons.length, 'comparisons');
  console.log('Bot Token exists:', !!botToken);
  console.log('Chat ID exists:', !!chatId, 'Value:', chatId);

  if (!botToken || !chatId) {
    console.warn('⚠️ Telegram bot token or chat ID not configured');
    return;
  }

  const now = Date.now();
  const alerts = [];

  for (const comparison of priceComparisons) {
    const { symbol, hyperliquidPrice, binancePrice, priceDiffPercent, priceDiff, durationMs } = comparison;

    // Only check symbols that have both prices
    if (hyperliquidPrice <= 0 || binancePrice <= 0) {
      continue;
    }

    const absDiffPercent = Math.abs(priceDiffPercent);
    const symbolKey = symbol.toLowerCase();

    // Frontend already filtered by threshold, so send all data received
    if (true) {
      // Use provided durationMs or calculate
      let durationMsToUse = durationMs || 0;
      
      if (!durationMsToUse) {
        // In Workers, we can't maintain state between requests easily
        // So we rely on the client-provided duration
        durationMsToUse = 0;
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

      // Create alert message
      const isHyperHigher = hyperliquidPrice > binancePrice;
      const diffSign = isHyperHigher ? '+' : '-';
      
      const message = `🚨 <b>价差告警</b>\n\n` +
        `交易对: <b>${symbol}</b>\n` +
        `Hyperliquid: $${hyperliquidPrice.toFixed(2)}\n` +
        `币安: $${binancePrice.toFixed(2)}\n` +
        `价差: ${diffSign}$${Math.abs(priceDiff).toFixed(2)}\n` +
        `价差百分比: ${diffSign}${absDiffPercent.toFixed(4)}%\n` +
        `持续时间: ${durationText}`;

      alerts.push({ symbol, message });
    }
  }

  console.log(`📊 Generated ${alerts.length} alerts`);

  // Send all alerts
  for (const alert of alerts) {
    try {
      console.log(`📤 Sending alert for ${alert.symbol}...`);
      const result = await sendTelegramMessage(botToken, chatId, alert.message);
      console.log(`✅ Alert sent for ${alert.symbol}:`, result);
      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Error sending alert for ${alert.symbol}:`, error.message);
    }
  }
}

/**
 * Send message to Telegram
 */
async function sendTelegramMessage(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  console.log(`📡 Sending to Telegram API:`, url.substring(0, 50) + '...');
  console.log(`📝 Chat ID:`, chatId);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();
    
    console.log(`📬 Telegram API response:`, data);
    
    if (!data.ok) {
      throw new Error(data.description || 'Failed to send message');
    }

    return data;
  } catch (error) {
    console.error('❌ Error sending Telegram message:', error.message);
    throw error;
  }
}

