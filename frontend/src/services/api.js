/**
 * Frontend API Service Layer
 * Connects to the Smart Switchboard Node.js/Express Backend
 */

const API_BASE_URL = '/api/telemetry';
const APPLIANCE_BASE_URL = '/api/appliances';
const INTELLIGENCE_BASE_URL = '/api';

/**
 * Fetch the latest snapshot of all active PZEM channels
 */
export async function fetchLatestTelemetry() {
  const response = await fetch(`${API_BASE_URL}/latest`);
  if (!response.ok) {
    throw new Error(`Failed to fetch latest telemetry (${response.status})`);
  }
  const result = await response.json();
  return result.data || [];
}

/**
 * Fetch historical energy readings
 * @param {string} range - 'today', 'yesterday', '7d', '30d', 'all', 'custom'
 * @param {string} channel - 'all', '1', '2'
 * @param {string} from - optional ISO start date
 * @param {string} to - optional ISO end date
 */
export async function fetchHistoricalTelemetry(range = 'today', channel = 'all', from = null, to = null) {
  const params = new URLSearchParams();
  if (range) params.append('range', range);
  if (channel && channel !== 'all') params.append('channel', channel);
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  params.append('limit', '1000');

  const response = await fetch(`${API_BASE_URL}/history?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch historical telemetry (${response.status})`);
  }
  const result = await response.json();
  return result.data || [];
}

/**
 * Fetch aggregate analytics summary and bill calculations
 * @param {number} tariff - electricity unit rate (₹/kWh)
 */
export async function fetchAnalyticsSummary(tariff = 7.0) {
  const response = await fetch(`${API_BASE_URL}/summary?tariff=${tariff}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch analytics summary (${response.status})`);
  }
  const result = await response.json();
  return result.data || null;
}

/**
 * Fetch all configured appliances and channels
 */
export async function fetchAppliances() {
  const response = await fetch(APPLIANCE_BASE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch appliances (${response.status})`);
  }
  const result = await response.json();
  return {
    appliances: result.data || [],
    categories: result.allowed_categories || []
  };
}

/**
 * Update appliance name, category, and power threshold
 * @param {number} channelId
 * @param {object} payload - { name, category, power_threshold_w, is_active }
 */
export async function updateAppliance(channelId, payload) {
  const response = await fetch(`${APPLIANCE_BASE_URL}/${channelId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.errors ? errorData.errors.join('; ') : errorData.message || 'Failed to update appliance';
    throw new Error(message);
  }
  return await response.json();
}

/**
 * Phase 3: Fetch Energy Intelligence, Projections & Recommendations
 * @param {number} tariff - electricity unit rate (₹/kWh)
 * @param {number} emissionFactor - kg CO2 / kWh
 */
export async function fetchEnergyInsights(tariff = 7.0, emissionFactor = 0.82) {
  const response = await fetch(`${INTELLIGENCE_BASE_URL}/energy-insights?tariff=${tariff}&emission_factor=${emissionFactor}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch energy insights (${response.status})`);
  }
  const result = await response.json();
  return result.data || null;
}

/**
 * Phase 3: Fetch Recommendations
 */
export async function fetchRecommendations(tariff = 7.0, emissionFactor = 0.82, channel = null) {
  const params = new URLSearchParams();
  params.append('tariff', tariff);
  params.append('emission_factor', emissionFactor);
  if (channel && channel !== 'all') params.append('channel', channel);

  const response = await fetch(`${INTELLIGENCE_BASE_URL}/recommendations?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch recommendations (${response.status})`);
  }
  return await response.json();
}

/**
 * Phase 3: Fetch Carbon Footprint Breakdown
 */
export async function fetchCarbonFootprint(tariff = 7.0, emissionFactor = 0.82, channel = null) {
  const params = new URLSearchParams();
  params.append('tariff', tariff);
  params.append('emission_factor', emissionFactor);
  if (channel && channel !== 'all') params.append('channel', channel);

  const response = await fetch(`${INTELLIGENCE_BASE_URL}/carbon-footprint?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch carbon footprint (${response.status})`);
  }
  return await response.json();
}

