const db = require('../db/database');
const { generateEnergyIntelligence, DEFAULT_TARIFF, DEFAULT_GRID_EMISSION_FACTOR } = require('./energyRecommendationService');
const { generateEnergyForecast } = require('./energyForecastingService');

/**
 * Helper to sanitize numbers
 */
function sanitize(val, fallback = 0, decimals = 2) {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return fallback;
  }
  const num = Math.max(0, parseFloat(val));
  return parseFloat(num.toFixed(decimals));
}

/**
 * Fetch the currently configured monthly electricity budget
 */
async function getMonthlyBudget() {
  let row = await db.getAsync('SELECT * FROM energy_budgets WHERE id = 1');
  if (!row) {
    await db.runAsync(
      'INSERT INTO energy_budgets (id, monthly_budget_inr, currency, alert_threshold_pct) VALUES (1, 500.0, "INR", 90.0)'
    );
    row = { id: 1, monthly_budget_inr: 500.0, currency: 'INR', alert_threshold_pct: 90.0, updated_at: new Date().toISOString() };
  }
  return {
    id: row.id,
    monthly_budget_inr: sanitize(row.monthly_budget_inr, 500.0, 2),
    currency: row.currency || 'INR',
    alert_threshold_pct: sanitize(row.alert_threshold_pct, 90.0, 1),
    updated_at: row.updated_at
  };
}

/**
 * Update the user's monthly budget in SQLite
 */
async function updateMonthlyBudget(budgetInr, thresholdPct = 90.0) {
  const budgetNum = parseFloat(budgetInr);
  if (isNaN(budgetNum) || budgetNum <= 0) {
    throw new Error('Monthly budget must be a positive numeric value greater than zero (INR).');
  }

  const thresholdNum = parseFloat(thresholdPct);
  const safeThreshold = (!isNaN(thresholdNum) && thresholdNum > 0 && thresholdNum <= 100) ? thresholdNum : 90.0;

  const now = new Date().toISOString();
  await db.runAsync(`
    INSERT INTO energy_budgets (id, monthly_budget_inr, currency, alert_threshold_pct, updated_at)
    VALUES (1, ?, 'INR', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      monthly_budget_inr = excluded.monthly_budget_inr,
      alert_threshold_pct = excluded.alert_threshold_pct,
      updated_at = excluded.updated_at
  `, [sanitize(budgetNum, 500.0, 2), safeThreshold, now]);

  return await getMonthlyBudget();
}

/**
 * Calculate complete Smart Energy Budget & Goal progress and intelligent optimization plan
 */
