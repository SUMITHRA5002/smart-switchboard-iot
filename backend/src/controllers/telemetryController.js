const db = require('../db/database');

/**
 * Helper: Anomaly Detection Rule Engine
 * Evaluates real-time reading metrics against physical safety rules
 */
async function evaluateAnomalyRules(appliance, item, deviceId) {
  const anomalies = [];
  const powerThreshold = appliance.power_threshold_w || 2000.0;

  // 1. Over-Power Surge Rule
  if (item.power > powerThreshold) {
    anomalies.push({
      alert_type: 'OVER_POWER',
      severity: 'CRITICAL',
      message: `Over-power surge on ${appliance.name || `Channel ${item.channel}`}: ${item.power.toFixed(1)}W exceeds safety threshold (${powerThreshold}W)`,
      triggered_value: item.power,
      threshold_value: powerThreshold
    });
  }

  // 2. High Voltage Rule (Grid Surge)
  if (item.voltage > 255.0) {
    anomalies.push({
      alert_type: 'VOLTAGE_HIGH',
      severity: 'WARNING',
      message: `Grid over-voltage detected on Channel ${item.channel}: ${item.voltage.toFixed(1)}V exceeds standard limit (255.0V)`,
      triggered_value: item.voltage,
      threshold_value: 255.0
    });
  }

  // 3. Low Voltage Rule (Brownout / Sag)
  if (item.voltage < 195.0 && item.voltage > 50.0) {
    anomalies.push({
      alert_type: 'VOLTAGE_LOW',
      severity: 'WARNING',
      message: `Grid under-voltage / sag detected on Channel ${item.channel}: ${item.voltage.toFixed(1)}V is below safe limit (195.0V)`,
      triggered_value: item.voltage,
      threshold_value: 195.0
    });
  }

  // 4. Low Power Factor / Efficiency Loss Rule (Active load > 20W with PF < 0.60)
  if (item.power > 20.0 && item.power_factor < 0.60 && item.power_factor > 0.0) {
    anomalies.push({
      alert_type: 'LOW_POWER_FACTOR',
      severity: 'INFO',
      message: `Low power factor (${item.power_factor.toFixed(2)}) on ${appliance.name || `Channel ${item.channel}`} under active load (${item.power.toFixed(1)}W). Indicates reactive power loss.`,
      triggered_value: item.power_factor,
      threshold_value: 0.60
    });
  }

  // Deduplicate and insert anomalies (rate-limit: max 1 alert per type/channel per 60 seconds)
  for (const a of anomalies) {
    const existing = await db.getAsync(`
      SELECT id FROM alerts 
      WHERE channel_id = ? AND alert_type = ? AND is_resolved = 0 
      AND timestamp >= datetime('now', '-60 seconds')
    `, [item.channel, a.alert_type]);

    if (!existing) {
      await db.runAsync(`
        INSERT INTO alerts 
          (appliance_id, channel_id, alert_type, severity, message, triggered_value, threshold_value, is_resolved)
        VALUES 
          (?, ?, ?, ?, ?, ?, ?, 0)
      `, [
        appliance.id,
        item.channel,
        a.alert_type,
        a.severity,
        a.message,
        a.triggered_value,
        a.threshold_value
      ]);
    }
  }
}

/**
 * Controller: saveTelemetry
 * Saves validated ESP32 telemetry readings into the SQLite database
 */
