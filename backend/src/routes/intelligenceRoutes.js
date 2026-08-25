const express = require('express');
const router = express.Router();
const {
  getRecommendations,
  getEnergyInsights,
  getCarbonFootprint,
  getEnergyProjection,
  getApplianceRanking,
  getSavingsSimulator,
  postEnergyAssistant,
  getForecast,
  get7DayForecast,
  get30DayForecast,
  getForecastVsActual,
  getEnergyBudget,
  updateEnergyBudget,
  getEnergyBudgetStatus,
  getApplianceBehaviourDeviation
} = require('../controllers/intelligenceController');

// GET /api/recommendations & /api/recommendations/:channel
router.get('/recommendations', getRecommendations);
router.get('/recommendations/:channel', getRecommendations);

// GET /api/energy-insights
router.get('/energy-insights', getEnergyInsights);

// GET /api/carbon-footprint & /api/carbon-footprint/:channel
router.get('/carbon-footprint', getCarbonFootprint);
router.get('/carbon-footprint/:channel', getCarbonFootprint);

// GET /api/energy-projection & /api/energy-projection/:channel
router.get('/energy-projection', getEnergyProjection);
router.get('/energy-projection/:channel', getEnergyProjection);

// Phase 4: Appliance Energy Ranking
// GET /api/appliance-ranking
router.get('/appliance-ranking', getApplianceRanking);

// Phase 4: What-If Savings Simulator
// GET /api/savings-simulator
router.get('/savings-simulator', getSavingsSimulator);

// Phase 5: AI-Powered Energy Assistant
// POST /api/energy-assistant
router.post('/energy-assistant', postEnergyAssistant);

// Phase 6: Intelligent Energy Consumption Forecasting
// GET /api/forecast
router.get('/forecast', getForecast);

// GET /api/forecast/7day
router.get('/forecast/7day', get7DayForecast);

// GET /api/forecast/30day
router.get('/forecast/30day', get30DayForecast);

// GET /api/forecast/vs-actual
router.get('/forecast/vs-actual', getForecastVsActual);

// Phase 7: Smart Energy Budget & Goal System
// GET /api/energy-budget
router.get('/energy-budget', getEnergyBudget);

// PUT /api/energy-budget
router.put('/energy-budget', updateEnergyBudget);

// GET /api/energy-budget/status
router.get('/energy-budget/status', getEnergyBudgetStatus);

// Phase 8: Context-Aware Appliance Behaviour Deviation Detection
// GET /api/behaviour-deviation & GET /api/behaviour-deviation/:channel
router.get('/behaviour-deviation', getApplianceBehaviourDeviation);
router.get('/behaviour-deviation/:channel', getApplianceBehaviourDeviation);

module.exports = router;
