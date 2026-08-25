import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Zap, 
  Clock, 
  Gauge
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  AreaChart, 
  Area 
} from 'recharts';
import { fetchHistoricalTelemetry, fetchAnalyticsSummary } from '../services/api';

export default function EnergyAnalytics({ tariff }) {
  const [range, setRange] = useState('today');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [historyData, setHistoryData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalyticsData();
  }, [range, selectedChannel, tariff]);

  async function loadAnalyticsData() {
    setIsLoading(true);
    setError(null);
    try {
      const [hist, summ] = await Promise.all([
        fetchHistoricalTelemetry(range, selectedChannel),
        fetchAnalyticsSummary(tariff)
      ]);
      setHistoryData(hist);
      setSummaryData(summ);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Format data points for timeline chart
  const timelineChartData = historyData.map(d => ({
    time: d.timestamp ? d.timestamp.split(' ')[1] || d.timestamp : '',
    date: d.timestamp ? d.timestamp.split(' ')[0] : '',
    power: d.power,
    voltage: d.voltage,
    channel: d.channel_id,
    appliance: d.appliance_name
  }));

  // Group by appliance for comparison bar chart
  const applianceBarData = (summaryData?.appliance_breakdown || []).map(a => ({
    name: a.appliance_name,
    energy: a.energy_kwh,
    cost: a.estimated_cost,
    peakPower: a.peak_power_w,
    avgPower: a.avg_power_w
  }));

  return (
    <div className="page-container">
      {/* Standardized Page Header Card */}
      <div className="page-header-card">
        <div className="page-header-title-group">
          <h2 className="page-header-title">
            <BarChart3 size={22} color="#06b6d4" />
            Energy Consumption Analytics
          </h2>
          <p className="page-header-subtitle">
            Historical consumption patterns, load comparisons, and peak power analysis across active channels
          </p>
        </div>

        {/* Filter Controls Group */}
        <div className="page-header-actions">
          <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: 3, border: '1px solid var(--border-subtle)' }}>
            {['today', 'yesterday', '7d', '30d', 'all'].map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-xs)',
                  border: 'none',
                  background: range === r ? 'var(--accent-cyan)' : 'transparent',
                  color: range === r ? '#0f172a' : 'var(--text-secondary)',
                  fontWeight: range === r ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s'
                }}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r}
              </button>
            ))}
          </div>

          {/* Channel Selector */}
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            style={{
              background: 'var(--bg-input)',
              color: '#cbd5e1',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Channels</option>
            {(summaryData?.appliance_breakdown || []).map(app => (
              <option key={app.channel_id} value={app.channel_id}>
                Channel {app.channel_id}: {app.appliance_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4-Up KPI Metrics Row */}
      <div className="grid-kpi-4">
        {/* Total Energy */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Energy Consumed</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-gradient-emerald">
              {(summaryData?.total_energy_kwh || 0).toFixed(3)}
            </span>
            <span className="kpi-unit">kWh</span>
          </div>
          <div className="kpi-subtext">
            <span>In selected filter timeframe</span>
          </div>
        </div>

        {/* Peak Power */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-amber)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Peak Demand Load</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <Zap size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#fbbf24' }}>
              {(summaryData?.peak_power_w || 0).toFixed(1)}
            </span>
            <span className="kpi-unit">Watts</span>
          </div>
          <div className="kpi-subtext">
            <span>Highest instantaneous power recorded</span>
          </div>
        </div>

        {/* Unit Tariff Rate */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Tariff Rate</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#38bdf8' }}>
              <Gauge size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#38bdf8' }}>
              ₹{tariff.toFixed(2)}
            </span>
            <span className="kpi-unit">/ kWh</span>
          </div>
          <div className="kpi-subtext">
            <span>Configurable grid unit rate</span>
          </div>
        </div>

        {/* Total Cost */}
        <div className="kpi-card highlight-emerald">
          <div className="kpi-card-header">
            <span className="kpi-label">Estimated Cost</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-gradient-emerald">
              ₹{(summaryData?.total_estimated_cost || 0).toFixed(2)}
            </span>
          </div>
          <div className="kpi-subtext">
            <span>Calculated period billing cost</span>
          </div>
        </div>
      </div>

      {/* Two Column Charts */}
      <div className="grid-responsive-2">
        {/* Appliance Breakdown */}
        <div className="glass-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <TrendingUp size={18} color="#10b981" />
                Appliance Energy Breakdown (kWh)
              </h3>
              <p className="section-subtitle">
                Cumulative consumption recorded per monitored appliance
              </p>
            </div>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            {applianceBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={applianceBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" kWh" />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }}
                    itemStyle={{ fontSize: '0.82rem' }}
                  />
                  <Bar dataKey="energy" name="Energy (kWh)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                No consumption records for this range.
              </div>
            )}
          </div>
        </div>

        {/* Peak vs Average Power */}
        <div className="glass-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <Zap size={18} color="#f59e0b" />
                Peak vs. Average Power Load (Watts)
              </h3>
              <p className="section-subtitle">
                Demand surge comparison between peak draw and baseline average
              </p>
            </div>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            {applianceBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={applianceBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" W" />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }}
                    itemStyle={{ fontSize: '0.82rem' }}
                  />
                  <Legend 
                    verticalAlign="top"
                    align="right"
                    formatter={(val) => <span style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>{val}</span>}
                  />
                  <Bar dataKey="peakPower" name="Peak Load (W)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgPower" name="Average Load (W)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                No power metrics for this range.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historical Power Timeline */}
      <div className="glass-card">
        <div className="section-header">
          <div>
            <h3 className="section-title">
              <Clock size={18} color="#818cf8" />
              Historical Load Profile Timeline
            </h3>
            <p className="section-subtitle">
              Time-series electrical profile across all recorded timestamps
            </p>
          </div>
        </div>

        <div style={{ width: '100%', height: 260 }}>
          {timelineChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHistPower" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" W" />
                <Tooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }}
                  itemStyle={{ fontSize: '0.82rem' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="power" 
                  name="Active Power (W)" 
                  stroke="#06b6d4" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorHistPower)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.82rem' }}>
              No historical data found for the selected filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