exports.saveTelemetry = async (req, res) => {
  try {
    const { device_id, readings } = req.body;
    let savedCount = 0;

    // Process each channel reading
    for (const item of readings) {
      // 1. Find or auto-create corresponding appliance
      let appliance = await db.getAsync(
        'SELECT id, name, power_threshold_w FROM appliances WHERE channel_id = ?',
        [item.channel]
      );

      if (!appliance) {
        const createResult = await db.runAsync(
          'INSERT INTO appliances (channel_id, name, category, power_threshold_w) VALUES (?, ?, ?, ?)',
          [item.channel, `Appliance ${item.channel}`, 'General', 2000.0]
        );
        appliance = { id: createResult.lastID, name: `Appliance ${item.channel}`, power_threshold_w: 2000.0 };
      }

      // 2. Insert energy reading
      await db.runAsync(`
        INSERT INTO energy_readings 
          (device_id, channel_id, appliance_id, voltage, current, power, energy, frequency, power_factor)
        VALUES 
          (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        device_id,
        item.channel,
        appliance.id,
        item.voltage,
        item.current,
        item.power,
        item.energy,
        item.frequency,
        item.power_factor
      ]);

      // 3. Rule-Based Anomaly Detection
      await evaluateAnomalyRules(appliance, item, device_id);

      savedCount++;
    }

    return res.status(201).json({
      status: 'success',
      message: 'Telemetry readings recorded successfully',
      device_id,
      saved_records: savedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving telemetry readings:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error while saving telemetry readings',
      error: error.message
    });
  }
};

/**
 * Controller: getLatestTelemetry
 * Returns the most recent readings for all active channels
 */
exports.getLatestTelemetry = async (req, res) => {
  try {
    const query = `
      SELECT 
        r.id,
        r.device_id,
        r.channel_id,
        a.name AS appliance_name,
        a.category AS appliance_category,
        r.voltage,
        r.current,
        r.power,
        r.energy,
        r.frequency,
        r.power_factor,
        r.timestamp
      FROM energy_readings r
      LEFT JOIN appliances a ON r.appliance_id = a.id
      WHERE r.id IN (
        SELECT MAX(id) FROM energy_readings GROUP BY channel_id
      )
      ORDER BY r.channel_id ASC
    `;

    const latest = await db.allAsync(query);

    return res.status(200).json({
      status: 'success',
      count: latest.length,
      data: latest
    });
  } catch (error) {
    console.error('Error fetching latest telemetry:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch latest telemetry',
      error: error.message
    });
  }
};

/**
 * Controller: getHistoricalTelemetry
 * Returns historical readings with filtering by date range and channel
 */
exports.getHistoricalTelemetry = async (req, res) => {
  try {
    const { range = 'all', from, to, channel, limit = 500 } = req.query;
    const params = [];
    let whereClauses = [];

    // Filter by Channel
    if (channel && channel !== 'all') {
      whereClauses.push('r.channel_id = ?');
      params.push(parseInt(channel, 10));
    }

    // Filter by Date Range
    if (from && to) {
      whereClauses.push('r.timestamp >= ? AND r.timestamp <= ?');
      params.push(from, to);
    } else if (range === 'today') {
      whereClauses.push("r.timestamp >= date('now', 'start of day')");
    } else if (range === 'yesterday') {
      whereClauses.push("r.timestamp >= date('now', '-1 day', 'start of day') AND r.timestamp < date('now', 'start of day')");
    } else if (range === '7d') {
      whereClauses.push("r.timestamp >= datetime('now', '-7 days')");
    } else if (range === '30d') {
      whereClauses.push("r.timestamp >= datetime('now', '-30 days')");
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 500, 1), 2000);

    const query = `
      SELECT 
        r.id,
        r.device_id,
        r.channel_id,
        a.name AS appliance_name,
        a.category AS appliance_category,
        r.voltage,
        r.current,
        r.power,
        r.energy,
        r.frequency,
        r.power_factor,
        r.timestamp
      FROM energy_readings r
      LEFT JOIN appliances a ON r.appliance_id = a.id
      ${whereSql}
      ORDER BY r.timestamp ASC
      LIMIT ${safeLimit}
    `;

    const records = await db.allAsync(query, params);

    return res.status(200).json({
      status: 'success',
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('Error fetching historical telemetry:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch historical telemetry',
      error: error.message
    });
  }
};

/**
 * Controller: getAnalyticsSummary
 * Returns calculated energy metrics, consumption, and cost estimates
 */
exports.getAnalyticsSummary = async (req, res) => {
  try {
    const tariff = parseFloat(req.query.tariff) || 7.00;

    // 1. Latest snapshot for total current power
    const latestQuery = `
      SELECT 
        r.channel_id,
        a.name AS appliance_name,
        r.power,
        r.voltage,
        r.current,
        r.energy,
        r.timestamp
      FROM energy_readings r
      LEFT JOIN appliances a ON r.appliance_id = a.id
      WHERE r.id IN (
        SELECT MAX(id) FROM energy_readings GROUP BY channel_id
      )
    `;
    const latestRows = await db.allAsync(latestQuery);

    const currentTotalPower = latestRows.reduce((sum, r) => sum + (r.power || 0), 0);

    // 2. Aggregate energy metrics per channel
    const channelStatsQuery = `
      SELECT 
        r.channel_id,
        a.name AS appliance_name,
        COUNT(r.id) AS reading_count,
        MAX(r.power) AS peak_power,
        AVG(r.power) AS avg_power,
        MAX(r.energy) AS max_energy,
        MIN(r.energy) AS min_energy,
        MAX(r.voltage) AS max_voltage,
        AVG(r.voltage) AS avg_voltage,
        AVG(r.power_factor) AS avg_power_factor
      FROM energy_readings r
      LEFT JOIN appliances a ON r.appliance_id = a.id
      GROUP BY r.channel_id
    `;
    const channelStats = await db.allAsync(channelStatsQuery);

    // Calculate energy consumed per channel
    const applianceBreakdown = channelStats.map(stat => {
      let energyConsumedKwh = stat.max_energy - stat.min_energy;
      if (energyConsumedKwh <= 0 && stat.max_energy > 0) {
        energyConsumedKwh = stat.max_energy;
      }
      if (energyConsumedKwh <= 0 && stat.avg_power > 0) {
        energyConsumedKwh = (stat.avg_power * (stat.reading_count * 3)) / (3600 * 1000);
      }

      const estimatedCost = energyConsumedKwh * tariff;

      return {
        channel_id: stat.channel_id,
        appliance_name: stat.appliance_name || `Appliance ${stat.channel_id}`,
        energy_kwh: parseFloat(energyConsumedKwh.toFixed(4)),
        peak_power_w: parseFloat((stat.peak_power || 0).toFixed(1)),
        avg_power_w: parseFloat((stat.avg_power || 0).toFixed(1)),
        avg_voltage_v: parseFloat((stat.avg_voltage || 0).toFixed(1)),
        avg_power_factor: parseFloat((stat.avg_power_factor || 0).toFixed(2)),
        estimated_cost: parseFloat(estimatedCost.toFixed(2))
      };
    });

    const totalEnergyKwh = applianceBreakdown.reduce((sum, item) => sum + item.energy_kwh, 0);
    const totalEstimatedCost = totalEnergyKwh * tariff;
    const peakPowerW = Math.max(...applianceBreakdown.map(a => a.peak_power_w), 0);

    return res.status(200).json({
      status: 'success',
      data: {
        current_total_power_w: parseFloat(currentTotalPower.toFixed(1)),
        total_energy_kwh: parseFloat(totalEnergyKwh.toFixed(4)),
        total_estimated_cost: parseFloat(totalEstimatedCost.toFixed(2)),
        tariff_rate: tariff,
        peak_power_w: peakPowerW,
        active_channels_count: latestRows.length,
        appliance_breakdown: applianceBreakdown,
        last_updated: latestRows[0]?.timestamp || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error computing analytics summary:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to compute analytics summary',
      error: error.message
    });
  }
};

/**
 * Controller: getAlerts
 * Returns list of anomaly alerts with filtering options
 */
exports.getAlerts = async (req, res) => {
  try {
    const { resolved = 'all', limit = 50 } = req.query;
    let whereSql = '';
    const params = [];

    if (resolved === '0') {
      whereSql = 'WHERE al.is_resolved = 0';
    } else if (resolved === '1') {
      whereSql = 'WHERE al.is_resolved = 1';
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

    const query = `
      SELECT 
        al.id,
        al.channel_id,
        a.name AS appliance_name,
        al.alert_type,
        al.severity,
        al.message,
        al.triggered_value,
        al.threshold_value,
        al.is_resolved,
        al.timestamp
      FROM alerts al
      LEFT JOIN appliances a ON al.appliance_id = a.id
      ${whereSql}
      ORDER BY al.timestamp DESC
      LIMIT ${safeLimit}
    `;

    const alerts = await db.allAsync(query, params);

    // Count active unresolved alerts
    const countRow = await db.getAsync('SELECT COUNT(*) AS active_count FROM alerts WHERE is_resolved = 0');

    return res.status(200).json({
      status: 'success',
      active_count: countRow ? countRow.active_count : 0,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
};

/**
 * Controller: acknowledgeAlert
 * Resolves / acknowledges a single alert
 */
exports.acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;
    await db.runAsync('UPDATE alerts SET is_resolved = 1 WHERE id = ?', [id]);
    return res.status(200).json({
      status: 'success',
      message: `Alert #${id} marked as resolved`
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to acknowledge alert',
      error: error.message
    });
  }
};

