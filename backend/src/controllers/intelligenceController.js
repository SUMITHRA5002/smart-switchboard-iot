const { 
  generateEnergyIntelligence, 
  computeApplianceRanking, 
  simulateSavings 
} = require('../services/energyRecommendationService');
const { processAssistantQuery } = require('../services/energyAssistantService');
const { generateEnergyForecast } = require('../services/energyForecastingService');
const { 
  getMonthlyBudget, 
  updateMonthlyBudget, 
  calculateBudgetStatus 
} = require('../services/energyBudgetService');
const { analyzeApplianceBehaviour } = require('../services/applianceBehaviourService');

/**
 * Controller: getRecommendations
 * GET /api/recommendations
 * GET /api/recommendations/:channel
 */
exports.getRecommendations = async (req, res) => {
  try {
    const tariff = req.query.tariff;
    const emissionFactor = req.query.emission_factor;
    const channel = req.params.channel || req.query.channel;

    const intelligence = await generateEnergyIntelligence({
      tariff,
      emissionFactor,
      channel
    });

    let filteredRecs = intelligence.recommendations;
    if (channel) {
      filteredRecs = filteredRecs.filter(r => String(r.channel) === String(channel));
    }

    return res.status(200).json({
      status: 'success',
      count: filteredRecs.length,
      potential_monthly_savings: {
        kwh: intelligence.summary.potential_monthly_savings_kwh,
        cost: intelligence.summary.potential_monthly_savings_cost,
        co2_kg: intelligence.summary.potential_monthly_savings_co2_kg
      },
      recommendations: filteredRecs,
      generated_at: intelligence.summary.generated_at
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to generate energy recommendations',
      error: error.message
    });
  }
};

/**
 * Controller: getEnergyInsights
 * GET /api/energy-insights
 */
exports.getEnergyInsights = async (req, res) => {
  try {
    const tariff = req.query.tariff;
    const emissionFactor = req.query.emission_factor;

    const intelligence = await generateEnergyIntelligence({
      tariff,
      emissionFactor
    });

    return res.status(200).json({
      status: 'success',
      data: intelligence
    });
  } catch (error) {
    console.error('Error generating energy insights:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to generate energy insights',
      error: error.message
    });
  }
};

/**
 * Controller: getCarbonFootprint
 * GET /api/carbon-footprint
 * GET /api/carbon-footprint/:channel
 */
exports.getCarbonFootprint = async (req, res) => {
  try {
    const tariff = req.query.tariff;
    const emissionFactor = req.query.emission_factor;
    const channel = req.params.channel || req.query.channel;

    const intelligence = await generateEnergyIntelligence({
      tariff,
      emissionFactor,
      channel
    });

    let appliances = intelligence.appliances;
    if (channel) {
      appliances = appliances.filter(a => String(a.channel_id) === String(channel));
    }

    const totalDailyCo2 = appliances.reduce((sum, a) => sum + a.daily_co2_kg, 0);
    const totalMonthlyCo2 = appliances.reduce((sum, a) => sum + a.projected_monthly_co2_kg, 0);

    return res.status(200).json({
      status: 'success',
      emission_factor_kg_per_kwh: intelligence.summary.emission_factor,
      total_daily_co2_kg: parseFloat(totalDailyCo2.toFixed(3)),
      total_monthly_projected_co2_kg: parseFloat(totalMonthlyCo2.toFixed(2)),
      potential_monthly_co2_reduction_kg: intelligence.summary.potential_monthly_savings_co2_kg,
      appliance_contributions: appliances.map(a => ({
        channel_id: a.channel_id,
        appliance_name: a.appliance_name,
        category: a.category,
        daily_co2_kg: a.daily_co2_kg,
        projected_monthly_co2_kg: a.projected_monthly_co2_kg,
        energy_share_pct: a.energy_share_pct
      })),
      generated_at: intelligence.summary.generated_at
    });
  } catch (error) {
    console.error('Error calculating carbon footprint:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to calculate carbon footprint',
      error: error.message
    });
  }
};

/**
 * Controller: getEnergyProjection
 * GET /api/energy-projection
 * GET /api/energy-projection/:channel
 */
