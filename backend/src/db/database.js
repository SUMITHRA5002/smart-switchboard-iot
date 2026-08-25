const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database file path
const dbPath = path.join(dataDir, 'smart_switchboard.db');

// Connect to SQLite Database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(' [Database] Error connecting to SQLite database:', err.message);
  } else {
    console.log(' [Database] Connected to SQLite database at:', dbPath);
  }
});

// Helper functions for modern async/await syntax with SQLite
db.runAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

db.getAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

db.allAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

/**
 * Initialize Tables and Indexes
 */
async function initializeDatabase() {
  try {
    // Enable Foreign Keys
    await db.runAsync('PRAGMA foreign_keys = ON');

    // 1. Appliances Table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS appliances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        power_threshold_w REAL DEFAULT 2000.0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Energy Readings Table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS energy_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        channel_id INTEGER NOT NULL,
        appliance_id INTEGER REFERENCES appliances(id) ON DELETE SET NULL,
        voltage REAL NOT NULL,
        current REAL NOT NULL,
        power REAL NOT NULL,
        energy REAL NOT NULL,
        frequency REAL NOT NULL,
        power_factor REAL NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Alerts & Anomaly Table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        appliance_id INTEGER REFERENCES appliances(id) ON DELETE CASCADE,
        channel_id INTEGER NOT NULL,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'WARNING',
        message TEXT NOT NULL,
        triggered_value REAL,
        threshold_value REAL,
        is_resolved INTEGER DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Energy Budgets & Goals Table (Phase 7)
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS energy_budgets (
        id INTEGER PRIMARY KEY,
        monthly_budget_inr REAL NOT NULL DEFAULT 500.0,
        currency TEXT DEFAULT 'INR',
        alert_threshold_pct REAL DEFAULT 90.0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Create Indexes for fast queries
    await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON energy_readings(timestamp)`);
    await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_readings_channel_timestamp ON energy_readings(channel_id, timestamp)`);
    await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_readings_appliance ON energy_readings(appliance_id)`);
    await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp)`);
    await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(is_resolved)`);
    await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_alerts_channel_type ON alerts(channel_id, alert_type, is_resolved)`);

    // 6. Pre-seed default appliances for Channel 1 and Channel 2 if not existing
    const countRow = await db.getAsync('SELECT COUNT(*) AS count FROM appliances');
    if (countRow && countRow.count === 0) {
      await db.runAsync(
        'INSERT INTO appliances (channel_id, name, category, power_threshold_w) VALUES (?, ?, ?, ?)',
        [1, 'Air Conditioner', 'Cooling', 2000.0]
      );
      await db.runAsync(
        'INSERT INTO appliances (channel_id, name, category, power_threshold_w) VALUES (?, ?, ?, ?)',
        [2, 'Refrigerator', 'Refrigeration', 800.0]
      );
      console.log(' [Database] Initialized default appliances for Channel 1 and Channel 2.');
    }

    // 7. Pre-seed default budget record (ID 1) if not existing
    const budgetRow = await db.getAsync('SELECT id FROM energy_budgets WHERE id = 1');
    if (!budgetRow) {
      await db.runAsync(
        'INSERT INTO energy_budgets (id, monthly_budget_inr, currency, alert_threshold_pct) VALUES (1, 500.0, "INR", 90.0)'
      );
      console.log(' [Database] Initialized default monthly budget (₹500.00).');
    }

    console.log(' [Database] SQLite schema (appliances, energy_readings, alerts, energy_budgets) verified and ready.');
  } catch (err) {
    console.error(' [Database] Schema initialization error:', err);
  }
}

// Run table initialization
initializeDatabase();

module.exports = db;
