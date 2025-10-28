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
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
};

/**
 * Check price differences and send alerts
 */
async function checkAndAlert(priceComparisons, env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('Telegram bot token or chat ID not configured');
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

  // Send all alerts
  for (const alert of alerts) {
    try {
      await sendTelegramMessage(botToken, chatId, alert.message);
      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error sending alert for ${alert.symbol}:`, error);
    }
  }
}

/**
 * Send message to Telegram
 */
async function sendTelegramMessage(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
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
    
    if (!data.ok) {
      throw new Error(data.description || 'Failed to send message');
    }

    return data;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    throw error;
  }
}

