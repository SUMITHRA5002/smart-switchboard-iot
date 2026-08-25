const db = require('../db/database');

// Default Constants
const DEFAULT_GRID_EMISSION_FACTOR = 0.82; // kg CO2 / kWh (India CEA baseline standard)
const DEFAULT_TARIFF = 7.00; // ₹ / kWh

/**
 * Helper: Sanitize numbers to prevent NaN, Infinity, negative values
 */
function sanitize(val, fallback = 0, decimals = 2) {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return fallback;
  }
  const num = Math.max(0, parseFloat(val));
  return parseFloat(num.toFixed(decimals));
}

/**
 * Analyze all telemetry data and compute comprehensive energy, projection,
 * carbon footprint, and explainable recommendations.
 */
async function generateEnergyIntelligence(options = {}) {
  const tariff = sanitize(options.tariff, DEFAULT_TARIFF, 2);
  const emissionFactor = sanitize(options.emissionFactor, DEFAULT_GRID_EMISSION_FACTOR, 3);
  const targetChannel = options.channel ? parseInt(options.channel, 10) : null;

  // 1. Fetch configured appliances
  let applianceQuery = 'SELECT id, channel_id, name, category, power_threshold_w, is_active FROM appliances';
  const applianceParams = [];
  if (targetChannel) {
    applianceQuery += ' WHERE channel_id = ?';
    applianceParams.push(targetChannel);
  }
  applianceQuery += ' ORDER BY channel_id ASC';

  const appliances = await db.allAsync(applianceQuery, applianceParams);

  // 2. Fetch latest snapshot readings
  const latestRows = await db.allAsync(`
    SELECT 
      r.channel_id,
      r.voltage,
      r.current,
      r.power,
      r.energy,
      r.frequency,
      r.power_factor,
      r.timestamp
    FROM energy_readings r
    WHERE r.id IN (
      SELECT MAX(id) FROM energy_readings GROUP BY channel_id
    )
  `);
  const latestMap = new Map();
  latestRows.forEach(r => latestMap.set(r.channel_id, r));

  // 3. Aggregate all-time / today stats per channel
  const statsRows = await db.allAsync(`
    SELECT 
      r.channel_id,
      COUNT(r.id) AS reading_count,
      MAX(r.power) AS peak_power,
      AVG(r.power) AS avg_power,
      MAX(r.energy) AS max_energy,
      MIN(r.energy) AS min_energy,
      AVG(r.voltage) AS avg_voltage,
      AVG(r.power_factor) AS avg_pf,
      MIN(r.timestamp) AS first_timestamp,
      MAX(r.timestamp) AS last_timestamp,
      SUM(CASE WHEN r.power > 5.0 THEN 1 ELSE 0 END) AS active_samples
    FROM energy_readings r
    GROUP BY r.channel_id
  `);
  const statsMap = new Map();
  statsRows.forEach(s => statsMap.set(s.channel_id, s));

  // 4. Compute per-appliance metrics
  const applianceInsights = [];
  let totalMeasuredEnergyKwh = 0;
  let totalDailyEnergyKwh = 0;
  let totalMonthlyProjectedKwh = 0;
  let totalCurrentPowerW = 0;

  for (const app of appliances) {
    const channelId = app.channel_id;
    const latest = latestMap.get(channelId) || {};
    const stats = statsMap.get(channelId) || {};

    const currentPower = sanitize(latest.power, 0, 1);
    const avgPower = sanitize(stats.avg_power, currentPower, 1);
    const peakPower = sanitize(stats.peak_power, currentPower, 1);
    const maxEnergy = sanitize(stats.max_energy, 0, 4);
    const minEnergy = sanitize(stats.min_energy, 0, 4);
    const readingCount = parseInt(stats.reading_count || 0, 10);
    const activeSamples = parseInt(stats.active_samples || 0, 10);
    const threshold = sanitize(app.power_threshold_w, 2000, 1);
    const avgPf = sanitize(stats.avg_pf, latest.power_factor || 0.9, 2);

    // Calculate energy consumed
    let energyKwh = maxEnergy - minEnergy;
    if (energyKwh <= 0 && maxEnergy > 0) {
      energyKwh = maxEnergy;
    }
    if (energyKwh <= 0 && avgPower > 0 && readingCount > 0) {
      // Numerical integration fallback: 3 seconds interval
      energyKwh = (avgPower * (readingCount * 3)) / (3600 * 1000);
    }
    energyKwh = sanitize(energyKwh, 0, 4);

    // Calculate estimated daily consumption
    let dailyEnergyKwh = 0;
    if (readingCount > 0) {
      const activeFraction = activeSamples > 0 ? (activeSamples / readingCount) : (currentPower > 5 ? 0.3 : 0.05);
      const estimatedRunHoursPerDay = Math.min(24, Math.max(1, activeFraction * 24));
      dailyEnergyKwh = (avgPower * estimatedRunHoursPerDay) / 1000;
    } else if (currentPower > 0) {
      dailyEnergyKwh = (currentPower * 6) / 1000; // default 6h run
    }
    dailyEnergyKwh = sanitize(dailyEnergyKwh, 0, 3);

    // Projected Monthly (30 Days) and 7-Day Energy
    const projectedMonthlyKwh = sanitize(dailyEnergyKwh * 30, 0, 2);
    const projected7DayKwh = sanitize(dailyEnergyKwh * 7, 0, 2);

    // Cost & Carbon
    const dailyCost = sanitize(dailyEnergyKwh * tariff, 0, 2);
    const monthlyCost = sanitize(projectedMonthlyKwh * tariff, 0, 2);
    const dailyCo2 = sanitize(dailyEnergyKwh * emissionFactor, 0, 3);
    const monthlyCo2 = sanitize(projectedMonthlyKwh * emissionFactor, 0, 2);

    totalMeasuredEnergyKwh += energyKwh;
    totalDailyEnergyKwh += dailyEnergyKwh;
    totalMonthlyProjectedKwh += projectedMonthlyKwh;
    totalCurrentPowerW += currentPower;

    applianceInsights.push({
      channel_id: channelId,
      appliance_name: app.name,
      category: app.category || 'General',
      power_threshold_w: threshold,
      is_active: app.is_active,
      current_power_w: currentPower,
      avg_power_w: avgPower,
      peak_power_w: peakPower,
      avg_power_factor: avgPf,
      measured_energy_kwh: energyKwh,
      daily_energy_kwh: dailyEnergyKwh,
      projected_7day_kwh: projected7DayKwh,
      projected_monthly_kwh: projectedMonthlyKwh,
      daily_cost: dailyCost,
      projected_monthly_cost: monthlyCost,
      daily_co2_kg: dailyCo2,
      projected_monthly_co2_kg: monthlyCo2,
      active_duty_cycle_pct: readingCount > 0 ? sanitize((activeSamples / readingCount) * 100, 0, 1) : 0,
      reading_count: readingCount,
      last_updated: latest.timestamp || new Date().toISOString()
    });
  }

  // 5. Calculate consumption share (%)
  applianceInsights.forEach(app => {
    app.energy_share_pct = totalDailyEnergyKwh > 0 
      ? sanitize((app.daily_energy_kwh / totalDailyEnergyKwh) * 100, 0, 1)
      : (applianceInsights.length > 0 ? sanitize(100 / applianceInsights.length, 0, 1) : 0);
  });

  // 6. Generate Rule-Based Recommendations
  const recommendations = [];
  let recIdCounter = 1;

  for (const app of applianceInsights) {
    const name = app.appliance_name;
    const ch = app.channel_id;
    const share = app.energy_share_pct;
    const avgPower = app.avg_power_w;
    const peakPower = app.peak_power_w;
    const currentPower = app.current_power_w;
    const threshold = app.power_threshold_w;
    const monthlyKwh = app.projected_monthly_kwh;

    // Rule A: HIGH CONSUMPTION DOMINANCE (Accounts for >= 40% of energy)
    if (share >= 40.0 && monthlyKwh > 1.0) {
      const savedKwh = sanitize((avgPower * 1.5 * 30) / 1000, 5, 1);
      const savedCost = sanitize(savedKwh * tariff, 0, 2);
      const savedCo2 = sanitize(savedKwh * emissionFactor, 0, 2);

      recommendations.push({
        id: recIdCounter++,
        channel: ch,
        appliance: name,
        category: 'HIGH_CONSUMPTION',
        title: `High Energy Consumption (${share}% of Total)`,
        severity: share >= 60 ? 'HIGH' : 'MEDIUM',
        priority_score: Math.min(95, Math.round(55 + share * 0.4)),
        description: `${name} is your highest consuming appliance, contributing ${share}% of total household energy. Reducing its daily runtime by 1.5 hours will yield the largest direct bill reduction.`,
        estimated_saving_kwh: savedKwh,
        estimated_saving_cost: savedCost,
        estimated_co2_reduction: savedCo2,
        action_item: `Set thermostat to 24°C or schedule automated off-timers during unoccupied hours.`,
        reason: `${name} accounts for ${share}% of monitored consumption (${app.daily_energy_kwh.toFixed(2)} kWh/day).`,
        generated_at: new Date().toISOString()
      });
    }

    // Rule B: THRESHOLD PROXIMITY WARNING (Operating >= 85% of rated safety threshold)
    if (currentPower >= 0.85 * threshold || peakPower >= 0.95 * threshold) {
      const isCritical = currentPower >= threshold;
      const savedKwh = sanitize((0.2 * peakPower * 1 * 30) / 1000, 4, 1);
      const savedCost = sanitize(savedKwh * tariff, 0, 2);
      const savedCo2 = sanitize(savedKwh * emissionFactor, 0, 2);

      recommendations.push({
        id: recIdCounter++,
        channel: ch,
        appliance: name,
        category: 'SAFETY_THRESHOLD',
        title: isCritical ? `Safety Threshold Exceeded` : `Operating Near Safety Limit (${currentPower}W / ${threshold}W)`,
        severity: isCritical ? 'CRITICAL' : 'HIGH',
        priority_score: isCritical ? 98 : 88,
        description: `${name} is drawing ${currentPower.toFixed(1)}W, which is near or exceeding its configured safety threshold of ${threshold}W. Heavy sustained load may cause circuit heating.`,
        estimated_saving_kwh: savedKwh,
        estimated_saving_cost: savedCost,
        estimated_co2_reduction: savedCo2,
        action_item: `Distribute high-load operations or inspect appliance for mechanical/compressor strain.`,
        reason: `Measured load is within 15% of the ${threshold}W safety limit.`,
        generated_at: new Date().toISOString()
      });
    }

    // Rule C: HIGH PEAK-TO-AVERAGE RATIO (Peak demand spikes > 2x average)
    if (peakPower >= 2.0 * avgPower && peakPower > 300) {
      const savedKwh = sanitize((0.10 * avgPower * 6 * 30) / 1000, 3, 1);
      const savedCost = sanitize(savedKwh * tariff, 0, 2);
      const savedCo2 = sanitize(savedKwh * emissionFactor, 0, 2);

      recommendations.push({
        id: recIdCounter++,
        channel: ch,
        appliance: name,
        category: 'PEAK_DEMAND',
        title: `High Peak Demand Spikes Detected`,
        severity: 'MEDIUM',
        priority_score: 70,
        description: `${name} exhibits peak power demand spikes up to ${peakPower.toFixed(1)}W, which is ${(peakPower / Math.max(1, avgPower)).toFixed(1)}x higher than its average continuous load (${avgPower.toFixed(1)}W).`,
        estimated_saving_kwh: savedKwh,
        estimated_saving_cost: savedCost,
        estimated_co2_reduction: savedCo2,
        action_item: `Ensure clean air filters, unobstructed ventilation, and proper motor lubrication.`,
        reason: `Peak power (${peakPower}W) exceeds double the average continuous power (${avgPower}W).`,
        generated_at: new Date().toISOString()
      });
    }

    // Rule D: EXTENDED RUNTIME (Active duty cycle >= 50%)
    if (app.active_duty_cycle_pct >= 50.0 && monthlyKwh > 2.0) {
      const savedKwh = sanitize(monthlyKwh * 0.15, 4, 1);
      const savedCost = sanitize(savedKwh * tariff, 0, 2);
      const savedCo2 = sanitize(savedKwh * emissionFactor, 0, 2);

      recommendations.push({
        id: recIdCounter++,
        channel: ch,
        appliance: name,
        category: 'EXTENDED_RUNTIME',
        title: `Extended Operating Duty Cycle (${app.active_duty_cycle_pct}%)`,
        severity: 'MEDIUM',
        priority_score: 65,
        description: `${name} has been operating continuously for ${app.active_duty_cycle_pct}% of the sampling window. Shaving 15% off continuous operating hours can noticeably reduce monthly consumption.`,
        estimated_saving_kwh: savedKwh,
        estimated_saving_cost: savedCost,
        estimated_co2_reduction: savedCo2,
        action_item: `Implement automated schedule cut-offs during idle intervals.`,
        reason: `Active duty cycle is ${app.active_duty_cycle_pct}%, indicating long continuous operation.`,
        generated_at: new Date().toISOString()
      });
    }

    // Rule E: LOW POWER FACTOR (Active load with PF < 0.70)
    if (app.avg_power_factor < 0.70 && currentPower > 15.0) {
      const savedKwh = sanitize(monthlyKwh * 0.05, 2, 1);
      const savedCost = sanitize(savedKwh * tariff, 0, 2);
      const savedCo2 = sanitize(savedKwh * emissionFactor, 0, 2);

      recommendations.push({
        id: recIdCounter++,
        channel: ch,
        appliance: name,
        category: 'POWER_FACTOR',
        title: `Reactive Power Loss (PF: ${app.avg_power_factor})`,
        severity: 'LOW',
        priority_score: 48,
        description: `${name} is operating with a low power factor of ${app.avg_power_factor}. Low power factor draws excess apparent current and increases distribution circuit losses.`,
        estimated_saving_kwh: savedKwh,
        estimated_saving_cost: savedCost,
        estimated_co2_reduction: savedCo2,
        action_item: `Consider power factor correction or capacitor inspection for inductive motor loads.`,
        reason: `Power factor is ${app.avg_power_factor} (< 0.70 standard benchmark).`,
        generated_at: new Date().toISOString()
      });
    }

    // Rule F: OPTIMAL / EFFICIENT APPLIANCE
    if (share < 30.0 && app.avg_power_factor >= 0.80) {
      recommendations.push({
        id: recIdCounter++,
        channel: ch,
        appliance: name,
        category: 'EFFICIENT_OPERATION',
        title: `Efficient Baseline Operation`,
        severity: 'LOW',
        priority_score: 30,
        description: `${name} is operating efficiently within expected thermal and electrical bounds, accounting for only ${share}% of measured energy.`,
        estimated_saving_kwh: 0,
        estimated_saving_cost: 0,
        estimated_co2_reduction: 0,
        action_item: `Maintain current usage pattern.`,
        reason: `Appliance operates within rated parameters with low overall energy draw.`,
        generated_at: new Date().toISOString()
      });
    }
  }

  // Sort recommendations by priority_score descending
  recommendations.sort((a, b) => b.priority_score - a.priority_score);

  // Total Potential Savings
  const totalPotentialSavedKwh = sanitize(recommendations.reduce((sum, r) => sum + r.estimated_saving_kwh, 0), 0, 1);
  const totalPotentialSavedCost = sanitize(recommendations.reduce((sum, r) => sum + r.estimated_saving_cost, 0), 0, 2);
  const totalPotentialSavedCo2 = sanitize(recommendations.reduce((sum, r) => sum + r.estimated_co2_reduction, 0), 0, 2);

  // Totals
  const totalMonthlyProjectedCost = sanitize(totalMonthlyProjectedKwh * tariff, 0, 2);
  const totalDailyCo2 = sanitize(totalDailyEnergyKwh * emissionFactor, 0, 3);
  const totalMonthlyProjectedCo2 = sanitize(totalMonthlyProjectedKwh * emissionFactor, 0, 2);

  return {
    summary: {
      total_current_power_w: sanitize(totalCurrentPowerW, 0, 1),
      total_measured_energy_kwh: sanitize(totalMeasuredEnergyKwh, 0, 4),
      total_daily_energy_kwh: sanitize(totalDailyEnergyKwh, 0, 3),
      total_monthly_projected_kwh: sanitize(totalMonthlyProjectedKwh, 0, 2),
      total_daily_cost: sanitize(totalDailyEnergyKwh * tariff, 0, 2),
      total_monthly_projected_cost: totalMonthlyProjectedCost,
      total_daily_co2_kg: totalDailyCo2,
      total_monthly_projected_co2_kg: totalMonthlyProjectedCo2,
      tariff_rate: tariff,
      emission_factor: emissionFactor,
      potential_monthly_savings_kwh: totalPotentialSavedKwh,
      potential_monthly_savings_cost: totalPotentialSavedCost,
      potential_monthly_savings_co2_kg: totalPotentialSavedCo2,
      total_appliances_monitored: applianceInsights.length,
      has_sufficient_data: applianceInsights.some(a => a.reading_count > 0),
      generated_at: new Date().toISOString()
    },
    appliances: applianceInsights,
    recommendations: recommendations
  };
}