/**
 * Phase 3: Fetch Energy Projections
 */
export async function fetchEnergyProjection(tariff = 7.0, emissionFactor = 0.82, channel = null) {
  const params = new URLSearchParams();
  params.append('tariff', tariff);
  params.append('emission_factor', emissionFactor);
  if (channel && channel !== 'all') params.append('channel', channel);

  const response = await fetch(`${INTELLIGENCE_BASE_URL}/energy-projection?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch energy projection (${response.status})`);
  }
  return await response.json();
}

/**
 * Phase 4: Fetch Appliance Energy Ranking
 */
export async function fetchApplianceRanking(tariff = 7.0, emissionFactor = 0.82) {
  const params = new URLSearchParams();
  params.append('tariff', tariff);
  params.append('emission_factor', emissionFactor);

  const response = await fetch(`${INTELLIGENCE_BASE_URL}/appliance-ranking?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch appliance ranking (${response.status})`);
  }
  return await response.json();
}

/**
 * Phase 4: Fetch What-If Savings Simulation
 */
export async function fetchSavingsSimulation({ appliance, channel, hoursSavedPerDay = 1.5, dailyHours = 8.0, tariff = 7.0, emissionFactor = 0.82 }) {
  const params = new URLSearchParams();
  if (appliance) params.append('appliance', appliance);
  if (channel) params.append('channel', channel);
  params.append('hours_saved_per_day', hoursSavedPerDay);
  params.append('daily_hours', dailyHours);
  params.append('tariff', tariff);
  params.append('emission_factor', emissionFactor);

  const response = await fetch(`${INTELLIGENCE_BASE_URL}/savings-simulator?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to run savings simulation (${response.status})`);
  }
  return await response.json();
}

/**
 * Phase 5: Communicate with AI Energy Assistant
 */
export async function sendAssistantMessage(message, tariff = 7.0, emissionFactor = 0.82) {
  const response = await fetch(`${INTELLIGENCE_BASE_URL}/energy-assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      tariff,
      emission_factor: emissionFactor
    })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to communicate with energy assistant (${response.status})`);
  }
  return await response.json();
}

/**
 * Phase 6: Fetch Complete Intelligent Energy Forecast
 */
export async function fetchEnergyForecast(tariff = 7.0, emissionFactor = 0.82) {
  const params = new URLSearchParams();
  params.append('tariff', tariff);
  params.append('emission_factor', emissionFactor);

  const response = await fetch(`${INTELLIGENCE_BASE_URL}/forecast?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch energy forecast (${response.status})`);
  }
  return await response.json();
}

/**
 * Phase 6: Fetch 7-Day Forecast
 */
export async function fetch7DayForecast(tariff = 7.0, emissionFactor = 0.82) {
  const params = new URLSearchParams();
  params.append('tariff', tariff);
  params.append('emission_factor', emissionFactor);

  const response = await fetch(`${INTELLIGENCE_BASE_URL}/forecast/7day?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch 7-day forecast (${response.status})`);
  }
  return await response.json();
}

/**
 * Phase 6: Fetch 30-Day Forecast
 */
export async function fetch30DayForecast(tariff = 7.0, emissionFactor = 0.82) {
  const params = new URLSearchParams();
  params.append('tariff', tariff);
  params.append('emission_factor', emissionFactor);

  const response = await fetch(`${INTELLIGENCE_BASE_URL}/forecast/30day?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch 30-day forecast (${response.status})`);
  }
  return await response.json();
}

/**
 * Phase 6: Fetch Forecast vs Actual Tracking Metrics
 */
export async function fetchForecastVsActual(tariff = 7.0, emissionFactor = 0.82) {
  const params = new URLSearchParams();
  params.append('tariff', tariff);
  params.append('emission_factor', emissionFactor);

  const response = await fetch(`${INTELLIGENCE_BASE_URL}/forecast/vs-actual?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch forecast vs actual tracking (${response.status})`);
  }
  return await response.json();
}

/**
 * Phase 7: Fetch Smart Energy Budget & Goal Progress
 */
