import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  CheckCheck, 
  Zap, 
  Gauge, 
  Activity, 
  Play, 
  ShieldAlert 
} from 'lucide-react';
import { fetchAlerts, acknowledgeAlert, clearAllAlerts, simulateAlert } from '../services/api';

export default function AlertsCenter({ onAlertsChanged }) {
  const [filter, setFilter] = useState('0'); // '0' = Active, '1' = Resolved, 'all' = All
  const [alerts, setAlerts] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [simulationLoading, setSimulationLoading] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  async function loadAlerts() {
    setIsLoading(true);
    try {
      const res = await fetchAlerts(filter);
      setAlerts(res.data || []);
      setActiveCount(res.active_count || 0);
      if (onAlertsChanged) onAlertsChanged(res.active_count || 0);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAcknowledge(id) {
    try {
      await acknowledgeAlert(id);
      loadAlerts();
    } catch (err) {
      console.error('Failed to ack alert:', err);
    }
  }

  async function handleClearAll() {
    try {
      await clearAllAlerts();
      loadAlerts();
    } catch (err) {
      console.error('Failed to clear alerts:', err);
    }
  }

  async function handleSimulate(channel, type, val) {
    setSimulationLoading(true);
    try {
      await simulateAlert(channel, type, val);
      await loadAlerts();
    } catch (err) {
      console.error('Failed to simulate alert:', err);
    } finally {
      setSimulationLoading(false);
    }
  }

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL' && !a.is_resolved).length;
  const warningCount = alerts.filter(a => a.severity === 'WARNING' && !a.is_resolved).length;

  return (
    <div className="page-container">
      {/* Standardized Page Header Card */}
      <div className="page-header-card">
        <div className="page-header-title-group">
          <h2 className="page-header-title">
            <Bell size={22} color={activeCount > 0 ? '#fb7185' : '#10b981'} />
            Alerts &amp; Load Anomaly Detection Center
          </h2>
          <p className="page-header-subtitle">
            Real-time threshold surveillance, over-power detection, and voltage brownout alarms
          </p>
        </div>

        <div className="page-header-actions">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            background: activeCount > 0 ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${activeCount > 0 ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            fontSize: '0.78rem',
            fontWeight: 700,
            color: activeCount > 0 ? '#fb7185' : '#34d399'
          }}>
            <div style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: activeCount > 0 ? '#f43f5e' : '#10b981'
            }} className={activeCount > 0 ? 'live-pulse' : ''} />
            <span>{activeCount} Active Notification(s)</span>
          </div>
        </div>
      </div>

      {/* 4-Up KPI Stat Cards */}
      <div className="grid-kpi-4">
        {/* Active Alerts */}
        <div className="kpi-card" style={{
          borderLeft: `4px solid ${activeCount > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'}`
        }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Active Alerts</span>
            <div className="kpi-icon-container" style={{
              background: activeCount > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: activeCount > 0 ? '#fb7185' : '#34d399'
            }}>
              <Bell size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: activeCount > 0 ? '#fb7185' : '#34d399' }}>
              {activeCount}
            </span>
            <span className="kpi-unit">Unresolved</span>
          </div>
          <div className="kpi-subtext">
            <span>{activeCount === 0 ? 'All parameters operating within safe limits' : 'Anomalies requiring review'}</span>
          </div>
        </div>

        {/* Over-Power Surges */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-rose)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Over-Power Surges</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185' }}>
              <Zap size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#fb7185' }}>
              {criticalCount}
            </span>
            <span className="kpi-unit">Critical</span>
          </div>
          <div className="kpi-subtext">
            <span>Exceeded rated appliance thresholds</span>
          </div>
        </div>

        {/* Voltage Fluctuations */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-amber)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Voltage Anomalies</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <Gauge size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#fbbf24' }}>
              {warningCount}
            </span>
            <span className="kpi-unit">Warnings</span>
          </div>
          <div className="kpi-subtext">
            <span>Grid voltage &gt;255V or &lt;195V</span>
          </div>
        </div>

        {/* Detection Engine */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Detection Engine</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#38bdf8' }}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#38bdf8', fontSize: '1.3rem' }}>
              ONLINE
            </span>
          </div>
          <div className="kpi-subtext">
            <span>Rule-based telemetry surveillance</span>
          </div>
        </div>
      </div>

      {/* Interactive Anomaly Simulator */}
      <div className="glass-card" style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.25)',
        borderLeft: '4px solid var(--accent-cyan)'
      }}>
        <div className="section-header">
          <div>
            <h3 className="section-title">
              <Play size={18} color="#06b6d4" />
              Live Anomaly Testing &amp; Demonstration Sandbox
            </h3>
            <p className="section-subtitle">
              Trigger simulated electrical faults to verify real-time alert dispatch and rule detection
            </p>
          </div>
          <span style={{
            fontSize: '0.72rem',
            padding: '3px 8px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(6, 182, 212, 0.15)',
            color: '#38bdf8',
            fontWeight: 600
          }}>
            Demo Sandbox
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
          <button
            onClick={() => handleSimulate(1, 'OVER_POWER', 2450.0)}
            disabled={simulationLoading}
            style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fb7185',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s'
            }}
          >
            <Zap size={15} />
            <span>Simulate 2450W Surge (Ch 1)</span>
          </button>

          <button
            onClick={() => handleSimulate(2, 'VOLTAGE_HIGH', 258.5)}
            disabled={simulationLoading}
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s'
            }}
          >
            <Gauge size={15} />
            <span>Simulate 258V High Grid (Ch 2)</span>
          </button>

          <button
            onClick={() => handleSimulate(1, 'VOLTAGE_LOW', 188.0)}
            disabled={simulationLoading}
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s'
            }}
          >
            <Gauge size={15} />
            <span>Simulate 188V Brownout (Ch 1)</span>
          </button>

          <button
            onClick={() => handleSimulate(2, 'LOW_POWER_FACTOR', 0.42)}
            disabled={simulationLoading}
            style={{
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#818cf8',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s'
            }}
          >
            <Activity size={15} />
            <span>Simulate 0.42 PF Loss (Ch 2)</span>
          </button>
        </div>
      </div>

      {/* Alerts Table & History */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: 3, border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setFilter('0')}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                background: filter === '0' ? '#f43f5e' : 'transparent',
                color: filter === '0' ? '#fff' : 'var(--text-secondary)',
                fontWeight: filter === '0' ? 700 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilter('1')}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                background: filter === '1' ? 'var(--accent-emerald)' : 'transparent',
                color: filter === '1' ? '#fff' : 'var(--text-secondary)',
                fontWeight: filter === '1' ? 700 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Resolved
            </button>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                background: filter === 'all' ? 'var(--accent-cyan)' : 'transparent',
                color: filter === 'all' ? '#0f172a' : 'var(--text-secondary)',
                fontWeight: filter === 'all' ? 700 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              All Alerts
            </button>
          </div>

          {activeCount > 0 && (
            <button
              onClick={handleClearAll}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.78rem', color: '#fb7185' }}
            >
              <CheckCheck size={15} />
              <span>Acknowledge All Active</span>
            </button>
          )}
        </div>

        {/* Alerts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.length > 0 ? (
            alerts.map(alert => {
              const isCritical = alert.severity === 'CRITICAL';
              const isWarning = alert.severity === 'WARNING';

              return (
                <div
                  key={alert.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: alert.is_resolved 
                      ? 'rgba(255, 255, 255, 0.02)' 
                      : isCritical 
                        ? 'rgba(244, 63, 94, 0.08)' 
                        : 'rgba(245, 158, 11, 0.08)',
                    border: `1px solid ${
                      alert.is_resolved 
                        ? 'var(--border-subtle)' 
                        : isCritical 
                          ? 'rgba(244, 63, 94, 0.3)' 
                          : 'rgba(245, 158, 11, 0.3)'
                    }`,
                    borderLeft: `4px solid ${
                      alert.is_resolved
                        ? '#64748b'
                        : isCritical
                          ? '#f43f5e'
                          : '#f59e0b'
                    }`,
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-sm)',
                      background: alert.is_resolved 
                        ? 'rgba(148, 163, 184, 0.1)' 
                        : isCritical 
                          ? 'rgba(244, 63, 94, 0.2)' 
                          : 'rgba(245, 158, 11, 0.2)',
                      color: alert.is_resolved 
                        ? '#94a3b8' 
                        : isCritical 
                          ? '#fb7185' 
                          : '#fbbf24',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {isCritical ? <AlertOctagon size={18} /> : <AlertTriangle size={18} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-xs)',
                          background: isCritical ? '#f43f5e' : isWarning ? '#f59e0b' : '#06b6d4',
                          color: '#fff',
                          textTransform: 'uppercase'
                        }}>
                          {alert.severity}
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-xs)',
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: '#cbd5e1',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          Channel {alert.channel_id}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {alert.timestamp}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 600, color: alert.is_resolved ? '#94a3b8' : '#f8fafc' }}>
                        {alert.message}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    {!alert.is_resolved ? (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                      >
                        <CheckCircle2 size={14} />
                        <span>Acknowledge</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} /> Resolved
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
              <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '0.84rem' }}>No alerts matching the selected filter.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
