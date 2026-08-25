const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Initialize SQLite database and ensure tables exist
const db = require('./db/database');

// Initialize the Express application
const app = express();

// Configure the server port (defaults to 5000 if not specified in .env)
const PORT = process.env.PORT || 5000;

// ==========================================
// Middlewares
// ==========================================

// Enable Cross-Origin Resource Sharing (allows frontend apps to talk to this API)
app.use(cors());

// Parse incoming requests with JSON payloads (e.g. telemetry data from ESP32)
app.use(express.json());

// Parse URL-encoded payloads
app.use(express.urlencoded({ extended: true }));

// ==========================================
// Routes
// ==========================================

// Telemetry API routes (ESP32 ingestion & telemetry retrieval)
const telemetryRoutes = require('./routes/telemetryRoutes');
app.use('/api/telemetry', telemetryRoutes);

// Appliance Configuration API routes (Renaming, Categories, Power Thresholds)
const applianceRoutes = require('./routes/applianceRoutes');
app.use('/api/appliances', applianceRoutes);

// Phase 3: Energy Recommendations, Projections & Carbon Footprint API routes
const intelligenceRoutes = require('./routes/intelligenceRoutes');
app.use('/api', intelligenceRoutes);

// Root Endpoint - Basic server status check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'Smart Switchboard Backend is running'
  });
});

// Health Check Endpoint - Verifies the backend API service health
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'smart-switchboard-backend'
  });
});

// ==========================================
// Start Server
// ==========================================
app.listen(PORT, () => {
  console.log(`================================================`);
  console.log(` Smart Switchboard Backend Server Started`);
  console.log(` Running on: http://localhost:${PORT}`);
  console.log(` Database: SQLite (backend/data/smart_switchboard.db)`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`================================================`);
});