export async function fetchEnergyBudget(tariff = 7.0, emissionFactor = 0.82) {
  const params = new URLSearchParams();
  params.append('tariff', tariff);
  params.append('emission_factor', emissionFactor);

  const response = await fetch(`${INTELLIGENCE_BASE_URL}/energy-budget?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch energy budget (${response.status})`);
  }
  return await response.json();
}

/**
 * Phase 7: Update Monthly Energy Budget Target
 */
export async function updateEnergyBudget(monthlyBudgetInr, alertThresholdPct = 90.0, tariff = 7.0, emissionFactor = 0.82) {
  const params = new URLSearchParams();
  params.append('tariff', tariff);
  params.append('emission_factor', emissionFactor);

  const response = await fetch(`${INTELLIGENCE_BASE_URL}/energy-budget?${params.toString()}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      monthly_budget_inr: monthlyBudgetInr,
      alert_threshold_pct: alertThresholdPct
    })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to update energy budget (${response.status})`);
  }
  return await response.json();
}

/**
 * Phase 7: Fetch Energy Budget Status
 */
export async function fetchEnergyBudgetStatus(tariff = 7.0, emissionFactor = 0.82) {
  const params = new URLSearchParams();
  params.append('tariff', tariff);
  params.append('emission_factor', emissionFactor);

  const response = await fetch(`${INTELLIGENCE_BASE_URL}/energy-budget/status?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch energy budget status (${response.status})`);
  }
  return await response.json();
}

/**
 * Phase 8: Fetch Context-Aware Appliance Behaviour Deviation
 */
export async function fetchApplianceBehaviourDeviation(channel = null) {
  const url = channel ? `${INTELLIGENCE_BASE_URL}/behaviour-deviation/${channel}` : `${INTELLIGENCE_BASE_URL}/behaviour-deviation`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch appliance behaviour deviation (${response.status})`);
  }
  return await response.json();
}

/**
 * Fetch triggered anomaly alerts
 * @param {string} resolved - '0' (active), '1' (resolved), or 'all'
 */
export async function fetchAlerts(resolved = 'all') {
  const response = await fetch(`${API_BASE_URL}/alerts?resolved=${resolved}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch alerts (${response.status})`);
  }
  return await response.json();
}

/**
 * Acknowledge / Resolve a single alert
 * @param {number} alertId
 */
export async function acknowledgeAlert(alertId) {
  const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/ack`, {
    method: 'POST'
  });
  if (!response.ok) {
    throw new Error(`Failed to acknowledge alert (${response.status})`);
  }
  return await response.json();
}

/**
 * Clear all active alerts
 */
export async function clearAllAlerts() {
  const response = await fetch(`${API_BASE_URL}/alerts/clear-all`, {
    method: 'POST'
  });
  if (!response.ok) {
    throw new Error(`Failed to clear alerts (${response.status})`);
  }
  return await response.json();
}

/**
 * Simulate an anomaly alert for live testing
 */
export async function simulateAlert(channel = 1, alertType = 'OVER_POWER', value = 2450.0) {
  const response = await fetch(`${API_BASE_URL}/alerts/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, alert_type: alertType, value })
  });
  if (!response.ok) {
    throw new Error(`Failed to simulate alert (${response.status})`);
  }
  return await response.json();
}

/**
 * Helper: Export telemetry dataset as a downloadable CSV file
 */
export function exportToCSV(data, filename = 'smart_switchboard_energy_report.csv') {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  const headers = [
    'Record ID',
    'Timestamp',
    'Channel',
    'Appliance Name',
    'Voltage (V)',
    'Current (A)',
    'Active Power (W)',
    'Cumulative Energy (kWh)',
    'Frequency (Hz)',
    'Power Factor',
    'Device ID'
  ];

  const rows = data.map(row => [
    row.id,
    `"${row.timestamp}"`,
    row.channel_id,
    `"${row.appliance_name || `Channel ${row.channel_id}`}"`,
    row.voltage,
    row.current,
    row.power,
    row.energy,
    row.frequency,
    row.power_factor,
    `"${row.device_id || 'esp32_switchboard_01'}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
