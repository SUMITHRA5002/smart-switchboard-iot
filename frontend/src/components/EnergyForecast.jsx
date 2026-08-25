import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Layers, 
  Zap, 
  Globe, 
  ShieldCheck, 
  RefreshCw, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import { fetchEnergyForecast } from '../services/api';

export default function EnergyForecast({ tariff = 7.0, setTariff }) {
  const [emissionFactor, setEmissionFactor] = useState(0.82);
  const [forecastData, setForecastData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    loadForecast();
  }, [tariff, emissionFactor]);

  async function loadForecast() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchEnergyForecast(tariff, emissionFactor);
      setForecastData(data);
    } catch (err) {
      console.error('Failed to load energy forecast:', err);
      setErrorMessage(err.message || 'Failed to load energy forecast');
    } finally {
      setIsLoading(false);
    }
  }

  const f7 = forecastData?.forecast_7day || {};
  const f30 = forecastData?.forecast_30day || {};
  const applianceForecasts = forecastData?.appliance_forecasts || [];
  const vsActual = forecastData?.forecast_vs_actual || {};
  const evaluations = vsActual.historical_evaluations || [];

  const confidence = forecastData?.confidence_level || 'LIMITED';
  const confidenceScore = forecastData?.confidence_score || 60;
  const isHighConfidence = confidence === 'HIGH';
  const isModConfidence = confidence === 'MODERATE';

  const trend = forecastData?.trend || 'STABLE';
  const trendPct = forecastData?.trend_percentage || 0;

  // 7-Day Chart Data formatting
  const daily7Data = (f7.daily_forecast || []).map(item => ({
    name: item.day_name.slice(0, 3),
    date: item.date,
    kwh: item.predicted_kwh,
    cost: item.predicted_cost
  }));

  // 30-Day Weekly Chart Data
  const weeklyData = (f30.weekly_breakdown || []).map(item => ({
    name: item.week,
    kwh: item.predicted_kwh,
    cost: item.predicted_cost
  }));

  return (
    <div className="page-container">
      {/* Standardized Page Header Card */}
      <div className="page-header-card">
        <div className="page-header-title-group">
          <h2 className="page-header-title">
            <TrendingUp size={22} color="#06b6d4" />
            Intelligent Energy Consumption Forecasting
          </h2>
          <p className="page-header-subtitle">
            Historical-data-based 7-day and 30-day predictive energy demand and electricity bill models
          </p>
        </div>

        {/* Controls & Confidence Badges */}
        <div className="page-header-actions">
          {/* Confidence Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 'var(--radius-sm)',
            background: isHighConfidence ? 'rgba(16,185,129,0.15)' : isModConfidence ? 'rgba(6,182,212,0.15)' : 'rgba(245,158,11,0.15)',
            border: `1px solid ${isHighConfidence ? 'rgba(16,185,129,0.3)' : isModConfidence ? 'rgba(6,182,212,0.3)' : 'rgba(245,158,11,0.3)'}`,
            color: isHighConfidence ? '#34d399' : isModConfidence ? '#38bdf8' : '#fbbf24',
            fontSize: '0.78rem',
            fontWeight: 700
          }}>
            <ShieldCheck size={15} />
            <span>{confidence} CONFIDENCE ({confidenceScore}%)</span>
          </div>

          {/* Trend Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 'var(--radius-sm)',
            background: trend === 'INCREASING' ? 'rgba(244,63,94,0.15)' : trend === 'DECREASING' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: trend === 'INCREASING' ? '#fb7185' : trend === 'DECREASING' ? '#34d399' : '#cbd5e1',
            fontSize: '0.78rem',
            fontWeight: 700
          }}>
            {trend === 'INCREASING' ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            <span>{trend} {trendPct > 0 ? `(${trendPct}%)` : ''}</span>
          </div>

          {/* Tariff Input */}
          {setTariff && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-input)', padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Tariff:</span>
              <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700 }}>₹</span>
              <input
                type="number"
                step="0.1"
                min="0"
                value={tariff}
                onChange={(e) => setTariff(parseFloat(e.target.value) || 0)}
                style={{
                  width: 48,
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>/kWh</span>
            </div>
          )}

          <button
            onClick={loadForecast}
            className="btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
          >
            <RefreshCw size={13} className={isLoading ? 'live-pulse' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {errorMessage && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', fontSize: '0.82rem' }}>
          {errorMessage}
        </div>
      )}

      {/* Top 4 Executive Forecast Metric Cards */}
      <div className="grid-kpi-4">
        {/* 7-Day Forecast */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">7-Day Energy Forecast</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#38bdf8' }}>
              <Calendar size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-gradient-cyan">
              {(f7.total_energy_kwh || 0).toFixed(2)}
            </span>
            <span className="kpi-unit">kWh</span>
          </div>
          <div className="kpi-subtext" style={{ color: '#fbbf24', fontWeight: 600 }}>
            <span>Est. 7-Day Bill: ₹{(f7.total_cost || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* 30-Day Forecast */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-indigo)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">30-Day Energy Forecast</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Layers size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-gradient-indigo">
              {(f30.total_energy_kwh || 0).toFixed(2)}
            </span>
            <span className="kpi-unit">kWh</span>
          </div>
          <div className="kpi-subtext" style={{ color: '#fbbf24', fontWeight: 600 }}>
            <span>Est. 30-Day Bill: ₹{(f30.total_cost || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* 30-Day Forecasted CO2 */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Forecasted Carbon</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <Globe size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-gradient-emerald">
              {(f30.total_co2_kg || 0).toFixed(2)}
            </span>
            <span className="kpi-unit">kg CO₂</span>
          </div>
          <div className="kpi-subtext">
            <span>At {emissionFactor} kg CO₂/kWh grid factor</span>
          </div>
        </div>

        {/* Model Accuracy Tracking */}
        <div className="kpi-card highlight-emerald" style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.35)'
        }}>
          <div className="kpi-card-header">
            <span className="kpi-label" style={{ color: '#34d399' }}>Model Accuracy</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#fff' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-gradient-emerald">
              {(vsActual.accuracy_score_pct || 95).toFixed(1)}%
            </span>
          </div>
          <div className="kpi-subtext" style={{ color: '#cbd5e1' }}>
            <span>MAPE: {(vsActual.mean_absolute_percentage_error || 0).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Visual Forecast Charts Grid */}
      <div className="grid-responsive-2">
        {/* 7-Day Daily Demand Projection Chart */}
        <div className="glass-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <Calendar size={18} color="#06b6d4" />
                7-Day Daily Load Forecast (kWh)
              </h3>
              <p className="section-subtitle">Upcoming 7-day daily projection profile</p>
            </div>
          </div>

          <div style={{ width: '100%', height: 230 }}>
            {daily7Data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily7Data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorForecastKwh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" kWh" />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }}
                    formatter={(val) => [`${val} kWh (₹${(val * tariff).toFixed(2)})`, 'Predicted Energy']}
                    labelFormatter={(label, payload) => payload[0]?.payload?.date ? `${label} (${payload[0].payload.date})` : label}
                  />
                  <Area type="monotone" dataKey="kwh" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorForecastKwh)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                No forecast telemetry available
              </div>
            )}
          </div>
        </div>

        {/* 30-Day Monthly Weekly Breakdown Chart */}
        <div className="glass-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <Layers size={18} color="#818cf8" />
                30-Day Weekly Energy Profile (kWh)
              </h3>
              <p className="section-subtitle">4-week forward projection horizon</p>
            </div>
          </div>

          <div style={{ width: '100%', height: 230 }}>
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" kWh" />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }}
                    formatter={(val) => [`${val} kWh (₹${(val * tariff).toFixed(2)})`, 'Predicted Weekly Energy']}
                  />
                  <Bar dataKey="kwh" radius={[4, 4, 0, 0]}>
                    {weeklyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#818cf8' : '#06b6d4'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                No weekly forecast data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Appliance-Level Forecast Breakdown */}
      <div className="glass-card">
        <div className="section-header">
          <div>
            <h3 className="section-title">
              <Zap size={18} color="#fbbf24" />
              Appliance-Wise Forecasted Consumption &amp; Projected Costs
            </h3>
            <p className="section-subtitle">Disaggregated predictions per monitored load channel</p>
          </div>
        </div>

        <div className="grid-responsive-2">
          {applianceForecasts.map(app => (
            <div
              key={app.channel_id}
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderLeft: `4px solid ${app.channel_id === 1 ? 'var(--accent-emerald)' : 'var(--accent-cyan)'}`,
                borderRadius: 'var(--radius-md)',
                padding: 14
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#fff' }}>
                    {app.appliance_name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Channel {app.channel_id} • {app.category}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                    {app.share_pct}%
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Forecast Share</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10, fontSize: '0.78rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>7-Day Forecast</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
                    {app.predicted_7day_kwh} kWh
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>30-Day Forecast</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#818cf8', marginTop: 2 }}>
                    {app.predicted_30day_kwh} kWh
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>Monthly Cost</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fbbf24', marginTop: 2 }}>
                    ₹{app.predicted_monthly_cost.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast vs Actual Tracking Evaluation Table */}
      <div className="glass-card">
        <div className="section-header">
          <div>
            <h3 className="section-title">
              <ShieldCheck size={18} color="#10b981" />
              Forecast vs. Actual Performance Tracking
            </h3>
            <p className="section-subtitle">
              Evaluation of previous model predictions compared against actual recorded telemetry
            </p>
          </div>
          <div>
            <span style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 700, fontSize: '0.78rem' }}>
              Accuracy: {vsActual.accuracy_score_pct}%
            </span>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: '#94a3b8' }}>
                <th style={{ padding: '8px 12px' }}>Date</th>
                <th style={{ padding: '8px 12px' }}>Day</th>
                <th style={{ padding: '8px 12px' }}>Predicted (kWh)</th>
                <th style={{ padding: '8px 12px' }}>Actual (kWh)</th>
                <th style={{ padding: '8px 12px' }}>Difference (Δ)</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Error (%)</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((ev, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                    {ev.date}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#cbd5e1' }}>
                    {ev.day_name}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
                    {ev.predicted_kwh.toFixed(3)}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#34d399', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {ev.actual_kwh.toFixed(3)}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: ev.difference_kwh >= 0 ? '#fb7185' : '#38bdf8' }}>
                    {ev.difference_kwh >= 0 ? `+${ev.difference_kwh.toFixed(3)}` : ev.difference_kwh.toFixed(3)}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: ev.error_pct < 10 ? '#34d399' : ev.error_pct < 25 ? '#fbbf24' : '#fb7185' }}>
                    {ev.error_pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Disclaimer Banner */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid var(--border-subtle)',
        padding: '12px 18px',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: '0.8rem',
        color: '#94a3b8'
      }}>
        <Info size={18} color="#06b6d4" style={{ flexShrink: 0 }} />
        <span>
          <strong>Operational Note:</strong> Energy forecasting is estimated based on historical telemetry trend patterns and standard electrical load profiles. Future consumption may vary with occupancy changes or seasonal temperature shifts.
        </span>
      </div>
    </div>
  );
}