exports.getEnergyProjection = async (req, res) => {
  try {
    const tariff = req.query.tariff;
    const emissionFactor = req.query.emission_factor;
    const channel = req.params.channel || req.query.channel;

    const intelligence = await generateEnergyIntelligence({
      tariff,
      emissionFactor,
      channel
    });

    let appliances = intelligence.appliances;
    if (channel) {
      appliances = appliances.filter(a => String(a.channel_id) === String(channel));
    }

    const totalTodayKwh = appliances.reduce((sum, a) => sum + a.daily_energy_kwh, 0);
    const total7DayKwh = appliances.reduce((sum, a) => sum + a.projected_7day_kwh, 0);
    const total30DayKwh = appliances.reduce((sum, a) => sum + a.projected_monthly_kwh, 0);
    const totalMonthlyCost = appliances.reduce((sum, a) => sum + a.projected_monthly_cost, 0);

    return res.status(200).json({
      status: 'success',
      tariff_rate: intelligence.summary.tariff_rate,
      has_sufficient_data: intelligence.summary.has_sufficient_data,
      projection_summary: {
        today_consumption_kwh: parseFloat(totalTodayKwh.toFixed(3)),
        projected_7day_kwh: parseFloat(total7DayKwh.toFixed(2)),
        projected_30day_kwh: parseFloat(total30DayKwh.toFixed(2)),
        projected_monthly_cost: parseFloat(totalMonthlyCost.toFixed(2))
      },
      appliance_projections: appliances.map(a => ({
        channel_id: a.channel_id,
        appliance_name: a.appliance_name,
        category: a.category,
        current_power_w: a.current_power_w,
        avg_power_w: a.avg_power_w,
        peak_power_w: a.peak_power_w,
        daily_energy_kwh: a.daily_energy_kwh,
        projected_7day_kwh: a.projected_7day_kwh,
        projected_monthly_kwh: a.projected_monthly_kwh,
        projected_monthly_cost: a.projected_monthly_cost,
        energy_share_pct: a.energy_share_pct
      })),
      generated_at: intelligence.summary.generated_at
    });
  } catch (error) {
    console.error('Error calculating energy projections:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to calculate energy projections',
      error: error.message
    });
  }
};

/**
 * Controller: getApplianceRanking (Phase 4)
 * GET /api/appliance-ranking
 */
exports.getApplianceRanking = async (req, res) => {
  try {
    const tariff = req.query.tariff;
    const emissionFactor = req.query.emission_factor;

    const ranking = await computeApplianceRanking({
      tariff,
      emissionFactor
    });

    return res.status(200).json(ranking);
  } catch (error) {
    console.error('Error computing appliance ranking:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to compute appliance ranking',
      error: error.message
    });
  }
};

/**
 * Controller: getSavingsSimulator (Phase 4)
 * GET /api/savings-simulator
 */
exports.getSavingsSimulator = async (req, res) => {
  try {
    const { 
      appliance, 
      channel, 
      hours_saved_per_day, 
      daily_hours, 
      tariff, 
      emission_factor 
    } = req.query;

    const simulation = await simulateSavings({
      appliance,
      channel,
      hoursSavedPerDay: hours_saved_per_day !== undefined ? parseFloat(hours_saved_per_day) : 1.5,
      dailyHours: daily_hours !== undefined ? parseFloat(daily_hours) : 8.0,
      tariff: tariff !== undefined ? parseFloat(tariff) : undefined,
      emissionFactor: emission_factor !== undefined ? parseFloat(emission_factor) : undefined
    });

    return res.status(200).json(simulation);
  } catch (error) {
    console.error('Error running savings simulation:', error);
    return res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to simulate savings'
    });
  }
};

/**
 * Controller: postEnergyAssistant (Phase 5)
 * POST /api/energy-assistant
 */
exports.postEnergyAssistant = async (req, res) => {
  try {
    const message = req.body.message || '';
    const tariff = req.body.tariff !== undefined ? parseFloat(req.body.tariff) : (req.query.tariff !== undefined ? parseFloat(req.query.tariff) : undefined);
    const emissionFactor = req.body.emission_factor !== undefined ? parseFloat(req.body.emission_factor) : (req.query.emission_factor !== undefined ? parseFloat(req.query.emission_factor) : undefined);

    const result = await processAssistantQuery({
      message,
      tariff,
      emissionFactor
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in energy assistant controller:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process energy assistant query',
      message: error.message
    });
  }
};

/**
 * Controller: getForecast (Phase 6)
 * GET /api/forecast
 */
exports.getForecast = async (req, res) => {
  try {
    const tariff = req.query.tariff;
    const emissionFactor = req.query.emission_factor;

    const forecast = await generateEnergyForecast({
      tariff,
      emissionFactor
    });

    return res.status(200).json(forecast);
  } catch (error) {
    console.error('Error in energy forecasting controller:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to generate energy forecast',
      error: error.message
    });
  }
};

/**
 * Controller: get7DayForecast (Phase 6)
 * GET /api/forecast/7day
 */
exports.get7DayForecast = async (req, res) => {
  try {
    const tariff = req.query.tariff;
    const emissionFactor = req.query.emission_factor;

    const forecast = await generateEnergyForecast({
      tariff,
      emissionFactor
    });

    return res.status(200).json({
      status: 'success',
      confidence_level: forecast.confidence_level,
      confidence_score: forecast.confidence_score,
      trend: forecast.trend,
      forecast_7day: forecast.forecast_7day,
      disclaimer: forecast.disclaimer,
      generated_at: forecast.generated_at
    });
  } catch (error) {
    console.error('Error in 7-day forecast:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch 7-day forecast',
      error: error.message
    });
  }
};

/**
 * Controller: get30DayForecast (Phase 6)
 * GET /api/forecast/30day
 */
