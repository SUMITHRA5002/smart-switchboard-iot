const db = require('../db/database');
const { generateEnergyIntelligence, DEFAULT_TARIFF } = require('./energyRecommendationService');

/**
 * Sanitize numbers to prevent NaN, Infinity, or unexpected nulls
 */
function sanitize(val, fallback = 0, decimals = 2) {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return fallback;
  }
  const num = Math.max(0, parseFloat(val));
  return parseFloat(num.toFixed(decimals));
}

/**
 * Analyze context-aware behaviour deviation for all appliances or a specific channel
 */
async function analyzeApplianceBehaviour(options = {}) {
  const targetChannel = options.channel !== undefined ? parseInt(options.channel, 10) : null;
  const targetApplianceName = options.appliance ? String(options.appliance).toLowerCase().trim() : null;

  // 1. Fetch active appliances configured in SQLite
  const appliances = await db.allAsync(
    'SELECT * FROM appliances WHERE is_active = 1 ORDER BY channel_id ASC'
  );

  // 2. Fetch latest telemetry snapshot for each channel
  const latestRows = await db.allAsync(`
    SELECT r.*, a.name AS appliance_name, a.category
    FROM energy_readings r
    LEFT JOIN appliances a ON r.channel_id = a.channel_id
    WHERE r.id IN (
      SELECT MAX(id) FROM energy_readings GROUP BY channel_id
    )
  `);
  const latestMap = new Map();
  latestRows.forEach(r => latestMap.set(r.channel_id, r));

  // 3. Query historical aggregated baseline statistics from energy_readings
  const historicalStats = await db.allAsync(`
    SELECT 
      channel_id,
      COUNT(id) AS sample_count,
      COUNT(DISTINCT date(timestamp)) AS distinct_days,
      AVG(power) AS avg_power_all,
      AVG(CASE WHEN power > 15 THEN power ELSE NULL END) AS avg_active_power,
      MAX(power) AS max_power,
      MIN(power) AS min_power,
      AVG(energy) AS avg_energy,
      MAX(energy) AS max_energy,
      MIN(energy) AS min_energy,
      AVG(power_factor) AS avg_pf
    FROM energy_readings
    GROUP BY channel_id
  `);
  const historicalMap = new Map();
  historicalStats.forEach(h => historicalMap.set(h.channel_id, h));

  // 4. Evaluate behaviour deviation for each monitored appliance
  const analysedAppliances = [];
  let normalCount = 0;
  let expectedIncreaseCount = 0;
  let slightlyHigherCount = 0;
  let unusualCount = 0;
  let criticalCount = 0;

  for (const app of appliances) {
    // If filtering by channel or name
    if (targetChannel && app.channel_id !== targetChannel) continue;
    if (targetApplianceName && !app.name.toLowerCase().includes(targetApplianceName)) continue;

    const latest = latestMap.get(app.channel_id);
    const hist = historicalMap.get(app.channel_id);

    const currentPowerW = latest ? sanitize(latest.power, 0, 1) : 0;
    const currentEnergyKwh = latest ? sanitize(latest.energy, 0, 3) : 0;
    const currentPf = latest ? sanitize(latest.power_factor, 0.9, 2) : 0.9;

    const sampleCount = hist ? hist.sample_count : 0;
    const distinctDays = hist ? hist.distinct_days : 0;
    const histAvgPowerW = hist && hist.avg_active_power ? sanitize(hist.avg_active_power, currentPowerW, 1) : sanitize(currentPowerW, 100, 1);
    
    // Baseline daily energy (from historical delta or power integration)
    const histEnergyDelta = hist ? (hist.max_energy - hist.min_energy) : 0;
    const histBaselineKwh = sanitize(
      histEnergyDelta > 0 ? (histEnergyDelta / Math.max(1, distinctDays)) : (histAvgPowerW * 6) / 1000,
      0.1,
      3
    );

    // Deviations
    const powerDeviationPct = histAvgPowerW > 0 
      ? sanitize(((currentPowerW - histAvgPowerW) / histAvgPowerW) * 100, 0, 1)
      : 0;

    const energyDeviationPct = histBaselineKwh > 0 
      ? sanitize(((currentEnergyKwh - histBaselineKwh) / histBaselineKwh) * 100, 0, 1)
      : 0;

    // Estimated runtimes
    const currentRuntimeHours = currentPowerW > 20 
      ? sanitize((currentEnergyKwh * 1000) / currentPowerW, 1.0, 1) 
      : 1.0;
    const histRuntimeHours = histAvgPowerW > 20 
      ? sanitize((histBaselineKwh * 1000) / histAvgPowerW, 1.0, 1) 
      : 1.0;
    const runtimeChangePct = histRuntimeHours > 0 
      ? sanitize(((currentRuntimeHours - histRuntimeHours) / histRuntimeHours) * 100, 0, 1)
      : 0;

    // Confidence evaluation
    let confidence = 'LOW';
    let confidenceScore = 55;
    if (sampleCount >= 8 || distinctDays >= 4) {
      confidence = 'HIGH';
      confidenceScore = 88;
    } else if (sampleCount >= 3 || distinctDays >= 2) {
      confidence = 'MEDIUM';
      confidenceScore = 72;
    } else {
      confidence = 'LOW';
      confidenceScore = 50;
    }

    // Context-Aware Classification Logic
    let classification = 'NORMAL';
    let reason = `Appliance is operating within expected historical baseline limits (${powerDeviationPct >= 0 ? '+' : ''}${powerDeviationPct}% power deviation).`;
    let recommendation = 'Standard operation. No action required.';
    let isContextExplained = false;

    if (sampleCount < 2) {
      classification = 'NORMAL';
      confidence = 'LOW';
      confidenceScore = 45;
      reason = 'Insufficient historical data to determine whether this behaviour is abnormal. Continue collecting telemetry.';
      recommendation = 'Maintain device connection to build historical baseline.';
    } else if (energyDeviationPct > 20 && runtimeChangePct > 15 && Math.abs(powerDeviationPct) < 20) {
      // Energy increased, but runtime also increased proportionally while draw intensity is stable
      classification = 'EXPECTED_INCREASE';
      isContextExplained = true;
      reason = `Energy consumption increased (+${energyDeviationPct}%), but appliance usage/runtime also increased (+${runtimeChangePct}%) while power draw intensity remained steady.`;
      recommendation = 'Expected increase due to higher appliance operating hours. Consider runtime scheduling to optimize costs.';
      expectedIncreaseCount++;
    } else if (powerDeviationPct > 60 && sampleCount >= 4) {
      classification = 'CRITICAL';
      reason = `Substantial and persistent unexplained power surge detected (+${powerDeviationPct}% over baseline) without corresponding runtime justification.`;
      recommendation = 'Inspect appliance immediately for abnormal electrical load, mechanical obstruction, or worn components.';
      criticalCount++;
    } else if (powerDeviationPct > 30 || (energyDeviationPct > 35 && runtimeChangePct < 10)) {
      classification = 'UNUSUAL';
      reason = `Energy consumption is substantially above the appliance's historical baseline (+${powerDeviationPct || energyDeviationPct}%) while usage/runtime pattern remains relatively stable.`;
      recommendation = 'Monitor appliance operating temperature, dust/filters, and power factor.';
      unusualCount++;
    } else if (powerDeviationPct > 15 || (energyDeviationPct > 15 && runtimeChangePct < 10)) {
      classification = 'SLIGHTLY_HIGHER';
      reason = `Moderate unexplained deviation from historical baseline (+${powerDeviationPct || energyDeviationPct}%).`;
      recommendation = 'Observe load over the next 24–48 hours for recurring patterns.';
      slightlyHigherCount++;
    } else {
      classification = 'NORMAL';
      normalCount++;
    }

    analysedAppliances.push({
      channel_id: app.channel_id,
      appliance_name: app.name,
      category: app.category,
      current_power_w: currentPowerW,
      historical_avg_power_w: histAvgPowerW,
      current_energy_kwh: currentEnergyKwh,
      historical_baseline_kwh: histBaselineKwh,
      power_deviation_percentage: powerDeviationPct,
      energy_deviation_percentage: energyDeviationPct,
      runtime_estimated_hours: currentRuntimeHours,
      historical_runtime_hours: histRuntimeHours,
      runtime_change_percentage: runtimeChangePct,
      is_context_explained: isContextExplained,
      classification: classification,
      confidence: confidence,
      confidence_score: confidenceScore,
      historical_samples_count: sampleCount,
      distinct_days_analyzed: distinctDays,
      reason: reason,
      recommendation: recommendation
    });
  }

  return {
    status: 'success',
    appliance_count: analysedAppliances.length,
    summary: {
      normal_count: normalCount,
      expected_increase_count: expectedIncreaseCount,
      slightly_higher_count: slightlyHigherCount,
      unusual_count: unusualCount,
      critical_count: criticalCount,
      overall_health_status: (criticalCount > 0) ? 'CRITICAL_DEVIATION' : (unusualCount > 0) ? 'UNUSUAL_DEVIATION' : (slightlyHigherCount > 0) ? 'MONITOR_REQUIRED' : 'NORMAL'
    },
    appliances: analysedAppliances,
    disclaimer: "Context-aware behaviour deviation analyzes historical load intensity and runtime patterns. It does not measure physical electrical or refrigerant leakage.",
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  analyzeApplianceBehaviour
};
