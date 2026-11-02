const express = require('express');
const sseService = require('../services/sse.service');

const router = express.Router();

const handleSseConnection = (req, res) => {
  const kitchenId = req.query.kitchenId || 'default';
  const userId = req.query.userId || 'anonymous';
  const clientId = `${kitchenId}_${userId}_${Date.now()}`;

  // Required headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Initial connection message
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId })}\n\n`);

  // Register client
  sseService.addClient(clientId, res);

  req.on('close', () => {
    // Client disconnected handled in sseService
  });
};

router.get('/', handleSseConnection);
router.get('/kitchen', handleSseConnection);

module.exports = router;