exports.get30DayForecast = async (req, res) => {
  try {
    const tariff = req.query.tariff;
    const emissionFactor = req.query.emission_factor;

    const forecast = await generateEnergyForecast({
      tariff,
      emissionFactor
    });

    return res.status(200).json({
      status: 'success',
      confidence_level: forecast.confidence_level,
      confidence_score: forecast.confidence_score,
      trend: forecast.trend,
      forecast_30day: forecast.forecast_30day,
      appliance_forecasts: forecast.appliance_forecasts,
      disclaimer: forecast.disclaimer,
      generated_at: forecast.generated_at
    });
  } catch (error) {
    console.error('Error in 30-day forecast:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch 30-day forecast',
      error: error.message
    });
  }
};

/**
 * Controller: getForecastVsActual (Phase 6)
 * GET /api/forecast/vs-actual
 */
exports.getForecastVsActual = async (req, res) => {
  try {
    const tariff = req.query.tariff;
    const emissionFactor = req.query.emission_factor;

    const forecast = await generateEnergyForecast({
      tariff,
      emissionFactor
    });

    return res.status(200).json({
      status: 'success',
      forecast_vs_actual: forecast.forecast_vs_actual,
      historical_days_analyzed: forecast.historical_days_analyzed,
      confidence_score: forecast.confidence_score,
      generated_at: forecast.generated_at
    });
  } catch (error) {
    console.error('Error in forecast vs actual tracking:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to evaluate forecast vs actual',
      error: error.message
    });
  }
};

/**
 * Controller: getEnergyBudget (Phase 7)
 * GET /api/energy-budget
 */
exports.getEnergyBudget = async (req, res) => {
  try {
    const tariff = req.query.tariff;
    const emissionFactor = req.query.emission_factor;

    const statusData = await calculateBudgetStatus({ tariff, emissionFactor });
    return res.status(200).json(statusData);
  } catch (error) {
    console.error('Error in getEnergyBudget:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve energy budget',
      error: error.message
    });
  }
};

/**
 * Controller: updateEnergyBudget (Phase 7)
 * PUT /api/energy-budget
 */
exports.updateEnergyBudget = async (req, res) => {
  try {
    const { monthly_budget_inr, alert_threshold_pct } = req.body;

    if (monthly_budget_inr === undefined || monthly_budget_inr === null) {
      return res.status(400).json({
        status: 'error',
        message: 'monthly_budget_inr is required'
      });
    }

    const budgetVal = parseFloat(monthly_budget_inr);
    if (isNaN(budgetVal) || budgetVal <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Monthly budget must be a positive numeric number greater than 0'
      });
    }

    const updated = await updateMonthlyBudget(budgetVal, alert_threshold_pct);
    const tariff = req.query.tariff || req.body.tariff;
    const emissionFactor = req.query.emission_factor || req.body.emission_factor;
    const statusData = await calculateBudgetStatus({ tariff, emissionFactor });

    return res.status(200).json({
      status: 'success',
      message: `Monthly energy budget successfully updated to ₹${budgetVal.toFixed(2)}`,
      data: statusData
    });
  } catch (error) {
    console.error('Error updating energy budget:', error);
    return res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update energy budget'
    });
  }
};

/**
 * Controller: getEnergyBudgetStatus (Phase 7)
 * GET /api/energy-budget/status
 */
exports.getEnergyBudgetStatus = async (req, res) => {
  try {
    const tariff = req.query.tariff;
    const emissionFactor = req.query.emission_factor;

    const statusData = await calculateBudgetStatus({ tariff, emissionFactor });
    return res.status(200).json({
      status: 'success',
      budget_status: statusData.budget_summary.budget_status,
      budget_status_label: statusData.budget_summary.budget_status_label,
      current_spending_inr: statusData.budget_summary.current_spending_inr,
      predicted_monthend_bill_inr: statusData.budget_summary.predicted_monthend_bill_inr,
      monthly_budget_inr: statusData.budget_summary.monthly_budget_inr,
      current_progress_pct: statusData.budget_summary.current_progress_pct,
      forecasted_utilization_pct: statusData.budget_summary.forecasted_utilization_pct,
      remaining_budget_inr: statusData.budget_summary.remaining_budget_inr,
      expected_excess_inr: statusData.budget_summary.expected_excess_inr,
      appliance_optimization: statusData.appliance_optimization,
      generated_at: statusData.generated_at
    });
  } catch (error) {
    console.error('Error in getEnergyBudgetStatus:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve energy budget status',
      error: error.message
    });
  }
};

/**
 * Controller: getApplianceBehaviourDeviation (Phase 8)
 * GET /api/behaviour-deviation
 * GET /api/behaviour-deviation/:channel
 */
exports.getApplianceBehaviourDeviation = async (req, res) => {
  try {
    const channel = req.params.channel || req.query.channel;
    const appliance = req.query.appliance;

    const result = await analyzeApplianceBehaviour({
      channel,
      appliance
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error analyzing appliance behaviour deviation:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to analyze appliance behaviour deviation',
      error: error.message
    });
  }
};
