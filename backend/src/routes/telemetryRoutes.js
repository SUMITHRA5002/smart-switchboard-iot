const express = require('express');
const router = express.Router();
const validateTelemetry = require('../middleware/validateTelemetry');
const { 
  saveTelemetry, 
  getLatestTelemetry, 
  getHistoricalTelemetry, 
  getAnalyticsSummary,
  getAlerts,
  acknowledgeAlert,
  clearAllAlerts,
  simulateAlert
} = require('../controllers/telemetryController');

// POST /api/telemetry - Endpoint for ESP32 to upload dual-channel energy readings
router.post('/', validateTelemetry, saveTelemetry);

// GET /api/telemetry/latest - Snapshot of the most recent readings for all channels
router.get('/latest', getLatestTelemetry);

// GET /api/telemetry/history - Historical data filtered by range, date, or channel
router.get('/history', getHistoricalTelemetry);

// GET /api/telemetry/summary - Summary analytics and bill calculations
router.get('/summary', getAnalyticsSummary);

// Alerts & Anomaly Routes
// GET /api/telemetry/alerts - Retrieve triggered alerts
router.get('/alerts', getAlerts);

// POST /api/telemetry/alerts/:id/ack - Resolve / Acknowledge an alert
router.post('/alerts/:id/ack', acknowledgeAlert);

// POST /api/telemetry/alerts/clear-all - Clear all active alerts
router.post('/alerts/clear-all', clearAllAlerts);

// POST /api/telemetry/alerts/simulate - Simulate an alert for demo / viva testing
router.post('/alerts/simulate', simulateAlert);

module.exports = router;
