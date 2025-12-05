import express from 'express';
import dotenv from 'dotenv';
import { handlePipefileWebhook } from './webhookHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Pipefile to Zoho webhook receiver is running',
    timestamp: new Date().toISOString()
  });
});

// Main webhook endpoint - this is where Pipefile will send POST requests
app.post('/webhook', handlePipefileWebhook);

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Webhook receiver running on port ${PORT}`);
  console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health\n`);
});

export default app;