/**
 * Controller: clearAllAlerts
 * Marks all active alerts as resolved
 */
exports.clearAllAlerts = async (req, res) => {
  try {
    const result = await db.runAsync('UPDATE alerts SET is_resolved = 1 WHERE is_resolved = 0');
    return res.status(200).json({
      status: 'success',
      message: 'All active alerts cleared',
      cleared_count: result.changes
    });
  } catch (error) {
    console.error('Error clearing alerts:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to clear alerts',
      error: error.message
    });
  }
};

/**
 * Controller: simulateAlert (For Live Viva / Demo Testing)
 */
exports.simulateAlert = async (req, res) => {
  try {
    const { channel = 1, alert_type = 'OVER_POWER', value = 2450.0 } = req.body;
    let appliance = await db.getAsync('SELECT id, name, power_threshold_w FROM appliances WHERE channel_id = ?', [channel]);
    if (!appliance) {
      appliance = { id: 1, name: `Appliance ${channel}`, power_threshold_w: 2000.0 };
    }

    let severity = 'WARNING';
    let message = '';
    let threshold = 2000.0;

    if (alert_type === 'OVER_POWER') {
      severity = 'CRITICAL';
      threshold = appliance.power_threshold_w || 2000.0;
      message = `[SIMULATED] Over-power surge on ${appliance.name}: ${value}W exceeds safety limit (${threshold}W)`;
    } else if (alert_type === 'VOLTAGE_HIGH') {
      severity = 'WARNING';
      threshold = 255.0;
      message = `[SIMULATED] Grid over-voltage detected: ${value}V exceeds standard 255V limit`;
    } else if (alert_type === 'VOLTAGE_LOW') {
      severity = 'WARNING';
      threshold = 195.0;
      message = `[SIMULATED] Grid under-voltage / sag detected: ${value}V below safe 195V limit`;
    } else {
      severity = 'INFO';
      threshold = 0.60;
      message = `[SIMULATED] Low power factor (${value}) detected under load. Reactive energy loss.`;
    }

    const insertResult = await db.runAsync(`
      INSERT INTO alerts (appliance_id, channel_id, alert_type, severity, message, triggered_value, threshold_value, is_resolved)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `, [appliance.id, channel, alert_type, severity, message, value, threshold]);

    return res.status(201).json({
      status: 'success',
      message: 'Alert simulated successfully',
      alert_id: insertResult.lastID,
      data: {
        id: insertResult.lastID,
        channel_id: channel,
        appliance_name: appliance.name,
        alert_type,
        severity,
        message,
        triggered_value: value,
        threshold_value: threshold,
        is_resolved: 0,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error simulating alert:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to simulate alert',
      error: error.message
    });
  }
};
