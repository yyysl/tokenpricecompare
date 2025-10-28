require('dotenv').config();
const express = require('express');
const cors = require('cors');
const telegramService = require('./telegramService');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Endpoint to receive price comparison data from frontend
app.post('/api/price-alert', async (req, res) => {
  try {
    const { priceComparisons } = req.body;
    
    if (!priceComparisons || !Array.isArray(priceComparisons)) {
      return res.status(400).json({ error: 'Invalid price comparisons data' });
    }

    // Check and send alerts
    await telegramService.checkAndAlert(priceComparisons);

    res.json({ success: true, message: 'Price alerts processed' });
  } catch (error) {
    console.error('Error processing price alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual trigger endpoint
app.post('/api/send-summary', async (req, res) => {
  try {
    // Fetch current price data
    // This would need to call your price comparison API
    // For now, this is just a placeholder
    
    res.json({ success: true, message: 'Summary sent' });
  } catch (error) {
    console.error('Error sending summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Telegram alert server running on port ${PORT}`);
  console.log(`Telegram bot configured: ${telegramService.botToken ? 'Yes' : 'No'}`);
  console.log(`Chat ID configured: ${telegramService.chatId ? 'Yes' : 'No'}`);
});

