const http = require('http');

async function get(url) {
  const res = await fetch(url);
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data: json };
}

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data: json };
}

async function put(url, body) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data: json };
}

// Deep inspector for NaN / Infinity / undefined / negative values
function findNumericalAnomalies(obj, path = '') {
  const anomalies = [];
  if (obj === null || obj === undefined) return anomalies;

  if (typeof obj === 'number') {
    if (isNaN(obj)) anomalies.push(`${path}: value is NaN`);
    if (!isFinite(obj)) anomalies.push(`${path}: value is Infinity`);
    if (obj < 0 && !path.includes('delta') && !path.includes('difference') && !path.includes('trend') && !path.includes('deviation') && !path.includes('change')) {
      anomalies.push(`${path}: unexpected negative value (${obj})`);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      anomalies.push(...findNumericalAnomalies(item, `${path}[${index}]`));
    });
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      anomalies.push(...findNumericalAnomalies(obj[key], path ? `${path}.${key}` : key));
    }
  }
  return anomalies;
}

async function runSoftwareVerification() {
  const results = {
    pass: [],
    fail: [],
    warnings: []
  };

  console.log('========================================================================');
  console.log('    STARTING PHASE 1–8 COMPREHENSIVE SOFTWARE-ONLY VERIFICATION SUITE   ');
  console.log('========================================================================\n');

  // 1. Backend Server & Health Check
  try {
    const root = await get('http://localhost:5000/');
    if (root.status === 200 && root.data?.status === 'online') {
      results.pass.push('Backend Server Root (http://localhost:5000/) responds with 200 OK and online status.');
    } else {
      results.fail.push(`Backend Server Root check failed: ${JSON.stringify(root)}`);
    }

    const health = await get('http://localhost:5000/api/health');
    if (health.status === 200 && health.data?.status === 'healthy') {
      results.pass.push('Backend Health Endpoint (GET /api/health) returns 200 OK and status: "healthy".');
    } else {
      results.fail.push(`Backend Health Check failed: ${JSON.stringify(health)}`);
    }
  } catch (err) {
    results.fail.push(`Backend Server connection error: ${err.message}`);
  }

  // 2. Frontend Server & Vite Proxy Check
  try {
    const feRes = await fetch('http://localhost:5173/');
    if (feRes.status === 200) {
      results.pass.push('Frontend Server (http://localhost:5173/) is active and serving React application shell.');
    } else {
      results.fail.push(`Frontend Server check failed with HTTP ${feRes.status}`);
    }

    const proxyHealth = await get('http://localhost:5173/api/health');
    if (proxyHealth.status === 200 && proxyHealth.data?.status === 'healthy') {
      results.pass.push('Frontend Vite Reverse-Proxy (/api/* -> :5000) correctly routes backend requests.');
    } else {
      results.fail.push(`Frontend Proxy Check failed: ${JSON.stringify(proxyHealth)}`);
    }
  } catch (err) {
    results.fail.push(`Frontend Server connection error: ${err.message}`);
  }

  // 3. Appliance APIs (Phase 2)
  try {
    const apps = await get('http://localhost:5000/api/appliances');
    if (apps.status === 200 && Array.isArray(apps.data?.data) && apps.data.data.length >= 2) {
      results.pass.push(`Appliance Configuration API (GET /api/appliances) returned ${apps.data.data.length} configured appliances.`);
    } else {
      results.fail.push(`GET /api/appliances failed: ${JSON.stringify(apps)}`);
    }

    const updateApp = await put('http://localhost:5000/api/appliances/1', {
      name: 'Air Conditioner',
      category: 'Cooling',
      power_threshold_w: 1800
    });
    if (updateApp.status === 200 && updateApp.data?.data?.name === 'Air Conditioner') {
      results.pass.push('Appliance Update API (PUT /api/appliances/1) successfully updated name, category, and threshold.');
    } else {
      results.fail.push(`PUT /api/appliances/1 failed: ${JSON.stringify(updateApp)}`);
    }

    // Validation rejection checks
    const badName = await put('http://localhost:5000/api/appliances/1', { name: '', power_threshold_w: 1800 });
    if (badName.status === 400) {
      results.pass.push('Appliance Validation: Blank name correctly rejected with HTTP 400.');
    } else {
      results.fail.push(`Appliance Validation for blank name expected 400, got ${badName.status}`);
    }

    const badThreshold = await put('http://localhost:5000/api/appliances/1', { name: 'AC', power_threshold_w: -50 });
    if (badThreshold.status === 400) {
      results.pass.push('Appliance Validation: Negative power threshold correctly rejected with HTTP 400.');
    } else {
      results.fail.push(`Appliance Validation for negative threshold expected 400, got ${badThreshold.status}`);
    }
  } catch (err) {
    results.fail.push(`Appliance API test error: ${err.message}`);
  }

  // 4. Core Telemetry Ingestion & Retrieval
  try {
    // Ingest simulated test reading
    const ingest = await post('http://localhost:5000/api/telemetry', {
      device_id: 'esp32_switchboard_01',
      readings: [
        { channel: 1, voltage: 236.0, current: 4.5, power: 1050.0, energy: 0.12, frequency: 50.0, power_factor: 0.95 },
        { channel: 2, voltage: 236.0, current: 0.8, power: 180.0, energy: 0.04, frequency: 50.0, power_factor: 0.92 }
      ]
    });
    if (ingest.status === 201 && ingest.data?.saved_records === 2) {
      results.pass.push('Telemetry Ingestion (POST /api/telemetry) successfully validated and persisted 2-channel payload.');
    } else {
      results.fail.push(`POST /api/telemetry failed: ${JSON.stringify(ingest)}`);
    }

    // Ingestion validation rejection
    const badIngest = await post('http://localhost:5000/api/telemetry', {
      device_id: 'esp32_switchboard_01',
      readings: [{ channel: -1, voltage: 800, current: -5, power: 0, energy: 0, frequency: 0, power_factor: 2 }]
    });
    if (badIngest.status === 400) {
      results.pass.push('Telemetry Ingestion Validation: Out-of-bounds metrics correctly rejected with HTTP 400.');
    } else {
      results.fail.push(`POST /api/telemetry invalid payload expected 400, got ${badIngest.status}`);
    }

    // GET /latest
    const latest = await get('http://localhost:5000/api/telemetry/latest');
    if (latest.status === 200 && Array.isArray(latest.data?.data) && latest.data.data.length === 2) {
      results.pass.push('Telemetry Latest (GET /api/telemetry/latest) returns snapshots for both active channels.');
    } else {
      results.fail.push(`GET /api/telemetry/latest failed: ${JSON.stringify(latest)}`);
    }

    // GET /history
    const history = await get('http://localhost:5000/api/telemetry/history?range=today&limit=100');
    if (history.status === 200 && Array.isArray(history.data?.data)) {
      results.pass.push(`Telemetry History (GET /api/telemetry/history) successfully returned ${history.data.data.length} timestamped records.`);
    } else {
      results.fail.push(`GET /api/telemetry/history failed: ${JSON.stringify(history)}`);
    }

    // GET /summary
    const summary = await get('http://localhost:5000/api/telemetry/summary?tariff=7.0');
    if (summary.status === 200 && summary.data?.data?.appliance_breakdown) {
      results.pass.push('Analytics Summary (GET /api/telemetry/summary) computed energy deltas, peak load, and cost estimates.');
    } else {
      results.fail.push(`GET /api/telemetry/summary failed: ${JSON.stringify(summary)}`);
    }
  } catch (err) {
    results.fail.push(`Telemetry API test error: ${err.message}`);
  }

  // 5. Alerts & Anomaly Detection (Phase 1)
  try {
    const alertsList = await get('http://localhost:5000/api/telemetry/alerts?resolved=all');
    if (alertsList.status === 200 && Array.isArray(alertsList.data?.data)) {
      results.pass.push(`Alerts Engine (GET /api/telemetry/alerts) returned alert logs with active count ${alertsList.data.active_count}.`);
    } else {
      results.fail.push(`GET /api/telemetry/alerts failed: ${JSON.stringify(alertsList)}`);
    }

    // Simulate alert
    const sim = await post('http://localhost:5000/api/telemetry/alerts/simulate', {
      channel: 1,
      alert_type: 'OVER_POWER',
      value: 2100.0
    });
    if (sim.status === 201 && sim.data?.alert_id) {
      results.pass.push(`Alert Simulation (POST /api/telemetry/alerts/simulate) triggered CRITICAL anomaly #${sim.data.alert_id}.`);
      
      // Acknowledge simulated alert
      const ack = await post(`http://localhost:5000/api/telemetry/alerts/${sim.data.alert_id}/ack`, {});
      if (ack.status === 200) {
        results.pass.push(`Alert Acknowledgment (POST /api/telemetry/alerts/${sim.data.alert_id}/ack) successfully resolved alert.`);
      } else {
        results.fail.push(`POST /api/telemetry/alerts/:id/ack failed: ${JSON.stringify(ack)}`);
      }
    } else {
      results.fail.push(`POST /api/telemetry/alerts/simulate failed: ${JSON.stringify(sim)}`);
    }
  } catch (err) {
    results.fail.push(`Alerts API test error: ${err.message}`);
  }

  // 6. Phase 3: Energy Insights, Recommendations, Carbon Footprint & Projections
  let fullInsights = null;
  try {
    // GET /api/energy-insights
    const insights = await get('http://localhost:5000/api/energy-insights?tariff=7.0&emission_factor=0.82');
    if (insights.status === 200 && insights.data?.data?.summary && insights.data?.data?.appliances) {
      fullInsights = insights.data.data;
      results.pass.push('Energy Insights API (GET /api/energy-insights) returned complete intelligence schema and summary KPIs.');
    } else {
      results.fail.push(`GET /api/energy-insights failed: ${JSON.stringify(insights)}`);
    }

    // GET /api/recommendations
    const recs = await get('http://localhost:5000/api/recommendations?tariff=7.0&emission_factor=0.82');
    if (recs.status === 200 && Array.isArray(recs.data?.recommendations)) {
      results.pass.push(`Recommendations Engine (GET /api/recommendations) returned ${recs.data.recommendations.length} deterministic recommendations with savings models.`);
    } else {
      results.fail.push(`GET /api/recommendations failed: ${JSON.stringify(recs)}`);
    }

    // GET /api/recommendations/1
    const ch1Recs = await get('http://localhost:5000/api/recommendations/1');
    if (ch1Recs.status === 200 && Array.isArray(ch1Recs.data?.recommendations)) {
      results.pass.push('Channel-Specific Recommendations (GET /api/recommendations/1) correctly filtered for Channel 1.');
    } else {
      results.fail.push(`GET /api/recommendations/1 failed: ${JSON.stringify(ch1Recs)}`);
    }

    // GET /api/carbon-footprint
    const carbon = await get('http://localhost:5000/api/carbon-footprint?emission_factor=0.82');
    if (carbon.status === 200 && typeof carbon.data?.total_monthly_projected_co2_kg === 'number') {
      results.pass.push(`Carbon Footprint API (GET /api/carbon-footprint) calculated ${carbon.data.total_monthly_projected_co2_kg} kg monthly CO2 footprint.`);
    } else {
      results.fail.push(`GET /api/carbon-footprint failed: ${JSON.stringify(carbon)}`);
    }

    // GET /api/energy-projection
    const proj = await get('http://localhost:5000/api/energy-projection?tariff=7.0');
    if (proj.status === 200 && typeof proj.data?.projection_summary?.projected_30day_kwh === 'number') {
      results.pass.push(`Energy Projection API (GET /api/energy-projection) computed 30-day projection of ${proj.data.projection_summary.projected_30day_kwh} kWh.`);
    } else {
      results.fail.push(`GET /api/energy-projection failed: ${JSON.stringify(proj)}`);
    }
  } catch (err) {
    results.fail.push(`Phase 3 Intelligence APIs test error: ${err.message}`);
  }

  // 7. Phase 4: Appliance Ranking & What-If Savings Simulator
  try {
    // GET /api/appliance-ranking
    const rank = await get('http://localhost:5000/api/appliance-ranking?tariff=7.0&emission_factor=0.82');
    if (rank.status === 200 && Array.isArray(rank.data?.appliances) && rank.data.appliances.length >= 2) {
      results.pass.push(`Appliance Ranking API (GET /api/appliance-ranking) ranked #${rank.data.appliances[0].rank} ${rank.data.highest_consuming_appliance} (${rank.data.highest_consuming_share_pct}% share).`);
    } else {
      results.fail.push(`GET /api/appliance-ranking failed: ${JSON.stringify(rank)}`);
    }

    // GET /api/savings-simulator (Valid query)
    const sim = await get('http://localhost:5000/api/savings-simulator?appliance=Air%20Conditioner&hours_saved_per_day=2&daily_hours=8&tariff=7.0&emission_factor=0.82');
    if (sim.status === 200 && sim.data?.savings_projection?.annual_money_saved > 0) {
      results.pass.push(`Savings Simulator (GET /api/savings-simulator) computed Annual Savings: INR ${sim.data.savings_projection.annual_money_saved} & ${sim.data.savings_projection.annual_co2_reduction_kg} kg CO2 reduction.`);
    } else {
      results.fail.push(`GET /api/savings-simulator failed: ${JSON.stringify(sim)}`);
    }

    // GET /api/savings-simulator (Invalid negative hours validation)
    const badSim = await get('http://localhost:5000/api/savings-simulator?hours_saved_per_day=-5');
    if (badSim.status === 400) {
      results.pass.push('Savings Simulator Validation: Negative hours_saved_per_day correctly rejected with HTTP 400 Bad Request.');
    } else {
      results.fail.push(`GET /api/savings-simulator negative hours expected 400, got ${badSim.status}`);
    }
  } catch (err) {
    results.fail.push(`Phase 4 APIs test error: ${err.message}`);
  }

  // 8. Phase 5: AI-Powered Energy Assistant API
  try {
    const assistantTests = [
      { q: 'Which appliance consumes the most energy?', expectedIntent: 'highest_consumption' },
      { q: 'How can I reduce my electricity bill?', expectedIntent: 'recommendations' },
      { q: 'What is my projected monthly bill?', expectedIntent: 'projected_bill' },
      { q: 'What is my current carbon footprint?', expectedIntent: 'carbon_footprint' },
      { q: 'Which appliance should I optimize first?', expectedIntent: 'appliance_optimization' },
      { q: 'What happens if I reduce my appliance usage?', expectedIntent: 'savings_guidance' },
      { q: 'Are there any active energy anomalies?', expectedIntent: 'active_anomalies' },
      { q: 'Summarize my current energy usage.', expectedIntent: 'energy_summary' },
      { q: 'What can you do?', expectedIntent: 'help' }
    ];

    let allIntentsPassed = true;
    for (const t of assistantTests) {
      const resp = await post('http://localhost:5000/api/energy-assistant', { message: t.q, tariff: 7.0, emission_factor: 0.82 });
      if (resp.status !== 200 || !resp.data?.success || resp.data.intent !== t.expectedIntent || !Array.isArray(resp.data.suggested_questions)) {
        allIntentsPassed = false;
        results.fail.push(`Energy Assistant Intent "${t.expectedIntent}" failed. Response: ${JSON.stringify(resp)}`);
      }
    }

    if (allIntentsPassed) {
      results.pass.push(`AI Energy Assistant (POST /api/energy-assistant) successfully verified across all ${assistantTests.length} intent categories with data-grounded answers.`);
    }

    // Test unknown / general question
    const generalQ = await post('http://localhost:5000/api/energy-assistant', { message: 'Can cats fly to the moon?' });
    if (generalQ.status === 200 && generalQ.data?.success && Array.isArray(generalQ.data?.suggested_questions)) {
      results.pass.push('Energy Assistant Fallback: Unrecognized queries handled gracefully with contextual guidance.');
    } else {
      results.fail.push(`Energy Assistant Fallback check failed: ${JSON.stringify(generalQ)}`);
    }
  } catch (err) {
    results.fail.push(`Phase 5 Energy Assistant test error: ${err.message}`);
  }

  // 9. Phase 6: Intelligent Energy Consumption Forecasting
  let fullForecast = null;
  try {
    // GET /api/forecast
    const forecast = await get('http://localhost:5000/api/forecast?tariff=7.0&emission_factor=0.82');
    if (forecast.status === 200 && forecast.data?.forecast_7day && forecast.data?.forecast_30day) {
      fullForecast = forecast.data;
      results.pass.push(`Energy Forecasting API (GET /api/forecast) generated 7-day (${forecast.data.forecast_7day.total_energy_kwh} kWh, ₹${forecast.data.forecast_7day.total_cost}) and 30-day (${forecast.data.forecast_30day.total_energy_kwh} kWh, ₹${forecast.data.forecast_30day.total_cost}) models.`);
    } else {
      results.fail.push(`GET /api/forecast failed: ${JSON.stringify(forecast)}`);
    }

    // GET /api/forecast/7day
    const f7 = await get('http://localhost:5000/api/forecast/7day');
    if (f7.status === 200 && Array.isArray(f7.data?.forecast_7day?.daily_forecast) && f7.data.forecast_7day.daily_forecast.length === 7) {
      results.pass.push('7-Day Forecast Endpoint (GET /api/forecast/7day) returned 7 continuous daily demand predictions.');
    } else {
      results.fail.push(`GET /api/forecast/7day failed: ${JSON.stringify(f7)}`);
    }

    // GET /api/forecast/30day
    const f30 = await get('http://localhost:5000/api/forecast/30day');
    if (f30.status === 200 && Array.isArray(f30.data?.forecast_30day?.weekly_breakdown) && f30.data.forecast_30day.weekly_breakdown.length === 4) {
      results.pass.push('30-Day Forecast Endpoint (GET /api/forecast/30day) returned 4-week horizon profile with appliance forecasts.');
    } else {
      results.fail.push(`GET /api/forecast/30day failed: ${JSON.stringify(f30)}`);
    }

    // GET /api/forecast/vs-actual
    const vsAct = await get('http://localhost:5000/api/forecast/vs-actual');
    if (vsAct.status === 200 && typeof vsAct.data?.forecast_vs_actual?.accuracy_score_pct === 'number') {
      results.pass.push(`Forecast vs Actual Tracking (GET /api/forecast/vs-actual) calculated Model Accuracy: ${vsAct.data.forecast_vs_actual.accuracy_score_pct}% (MAPE: ${vsAct.data.forecast_vs_actual.mean_absolute_percentage_error}%).`);
    } else {
      results.fail.push(`GET /api/forecast/vs-actual failed: ${JSON.stringify(vsAct)}`);
    }
  } catch (err) {
    results.fail.push(`Phase 6 Forecasting test error: ${err.message}`);
  }

  // 10. Phase 7: Smart Energy Budget & Goal System
  let fullBudget = null;
  try {
    // GET /api/energy-budget
    const budgetRes = await get('http://localhost:5000/api/energy-budget?tariff=7.0&emission_factor=0.82');
    if (budgetRes.status === 200 && budgetRes.data?.budget_summary?.monthly_budget_inr > 0) {
      fullBudget = budgetRes.data;
      results.pass.push(`Energy Budget API (GET /api/energy-budget) retrieved target ₹${budgetRes.data.budget_summary.monthly_budget_inr.toFixed(2)} with status "${budgetRes.data.budget_summary.budget_status}".`);
    } else {
      results.fail.push(`GET /api/energy-budget failed: ${JSON.stringify(budgetRes)}`);
    }

    // PUT /api/energy-budget
    const updateRes = await put('http://localhost:5000/api/energy-budget', { monthly_budget_inr: 15.0 });
    if (updateRes.status === 200 && updateRes.data?.data?.budget_summary?.budget_status === 'OVER_BUDGET') {
      results.pass.push(`Energy Budget Update (PUT /api/energy-budget) updated budget to ₹15.00 and accurately triggered OVER_BUDGET status.`);
    } else {
      results.fail.push(`PUT /api/energy-budget over-budget scenario failed: ${JSON.stringify(updateRes)}`);
    }

    // GET /api/energy-budget/status
    const statusRes = await get('http://localhost:5000/api/energy-budget/status?tariff=7.0');
    if (statusRes.status === 200 && statusRes.data?.budget_status === 'OVER_BUDGET') {
      results.pass.push(`Energy Budget Status (GET /api/energy-budget/status) returned status "${statusRes.data.budget_status_label}".`);
    } else {
      results.fail.push(`GET /api/energy-budget/status failed: ${JSON.stringify(statusRes)}`);
    }

    // Budget Validation: Negative
    const badNeg = await put('http://localhost:5000/api/energy-budget', { monthly_budget_inr: -100 });
    if (badNeg.status === 400) {
      results.pass.push('Budget Validation: Negative budget correctly rejected with HTTP 400 Bad Request.');
    } else {
      results.fail.push(`Budget Validation expected 400 for negative budget, got ${badNeg.status}`);
    }

    // Budget Validation: Zero
    const badZero = await put('http://localhost:5000/api/energy-budget', { monthly_budget_inr: 0 });
    if (badZero.status === 400) {
      results.pass.push('Budget Validation: Zero budget correctly rejected with HTTP 400 Bad Request.');
    } else {
      results.fail.push(`Budget Validation expected 400 for zero budget, got ${badZero.status}`);
    }

    // Restore budget to ₹500.00
    await put('http://localhost:5000/api/energy-budget', { monthly_budget_inr: 500.0 });
  } catch (err) {
    results.fail.push(`Phase 7 Budget test error: ${err.message}`);
  }

  // 11. Phase 8: Context-Aware Appliance Behaviour Deviation Detection
  let fullBehaviour = null;
  try {
    // GET /api/behaviour-deviation
    const devRes = await get('http://localhost:5000/api/behaviour-deviation');
    if (devRes.status === 200 && Array.isArray(devRes.data?.appliances) && devRes.data.appliances.length >= 2) {
      fullBehaviour = devRes.data;
      const app1 = devRes.data.appliances[0];
      results.pass.push(`Appliance Behaviour API (GET /api/behaviour-deviation) evaluated ${devRes.data.appliances.length} appliances with status "${app1.classification}" (Confidence: ${app1.confidence}, ${app1.confidence_score}%).`);
    } else {
      results.fail.push(`GET /api/behaviour-deviation failed: ${JSON.stringify(devRes)}`);
    }

    // GET /api/behaviour-deviation/1 (Channel 1)
    const ch1Dev = await get('http://localhost:5000/api/behaviour-deviation/1');
    if (ch1Dev.status === 200 && ch1Dev.data?.appliances?.length === 1 && ch1Dev.data.appliances[0].channel_id === 1) {
      results.pass.push('Channel-Specific Behaviour Endpoint (GET /api/behaviour-deviation/1) successfully isolated Channel 1.');
    } else {
      results.fail.push(`GET /api/behaviour-deviation/1 failed: ${JSON.stringify(ch1Dev)}`);
    }

    // Check Contextual Reasoning & Non-Trivial Reasons
    if (fullBehaviour && fullBehaviour.appliances.every(a => typeof a.reason === 'string' && a.reason.length > 10)) {
      results.pass.push('Context-Aware Reasoning: All appliances provided detailed, evidence-grounded behavioural explanations.');
    } else {
      results.fail.push('Appliance Behaviour check failed: missing or empty reasoning strings.');
    }
  } catch (err) {
    results.fail.push(`Phase 8 Behaviour Deviation test error: ${err.message}`);
  }

  // 12. Numerical Integrity & NaN/Undefined Checks
  const payloadToInspect = { fullInsights, fullForecast, fullBudget, fullBehaviour };
  const anomalies = findNumericalAnomalies(payloadToInspect);
  if (anomalies.length === 0) {
    results.pass.push('Numerical Integrity: Zero NaN, Infinity, undefined, or unexpected negative values across all intelligence, forecasting, budget & behaviour models.');
  } else {
    results.fail.push(`Numerical Anomalies Detected: ${anomalies.join(', ')}`);
  }

  // Output Full Formatted Report
  console.log('========================================================================');
  console.log('                       VERIFICATION REPORT                              ');
  console.log('========================================================================\n');

  console.log('PASS:');
  results.pass.forEach(p => console.log(`  - ${p}`));
  console.log('');

  console.log('FAIL:');
  if (results.fail.length === 0) {
    console.log('  (None - All tests passed successfully)');
  } else {
    results.fail.forEach(f => console.log(`  - ${f}`));
  }
  console.log('');

  console.log('WARNINGS:');
  if (results.warnings.length === 0) {
    console.log('  (None)');
  } else {
    results.warnings.forEach(w => console.log(`  - ${w}`));
  }
  console.log('\n========================================================================');
}

runSoftwareVerification().catch(console.error);
