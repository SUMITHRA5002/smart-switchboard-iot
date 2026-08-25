import React from 'react';
import { 
  Zap, 
  Activity, 
  Gauge, 
  Clock, 
  Layers, 
  Power, 
  TrendingUp,
  Cpu
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';

export default function LiveMonitoring({ 
  latestReadings, 
  liveHistory, 
  isOnline, 
  lastUpdated 
}) {
  // Extract readings for Channel 1 and Channel 2
  const pzem1 = latestReadings.find(r => r.channel_id === 1) || null;
  const pzem2 = latestReadings.find(r => r.channel_id === 2) || null;

  const totalPower = (pzem1?.power || 0) + (pzem2?.power || 0);
  const totalCurrent = (pzem1?.current || 0) + (pzem2?.current || 0);
  const avgVoltage = ((pzem1?.voltage || 0) + (pzem2?.voltage || 0)) / (latestReadings.length || 1);

  return (
    <div className="page-container">
      {/* Standardized Page Header Card */}
      <div className="page-header-card">
        <div className="page-header-title-group">
          <h2 className="page-header-title">
            <Activity size={22} color="#10b981" />
            Live Telemetry &amp; Real-Time Monitoring
          </h2>
          <p className="page-header-subtitle">
            Sub-second electrical telemetry streaming directly from ESP32 Dual PZEM-004T sensor channels
          </p>
        </div>

        <div className="page-header-actions">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            background: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
            border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            fontSize: '0.78rem',
            fontWeight: 600,
            color: isOnline ? '#34d399' : '#fb7185'
          }}>
            <div style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: isOnline ? '#10b981' : '#f43f5e'
            }} className={isOnline ? 'live-pulse' : ''} />
            <span>{isOnline ? 'ESP32 Node Online' : 'Hardware Disconnected'}</span>
          </div>
        </div>
      </div>

      {/* Standard 4-Up KPI Cards */}
      <div className="grid-kpi-4">
        {/* Total Active Load */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Total Active Load</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <Zap size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-gradient-emerald">
              {totalPower.toFixed(1)}
            </span>
            <span className="kpi-unit">Watts</span>
          </div>
          <div className="kpi-subtext">
            <Activity size={12} color="#10b981" />
            <span>Combined load on all channels</span>
          </div>
        </div>

        {/* Total Current */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Total Current</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#38bdf8' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-gradient-cyan">
              {totalCurrent.toFixed(2)}
            </span>
            <span className="kpi-unit">Amperes</span>
          </div>
          <div className="kpi-subtext">
            <span>Sum of active current draw</span>
          </div>
        </div>

        {/* Grid Voltage */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-amber)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Grid AC Voltage</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <Gauge size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#fbbf24' }}>
              {avgVoltage.toFixed(1)}
            </span>
            <span className="kpi-unit">Volts AC</span>
          </div>
          <div className="kpi-subtext">
            <span>Nominal 230V standard supply</span>
          </div>
        </div>

        {/* Monitoring Status */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-indigo)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Channel Status</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Layers size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#818cf8' }}>
              {latestReadings.length} / 2
            </span>
            <span className="kpi-unit">PZEM Modules</span>
          </div>
          <div className="kpi-subtext">
            <Clock size={12} />
            <span>{lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Waiting for sync...'}</span>
          </div>
        </div>
      </div>

      {/* Appliance Specific Detail Cards */}
      <div className="grid-responsive-2">
        <ApplianceCard channel={1} data={pzem1} isOnline={isOnline} />
        <ApplianceCard channel={2} data={pzem2} isOnline={isOnline} />
      </div>

      {/* Live Power Stream Area Chart */}
      <div className="glass-card">
        <div className="section-header">
          <div>
            <h3 className="section-title">
              <Activity size={18} color="#10b981" />
              Real-Time Power Timeline (Streaming)
            </h3>
            <p className="section-subtitle">
              Live telemetry streaming continuously from ESP32 PZEM sensor hardware
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.75rem', color: '#94a3b8' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#10b981' }} /> PZEM 1
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#06b6d4' }} /> PZEM 2
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#818cf8' }} /> Total Load
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: 280 }}>
          {liveHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liveHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPzem1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPzem2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" W" />
                <Tooltip 
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
                  }}
                  itemStyle={{ fontSize: '0.82rem' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="totalPower" 
                  name="Total Power" 
                  stroke="#818cf8" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="pzem1Power" 
                  name="PZEM 1 (Appliance 1)" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPzem1)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="pzem2Power" 
                  name="PZEM 2 (Appliance 2)" 
                  stroke="#06b6d4" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPzem2)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              Waiting for live telemetry stream from ESP32...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Sub-component for individual appliance card
 */
function ApplianceCard({ channel, data, isOnline }) {
  const isActive = (data?.power || 0) > 2.0;

  return (
    <div className="glass-card" style={{
      borderLeft: `4px solid ${channel === 1 ? 'var(--accent-emerald)' : 'var(--accent-cyan)'}`
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-sm)',
            background: channel === 1 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)',
            color: channel === 1 ? '#34d399' : '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Power size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#fff' }}>
              {data?.appliance_name || `Appliance ${channel} (PZEM ${channel})`}
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              UART {channel === 1 ? 'Serial2 (GPIO 26/27)' : 'Serial1 (GPIO 16/17)'}
            </span>
          </div>
        </div>

        <div style={{
          padding: '3px 9px',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.73rem',
          fontWeight: 600,
          background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.1)',
          color: isActive ? '#34d399' : '#94a3b8',
          border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`
        }}>
          {isActive ? '● LOAD ACTIVE' : '○ STANDBY'}
        </div>
      </div>

      {/* Grid of Electrical Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {/* Power */}
        <div style={{ background: 'rgba(0, 0, 0, 0.22)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>
            Power
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 700, color: channel === 1 ? '#34d399' : '#38bdf8' }}>
            {(data?.power || 0).toFixed(1)} <span style={{ fontSize: '0.72rem', color: '#64748b' }}>W</span>
          </div>
        </div>

        {/* Current */}
        <div style={{ background: 'rgba(0, 0, 0, 0.22)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>
            Current
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
            {(data?.current || 0).toFixed(2)} <span style={{ fontSize: '0.72rem', color: '#64748b' }}>A</span>
          </div>
        </div>

        {/* Voltage */}
        <div style={{ background: 'rgba(0, 0, 0, 0.22)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>
            Voltage
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
            {(data?.voltage || 0).toFixed(1)} <span style={{ fontSize: '0.72rem', color: '#64748b' }}>V</span>
          </div>
        </div>

        {/* Energy */}
        <div style={{ background: 'rgba(0, 0, 0, 0.22)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>
            Energy
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 700, color: '#fbbf24' }}>
            {(data?.energy || 0).toFixed(2)} <span style={{ fontSize: '0.72rem', color: '#64748b' }}>kWh</span>
          </div>
        </div>

        {/* Frequency */}
        <div style={{ background: 'rgba(0, 0, 0, 0.22)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>
            Frequency
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
            {(data?.frequency || 0).toFixed(1)} <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Hz</span>
          </div>
        </div>

        {/* Power Factor */}
        <div style={{ background: 'rgba(0, 0, 0, 0.22)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>
            Power Factor
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 700, color: '#a78bfa' }}>
            {(data?.power_factor || 0).toFixed(2)} <span style={{ fontSize: '0.72rem', color: '#64748b' }}>PF</span>
          </div>
        </div>
      </div>
    </div>
  );
}