async function calculateBudgetStatus(options = {}) {
  const tariff = sanitize(options.tariff, DEFAULT_TARIFF, 2);
  const emissionFactor = sanitize(options.emissionFactor, DEFAULT_GRID_EMISSION_FACTOR, 3);

  // 1. Get current stored budget
  const budgetConfig = await getMonthlyBudget();
  const monthlyBudget = budgetConfig.monthly_budget_inr;

  // 2. Fetch current telemetry intelligence & 30-day forecast
  const [intelligence, forecast] = await Promise.all([
    generateEnergyIntelligence({ tariff, emissionFactor }),
    generateEnergyForecast({ tariff, emissionFactor })
  ]);

  const appliances = intelligence.appliances || [];
  const currentKwh = intelligence.summary.total_cumulative_energy_kwh || 0;
  const currentSpendingInr = sanitize(currentKwh * tariff, 0, 2);

  const predictedMonthEndKwh = forecast.forecast_30day?.total_energy_kwh || intelligence.summary.projected_30day_kwh || 1.0;
  const predictedMonthEndBillInr = sanitize(
    forecast.forecast_30day?.total_cost || (predictedMonthEndKwh * tariff),
    0,
    2
  );

  // 3. Status Classification
  // UNDER_BUDGET: <= 90% of budget
  // NEAR_BUDGET: 90% - 105% of budget
  // OVER_BUDGET: > 105% of budget
  const utilizationRatio = monthlyBudget > 0 ? (predictedMonthEndBillInr / monthlyBudget) * 100 : 100;
  let status = 'UNDER_BUDGET';
  let statusLabel = 'Under Budget';
  let statusColor = '#10b981'; // Green

  if (utilizationRatio > 105) {
    status = 'OVER_BUDGET';
    statusLabel = 'Over Budget';
    statusColor = '#f43f5e'; // Red
  } else if (utilizationRatio >= budgetConfig.alert_threshold_pct) {
    status = 'NEAR_BUDGET';
    statusLabel = 'Near Budget Limit';
    statusColor = '#f59e0b'; // Amber
  }

  // 4. Budget Differences & Progress
  const isOver = predictedMonthEndBillInr > monthlyBudget;
  const excessAmountInr = isOver ? sanitize(predictedMonthEndBillInr - monthlyBudget, 0, 2) : 0;
  const remainingBudgetInr = !isOver ? sanitize(monthlyBudget - predictedMonthEndBillInr, 0, 2) : 0;
  const currentProgressPct = monthlyBudget > 0 ? sanitize((currentSpendingInr / monthlyBudget) * 100, 0, 1) : 0;
  const forecastedUtilizationPct = monthlyBudget > 0 ? sanitize(utilizationRatio, 0, 1) : 0;

  // 5. Required Energy Reduction Calculation
  const requiredMonthlySavingsKwh = excessAmountInr > 0 ? sanitize(excessAmountInr / tariff, 0, 3) : 0;
  const requiredDailySavingsKwh = excessAmountInr > 0 ? sanitize(requiredMonthlySavingsKwh / 30, 0, 3) : 0;

  // 6. Intelligent Appliance Optimization
  let optimizationAdvice = null;
  const topAppliance = appliances.length > 0 ? appliances[0] : null;

  if (topAppliance && excessAmountInr > 0) {
    const avgPowerKw = (topAppliance.avg_power_w || topAppliance.current_power_w || 1000) / 1000;
    // Hours needed = daily kWh savings needed / power in kW
    let hoursPerDayNeeded = avgPowerKw > 0 ? (requiredDailySavingsKwh / avgPowerKw) : 1.0;
    hoursPerDayNeeded = Math.min(8.0, Math.max(0.25, sanitize(hoursPerDayNeeded, 1.0, 1)));

    const potentialSavedMoney = sanitize(hoursPerDayNeeded * avgPowerKw * 30 * tariff, 0, 2);
    const potentialSavedCo2 = sanitize(hoursPerDayNeeded * avgPowerKw * 30 * emissionFactor, 0, 2);

    optimizationAdvice = {
      target_appliance: topAppliance.appliance_name,
      channel_id: topAppliance.channel_id,
      category: topAppliance.category,
      suggested_daily_reduction_hours: hoursPerDayNeeded,
      potential_monthly_savings_inr: potentialSavedMoney,
      potential_monthly_co2_reduction_kg: potentialSavedCo2,
      recommendation_text: `Your predicted bill of ₹${predictedMonthEndBillInr.toFixed(2)} exceeds your ₹${monthlyBudget.toFixed(2)} budget by ₹${excessAmountInr.toFixed(2)}. Reducing ${topAppliance.appliance_name} runtime by approx. ${hoursPerDayNeeded} hrs/day will save ₹${potentialSavedMoney.toFixed(2)}/month and bring you back under budget.`
    };
  } else if (topAppliance) {
    optimizationAdvice = {
      target_appliance: topAppliance.appliance_name,
      channel_id: topAppliance.channel_id,
      category: topAppliance.category,
      suggested_daily_reduction_hours: 0,
      potential_monthly_savings_inr: 0,
      potential_monthly_co2_reduction_kg: 0,
      recommendation_text: `Great job! Your predicted monthly bill of ₹${predictedMonthEndBillInr.toFixed(2)} is well within your ₹${monthlyBudget.toFixed(2)} budget with ₹${remainingBudgetInr.toFixed(2)} cushion remaining.`
    };
  }

  return {
    status: 'success',
    budget_summary: {
      monthly_budget_inr: monthlyBudget,
      currency: budgetConfig.currency,
      tariff_rate: tariff,
      current_spending_inr: currentSpendingInr,
      current_consumed_kwh: sanitize(currentKwh, 0, 3),
      predicted_monthend_kwh: sanitize(predictedMonthEndKwh, 0, 3),
      predicted_monthend_bill_inr: predictedMonthEndBillInr,
      remaining_budget_inr: remainingBudgetInr,
      expected_excess_inr: excessAmountInr,
      current_progress_pct: currentProgressPct,
      forecasted_utilization_pct: forecastedUtilizationPct,
      budget_status: status,
      budget_status_label: statusLabel,
      budget_status_color: statusColor
    },
    required_reduction: {
      has_excess: isOver,
      monthly_savings_kwh_needed: requiredMonthlySavingsKwh,
      daily_savings_kwh_needed: requiredDailySavingsKwh,
      monthly_savings_inr_needed: excessAmountInr
    },
    appliance_optimization: optimizationAdvice,
    updated_at: budgetConfig.updated_at,
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  getMonthlyBudget,
  updateMonthlyBudget,
  calculateBudgetStatus
};
