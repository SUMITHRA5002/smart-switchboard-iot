import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Info, 
  RefreshCw, 
  TrendingUp, 
  BarChart2, 
  Sparkles,
  Compass
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { fetchApplianceBehaviourDeviation } from '../services/api';

export default function ApplianceBehaviour() {
  const [behaviourData, setBehaviourData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    loadBehaviour();
  }, []);

  async function loadBehaviour() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchApplianceBehaviourDeviation();
      setBehaviourData(data);
    } catch (err) {
      console.error('Failed to load appliance behaviour data:', err);
      setErrorMessage(err.message || 'Failed to analyze appliance behaviour');
    } finally {
      setIsLoading(false);
    }
  }

  const summary = behaviourData?.summary || {};
  const appliances = behaviourData?.appliances || [];

  // Visual Chart Data formatting: Compare Historical Baseline Power (W) vs Current Power (W)
  const chartData = appliances.map(app => ({
    name: app.appliance_name,
    baselinePower: app.historical_avg_power_w,
    currentPower: app.current_power_w
  }));

  // Classification styling helper
  function getClassificationStyle(classification) {
    switch (classification) {
      case 'NORMAL':
        return {
          label: 'Normal Operation',
          color: '#10b981',
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.35)',
          icon: <CheckCircle2 size={15} color="#34d399" />
        };
      case 'EXPECTED_INCREASE':
        return {
          label: 'Expected Increase',
          color: '#38bdf8',
          bg: 'rgba(6, 182, 212, 0.15)',
          border: 'rgba(6, 182, 212, 0.35)',
          icon: <TrendingUp size={15} color="#38bdf8" />
        };
      case 'SLIGHTLY_HIGHER':
        return {
          label: 'Slightly Higher',
          color: '#fbbf24',
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.35)',
          icon: <AlertTriangle size={15} color="#fbbf24" />
        };
      case 'UNUSUAL':
        return {
          label: 'Unusual Behaviour',
          color: '#f97316',
          bg: 'rgba(249, 115, 22, 0.15)',
          border: 'rgba(249, 115, 22, 0.35)',
          icon: <AlertTriangle size={15} color="#f97316" />
        };
      case 'CRITICAL':
        return {
          label: 'Critical Deviation',
          color: '#f43f5e',
          bg: 'rgba(244, 63, 94, 0.15)',
          border: 'rgba(244, 63, 94, 0.35)',
          icon: <ShieldAlert size={15} color="#f43f5e" />
        };
      default:
        return {
          label: classification,
          color: '#cbd5e1',
          bg: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.1)',
          icon: <Info size={15} color="#cbd5e1" />
        };
    }
  }

  return (
    <div className="page-container">
      {/* Standardized Page Header Card */}
      <div className="page-header-card">
        <div className="page-header-title-group">
          <h2 className="page-header-title">
            <Compass size={22} color="#fbbf24" />
            Context-Aware Appliance Behaviour Deviation Detection
          </h2>
          <p className="page-header-subtitle">
            Detects shifts in load intensity against individual appliance historical baselines, factoring in operational runtime and usage context
          </p>
        </div>

        <div className="page-header-actions">
          <button
            onClick={loadBehaviour}
            className="btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
          >
            <RefreshCw size={13} className={isLoading ? 'live-pulse' : ''} />
            Refresh Analysis
          </button>
        </div>
      </div>

      {errorMessage && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', fontSize: '0.82rem' }}>
          {errorMessage}
        </div>
      )}

      {/* Top 4 Executive KPI Cards */}
      <div className="grid-kpi-4">
        {/* Normal Appliances */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Normal Operation</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-gradient-emerald">
              {summary.normal_count || 0}
            </span>
            <span className="kpi-unit">Appliance(s)</span>
          </div>
          <div className="kpi-subtext">
            <span>Within expected baseline limits</span>
          </div>
        </div>

        {/* Expected Increase */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Expected Increase</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#38bdf8' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-gradient-cyan">
              {summary.expected_increase_count || 0}
            </span>
            <span className="kpi-unit">Appliance(s)</span>
          </div>
          <div className="kpi-subtext">
            <span>Explained by higher runtime/usage</span>
          </div>
        </div>

        {/* Unusual Deviations */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-amber)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Unusual Shifts</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#f97316' }}>
              {(summary.slightly_higher_count || 0) + (summary.unusual_count || 0)}
            </span>
            <span className="kpi-unit">Appliance(s)</span>
          </div>
          <div className="kpi-subtext">
            <span>Unexplained baseline shifts</span>
          </div>
        </div>

        {/* Critical Anomaly Deviations */}
        <div className="kpi-card highlight-rose" style={{
          background: (summary.critical_count > 0) 
            ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)' 
            : 'var(--bg-card)',
          border: `1px solid ${(summary.critical_count > 0) ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-subtle)'}`
        }}>
          <div className="kpi-card-header">
            <span className="kpi-label" style={{ color: '#fb7185' }}>Critical Deviations</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(244, 63, 94, 0.25)', color: '#f43f5e' }}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#fb7185' }}>
              {summary.critical_count || 0}
            </span>
            <span className="kpi-unit">Appliance(s)</span>
          </div>
          <div className="kpi-subtext" style={{ color: '#cbd5e1' }}>
            <span>Persistent unexplained surges</span>
          </div>
        </div>
      </div>

      {/* Visual Baseline Comparison Chart */}
      <div className="glass-card">
        <div className="section-header">
          <div>
            <h3 className="section-title">
              <BarChart2 size={18} color="#06b6d4" />
              Historical Baseline vs. Current Active Power Draw (W)
            </h3>
            <p className="section-subtitle">
              Side-by-side comparison of normal operating power draw against latest telemetry
            </p>
          </div>
        </div>

        <div style={{ width: '100%', height: 250 }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" W" />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }}
                  formatter={(val, name) => [`${val} W`, name === 'baselinePower' ? 'Historical Baseline' : 'Current Active Power']}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right"
                  formatter={(val) => <span style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>{val === 'baselinePower' ? 'Historical Baseline (W)' : 'Current Active Power (W)'}</span>}
                />
                <Bar dataKey="baselinePower" fill="#818cf8" radius={[4, 4, 0, 0]} name="baselinePower" />
                <Bar dataKey="currentPower" fill="#06b6d4" radius={[4, 4, 0, 0]} name="currentPower" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.82rem' }}>
              No telemetry data available for comparison
            </div>
          )}
        </div>
      </div>

      {/* Detailed Appliance Behaviour Cards Grid */}
      <div className="grid-responsive-2">
        {appliances.map(app => {
          const cStyle = getClassificationStyle(app.classification);

          return (
            <div
              key={app.channel_id}
              className="glass-card"
              style={{
                borderLeft: `4px solid ${cStyle.color}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                      {app.appliance_name}
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#94a3b8'
                    }}>
                      Channel {app.channel_id} • {app.category}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 9px',
                  borderRadius: 'var(--radius-sm)',
                  background: cStyle.bg,
                  border: `1px solid ${cStyle.border}`,
                  color: cStyle.color,
                  fontSize: '0.74rem',
                  fontWeight: 700
                }}>
                  {cStyle.icon}
                  <span>{cStyle.label}</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Current Power</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                    {app.current_power_w} W
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                    Base: {app.historical_avg_power_w} W
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Power Deviation</div>
                  <div style={{
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: app.power_deviation_percentage > 30 ? '#fb7185' : app.power_deviation_percentage > 15 ? '#fbbf24' : '#34d399'
                  }}>
                    {app.power_deviation_percentage >= 0 ? `+${app.power_deviation_percentage}%` : `${app.power_deviation_percentage}%`}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                    vs. Baseline Draw
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Confidence</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#38bdf8' }}>
                    {app.confidence}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                    {app.confidence_score}% Score
                  </div>
                </div>
              </div>

              {/* Contextual Reason Textbox */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.22)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: '#cbd5e1',
                lineHeight: 1.45
              }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>
                  Contextual Evidence:
                </div>
                {app.reason}
              </div>

              {/* Recommendation Note */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: '#94a3b8' }}>
                <Sparkles size={13} color="#34d399" />
                <span><strong>Recommendation:</strong> {app.recommendation}</span>
              </div>
            </div>
          );
        })}
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
          <strong>Operational Context:</strong> Behaviour deviation classifies load shifts relative to the appliance's own historical power and operating runtime profiles. It does not measure physical electrical leakage, ground faults, or refrigerant leaks.
        </span>
      </div>
    </div>
  );
}