/**
 * Phase 4: Compute Appliance Energy Ranking
 */
async function computeApplianceRanking(options = {}) {
  const intelligence = await generateEnergyIntelligence(options);
  const rawAppliances = intelligence.appliances || [];

  // Sort appliances descending by projected monthly energy consumption (or daily energy)
  const sorted = [...rawAppliances].sort((a, b) => b.projected_monthly_kwh - a.projected_monthly_kwh);

  const rankedAppliances = sorted.map((app, index) => {
    let status = 'OPTIMAL';
    if (app.energy_share_pct >= 40.0) {
      status = 'HIGH';
    } else if (app.energy_share_pct >= 15.0) {
      status = 'MODERATE';
    }

    return {
      rank: index + 1,
      channel_id: app.channel_id,
      appliance: app.appliance_name,
      category: app.category,
      current_power_w: app.current_power_w,
      daily_kwh: app.daily_energy_kwh,
      monthly_kwh: app.projected_monthly_kwh,
      monthly_cost: app.projected_monthly_cost,
      contribution_percent: app.energy_share_pct,
      monthly_co2_kg: app.projected_monthly_co2_kg,
      power_threshold_w: app.power_threshold_w,
      status: status
    };
  });

  const highestConsuming = rankedAppliances.length > 0 ? rankedAppliances[0] : null;

  return {
    status: 'success',
    count: rankedAppliances.length,
    appliances: rankedAppliances,
    highest_consuming_appliance: highestConsuming ? highestConsuming.appliance : 'None',
    highest_consuming_channel: highestConsuming ? highestConsuming.channel_id : null,
    highest_consuming_share_pct: highestConsuming ? highestConsuming.contribution_percent : 0,
    total_monthly_kwh: intelligence.summary.total_monthly_projected_kwh,
    total_monthly_cost: intelligence.summary.total_monthly_projected_cost,
    total_monthly_co2_kg: intelligence.summary.total_monthly_projected_co2_kg,
    generated_at: intelligence.summary.generated_at
  };
}

/**
 * Phase 4: What-If Savings Simulator
 */
async function simulateSavings(params = {}) {
  const tariff = sanitize(params.tariff, DEFAULT_TARIFF, 2);
  const emissionFactor = sanitize(params.emissionFactor, DEFAULT_GRID_EMISSION_FACTOR, 3);
  const requestedAppliance = (params.appliance || '').trim();
  const requestedChannel = params.channel ? parseInt(params.channel, 10) : null;

  // Validate hours inputs explicitly
  if (params.hoursSavedPerDay !== undefined && params.hoursSavedPerDay !== null) {
    const rawH = parseFloat(params.hoursSavedPerDay);
    if (isNaN(rawH) || rawH < 0 || rawH > 24) {
      throw new Error('Field "hours_saved_per_day" must be a positive number between 0 and 24 hours.');
    }
  }
  if (params.dailyHours !== undefined && params.dailyHours !== null) {
    const rawDH = parseFloat(params.dailyHours);
    if (isNaN(rawDH) || rawDH <= 0 || rawDH > 24) {
      throw new Error('Field "daily_hours" must be a number between 1 and 24 hours.');
    }
  }

  const hoursSavedPerDay = sanitize(params.hoursSavedPerDay, 1.5, 2);
  const dailyHours = sanitize(params.dailyHours, 8.0, 1);

  // Fetch all appliances
  const intelligence = await generateEnergyIntelligence({ tariff, emissionFactor });
  const appliances = intelligence.appliances || [];

  if (appliances.length === 0) {
    throw new Error('No appliances configured for savings simulation.');
  }

  // Find target appliance by channel or name
  let targetApp = null;
  if (requestedChannel) {
    targetApp = appliances.find(a => a.channel_id === requestedChannel);
  } else if (requestedAppliance) {
    targetApp = appliances.find(a => a.appliance_name.toLowerCase() === requestedAppliance.toLowerCase())
      || appliances.find(a => a.appliance_name.toLowerCase().includes(requestedAppliance.toLowerCase()));
  }

  // Fallback to highest consuming appliance if not specified
  if (!targetApp) {
    const sorted = [...appliances].sort((a, b) => b.projected_monthly_kwh - a.projected_monthly_kwh);
    targetApp = sorted[0];
  }

  // Determine effective operating power (Watts)
  const operatingPowerW = targetApp.avg_power_w > 10 
    ? targetApp.avg_power_w 
    : (targetApp.current_power_w > 10 ? targetApp.current_power_w : (targetApp.power_threshold_w * 0.5));

  // Calculations
  const effectiveHoursSaved = Math.min(hoursSavedPerDay, dailyHours);
  const monthlyEnergySavedKwh = sanitize((operatingPowerW * effectiveHoursSaved * 30) / 1000, 0, 2);
  const monthlyCostSaved = sanitize(monthlyEnergySavedKwh * tariff, 0, 2);
  const annualCostSaved = sanitize(monthlyCostSaved * 12, 0, 2);
  const monthlyCo2ReductionKg = sanitize(monthlyEnergySavedKwh * emissionFactor, 0, 2);
  const annualCo2ReductionKg = sanitize(monthlyCo2ReductionKg * 12, 0, 2);
  const percentageReduction = sanitize((effectiveHoursSaved / dailyHours) * 100, 0, 1);
  const treesEquivalentYearly = sanitize(annualCo2ReductionKg / 21.77, 0, 1);

  return {
    status: 'success',
    simulation_inputs: {
      appliance_name: targetApp.appliance_name,
      channel_id: targetApp.channel_id,
      category: targetApp.category,
      operating_power_w: sanitize(operatingPowerW, 0, 1),
      daily_hours: dailyHours,
      hours_saved_per_day: effectiveHoursSaved,
      tariff_rate: tariff,
      emission_factor: emissionFactor
    },
    savings_projection: {
      monthly_energy_saved_kwh: monthlyEnergySavedKwh,
      monthly_money_saved: monthlyCostSaved,
      annual_money_saved: annualCostSaved,
      monthly_co2_reduction_kg: monthlyCo2ReductionKg,
      annual_co2_reduction_kg: annualCo2ReductionKg,
      appliance_reduction_pct: percentageReduction,
      trees_offset_equivalent_yearly: treesEquivalentYearly
    },
    summary_sentence: `Reducing ${targetApp.appliance_name} usage by ${effectiveHoursSaved} hr/day saves ${monthlyEnergySavedKwh} kWh/month, cutting your electricity bill by ₹${monthlyCostSaved}/month (₹${annualCostSaved}/year) and eliminating ${monthlyCo2ReductionKg} kg of CO₂ emissions.`,
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  generateEnergyIntelligence,
  computeApplianceRanking,
  simulateSavings,
  DEFAULT_GRID_EMISSION_FACTOR,
  DEFAULT_TARIFF
};
