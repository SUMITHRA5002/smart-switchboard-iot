import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Leaf, 
  TrendingDown, 
  Zap, 
  IndianRupee, 
  CheckCircle2, 
  Lightbulb, 
  Layers, 
  Globe, 
  TreePine, 
  Trophy,
  Calculator,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import { 
  fetchEnergyInsights, 
  fetchApplianceRanking, 
  fetchSavingsSimulation 
} from '../services/api';

export default function EnergyIntelligence({ tariff, setTariff }) {
  const [emissionFactor, setEmissionFactor] = useState(0.82);
  const [insights, setInsights] = useState(null);
  const [rankingData, setRankingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  // Simulator state
  const [simChannel, setSimChannel] = useState(1);
  const [simHoursSaved, setSimHoursSaved] = useState(2.0);
  const [simDailyHours, setSimDailyHours] = useState(8.0);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Load intelligence and ranking data
  useEffect(() => {
    loadAllIntelligence();
  }, [tariff, emissionFactor]);

  // Run savings simulation whenever simulation parameters change
  useEffect(() => {
    runSimulation();
  }, [simChannel, simHoursSaved, simDailyHours, tariff, emissionFactor]);

  async function loadAllIntelligence() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [insightsRes, rankingRes] = await Promise.all([
        fetchEnergyInsights(tariff, emissionFactor),
        fetchApplianceRanking(tariff, emissionFactor).catch(() => null)
      ]);
      setInsights(insightsRes);
      setRankingData(rankingRes);
    } catch (err) {
      console.error('Failed to load energy intelligence:', err);
      setErrorMessage(err.message || 'Failed to load energy intelligence');
    } finally {
      setIsLoading(false);
    }
  }

  async function runSimulation() {
    setSimLoading(true);
    try {
      const res = await fetchSavingsSimulation({
        channel: simChannel,
        hoursSavedPerDay: simHoursSaved,
        dailyHours: simDailyHours,
        tariff: tariff,
        emissionFactor: emissionFactor
      });
      setSimResult(res);
    } catch (err) {
      console.warn('Simulation error:', err.message);
    } finally {
      setSimLoading(false);
    }
  }

  const summary = insights?.summary || {};
  const appliances = insights?.appliances || [];
  const rankedAppliances = rankingData?.appliances || appliances.map((a, i) => ({
    rank: i + 1,
    channel_id: a.channel_id,
    appliance: a.appliance_name,
    category: a.category,
    current_power_w: a.current_power_w,
    monthly_kwh: a.projected_monthly_kwh,
    monthly_cost: a.projected_monthly_cost,
    contribution_percent: a.energy_share_pct,
    status: a.energy_share_pct >= 40 ? 'HIGH' : a.energy_share_pct >= 15 ? 'MODERATE' : 'OPTIMAL'
  }));

  const highestAppliance = rankingData?.highest_consuming_appliance || (appliances[0]?.appliance_name || 'Air Conditioner');
  const highestShare = rankingData?.highest_consuming_share_pct || (appliances[0]?.energy_share_pct || 0);

  const allRecommendations = insights?.recommendations || [];
  const filteredRecs = filterSeverity === 'ALL'
    ? allRecommendations
    : filterSeverity === 'HIGH'
      ? allRecommendations.filter(r => r.severity === 'HIGH' || r.severity === 'CRITICAL')
      : allRecommendations.filter(r => r.severity === 'MEDIUM' || r.severity === 'LOW');

  // Chart data for carbon footprint per appliance
  const carbonChartData = appliances.map(a => ({
    name: a.appliance_name,
    co2: a.projected_monthly_co2_kg,
    share: a.energy_share_pct
  }));

  // Tree equivalent calculation (1 mature tree absorbs ~21.77 kg CO2 / year = ~1.81 kg CO2 / month)
  const treesNeededMonthly = summary.total_monthly_projected_co2_kg 
    ? Math.max(1, Math.round(summary.total_monthly_projected_co2_kg / 1.81))
    : 0;

  return (
    <div className="page-container">
      {/* Standardized Page Header Card */}
      <div className="page-header-card">
        <div className="page-header-title-group">
          <h2 className="page-header-title">
            <Sparkles size={22} color="#10b981" />
            Smart Energy Optimization &amp; Intelligence Engine
          </h2>
          <p className="page-header-subtitle">
            Appliance ranking leaderboard, "What-If" savings simulator, monthly projections, and carbon emissions modeling
          </p>
        </div>

        {/* Configurable Parameters Controls */}
        <div className="page-header-actions">
          {/* Tariff Input */}
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

          {/* Emission Factor Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-input)', padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <Leaf size={14} color="#10b981" />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Grid EF:</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={emissionFactor}
              onChange={(e) => setEmissionFactor(parseFloat(e.target.value) || 0.82)}
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
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>kg/kWh</span>
          </div>

          <button
            onClick={loadAllIntelligence}
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

      {/* Top 6 Executive Metric Cards */}
      <div className="grid-kpi-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {/* Measured Energy */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Measured Energy</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#38bdf8' }}>
              <Zap size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-gradient-cyan">
              {(summary.total_measured_energy_kwh || 0).toFixed(3)}
            </span>
            <span className="kpi-unit">kWh</span>
          </div>
          <div className="kpi-subtext">
            <span>Cumulative sensor readings</span>
          </div>
        </div>

        {/* Projected Monthly Energy */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-indigo)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Projected Monthly</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Layers size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-gradient-indigo">
              {(summary.total_monthly_projected_kwh || 0).toFixed(1)}
            </span>
            <span className="kpi-unit">kWh / mo</span>
          </div>
          <div className="kpi-subtext">
            <span>Estimated 30-day baseline</span>
          </div>
        </div>

        {/* Projected Monthly Cost */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-amber)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Monthly Projected Bill</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-unit" style={{ fontSize: '1.1rem', color: '#fbbf24' }}>₹</span>
            <span className="kpi-value" style={{ color: '#fbbf24' }}>
              {(summary.total_monthly_projected_cost || 0).toFixed(2)}
            </span>
          </div>
          <div className="kpi-subtext">
            <span>At ₹{tariff.toFixed(2)} / unit rate</span>
          </div>
        </div>

        {/* Top Consumer (#1) */}
        <div className="kpi-card" style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(244, 63, 94, 0.08) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderLeft: '4px solid var(--accent-amber)'
        }}>
          <div className="kpi-card-header">
            <span className="kpi-label" style={{ color: '#fbbf24' }}>Top Consumer (#1)</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24' }}>
              <Trophy size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {highestAppliance}
          </div>
          <div className="kpi-subtext" style={{ color: '#fbbf24', fontWeight: 600 }}>
            <span>Accounts for {highestShare}% of load</span>
          </div>
        </div>

        {/* Potential Savings */}
        <div className="kpi-card highlight-emerald" style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.12) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.4)'
        }}>
          <div className="kpi-card-header">
            <span className="kpi-label" style={{ color: '#34d399' }}>Potential Savings</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#fff' }}>
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-unit" style={{ fontSize: '1.1rem', color: '#34d399' }}>₹</span>
            <span className="kpi-value text-gradient-emerald">
              {(summary.potential_monthly_savings_cost || 0).toFixed(2)}
            </span>
            <span className="kpi-unit">/ mo</span>
          </div>
          <div className="kpi-subtext" style={{ color: '#cbd5e1' }}>
            <span>Save {(summary.potential_monthly_savings_kwh || 0).toFixed(1)} kWh</span>
          </div>
        </div>

        {/* Carbon Footprint */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Carbon Footprint</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <Globe size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-gradient-emerald">
              {(summary.total_monthly_projected_co2_kg || 0).toFixed(2)}
            </span>
            <span className="kpi-unit">kg CO₂</span>
          </div>
          <div className="kpi-subtext">
            <span>~{treesNeededMonthly} tree-months offset</span>
          </div>
        </div>
      </div>

      {/* Feature 1: Appliance Energy Ranking Leaderboard */}
      <div className="glass-card">
        <div className="section-header">
          <div>
            <h3 className="section-title">
              <Trophy size={18} color="#fbbf24" />
              Appliance Energy Ranking Leaderboard
            </h3>
            <p className="section-subtitle">
              Comparative ranking based on projected monthly consumption and contribution share
            </p>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {rankedAppliances.length} Monitored Channel(s)
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rankedAppliances.map((app) => {
            const isRank1 = app.rank === 1;
            const isHigh = app.status === 'HIGH';
            const isMod = app.status === 'MODERATE';
            const statusColor = isHigh ? '#fb7185' : isMod ? '#fbbf24' : '#34d399';
            const statusBg = isHigh ? 'rgba(244,63,94,0.15)' : isMod ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)';

            return (
              <div
                key={app.channel_id}
                style={{
                  background: isRank1 ? 'rgba(30, 41, 59, 0.85)' : 'rgba(15, 23, 42, 0.7)',
                  border: isRank1 ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  alignItems: 'center',
                  gap: 14
                }}
              >
                {/* Rank & Appliance Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: isRank1 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.08)',
                    color: isRank1 ? '#0f172a' : '#cbd5e1',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isRank1 ? '0 0 10px rgba(245, 158, 11, 0.4)' : 'none'
                  }}>
                    #{app.rank}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>
                      {app.appliance}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Ch {app.channel_id}</span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>•</span>
                      <span style={{ fontSize: '0.68rem', color: '#38bdf8' }}>{app.category}</span>
                    </div>
                  </div>
                </div>

                {/* Energy & Share Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
                    <span style={{ color: '#94a3b8' }}>Load Contribution</span>
                    <strong style={{ color: isRank1 ? '#fbbf24' : '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                      {app.contribution_percent}%
                    </strong>
                  </div>
                  <div style={{ width: '100%', height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, Math.max(5, app.contribution_percent))}%`,
                      height: '100%',
                      background: isRank1 ? 'linear-gradient(90deg, #f59e0b, #fb7185)' : 'linear-gradient(90deg, #06b6d4, #10b981)',
                      borderRadius: 'var(--radius-full)'
                    }} />
                  </div>
                </div>

                {/* Monthly Projections */}
                <div style={{ display: 'flex', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Monthly Energy</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
                      {app.monthly_kwh} kWh
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Monthly Cost</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                      ₹{app.monthly_cost.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-xs)',
                    background: statusBg,
                    color: statusColor,
                    letterSpacing: '0.03em'
                  }}>
                    {app.status} CONSUMPTION
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature 2: Interactive What-If Savings Simulator */}
      <div className="glass-card" style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(6, 78, 59, 0.3) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        borderLeft: '4px solid var(--accent-emerald)'
      }}>
        <div className="section-header">
          <div>
            <h3 className="section-title">
              <Calculator size={18} color="#34d399" />
              Interactive "What-If" Smart Savings Simulator
            </h3>
            <p className="section-subtitle">
              Simulate daily runtime reductions and see instant monthly, annual, and carbon savings
            </p>
          </div>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(16, 185, 129, 0.2)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.4)'
          }}>
            Real-Time Engine
          </span>
        </div>

        {/* Simulator Controls Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
          background: 'rgba(0,0,0,0.25)',
          padding: 14,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          marginBottom: 14
        }}>
          {/* Target Appliance Selector */}
          <div>
            <label style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: 5 }}>
              Select Appliance:
            </label>
            <select
              value={simChannel}
              onChange={(e) => setSimChannel(Number(e.target.value))}
              style={{
                width: '100%',
                background: '#0f172a',
                color: '#fff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none'
              }}
            >
              {appliances.map(a => (
                <option key={a.channel_id} value={a.channel_id}>
                  {a.appliance_name} (Channel {a.channel_id})
                </option>
              ))}
            </select>
          </div>

          {/* Hours Saved Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 5 }}>
              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Daily Hours Reduced:</span>
              <strong style={{ color: '#34d399', fontFamily: 'var(--font-mono)' }}>{simHoursSaved} hr / day</strong>
            </div>
            <input
              type="range"
              min="0.5"
              max="6.0"
              step="0.5"
              value={simHoursSaved}
              onChange={(e) => setSimHoursSaved(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
            />
          </div>

          {/* Assumed Daily Runtime */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 5 }}>
              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Assumed Daily Runtime:</span>
              <strong style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{simDailyHours} hr / day</strong>
            </div>
            <input
              type="range"
              min="1"
              max="16"
              step="1"
              value={simDailyHours}
              onChange={(e) => setSimDailyHours(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#06b6d4', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Simulation Output Cards */}
        {simResult?.savings_projection && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Monthly Energy Saved</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {simResult.savings_projection.monthly_energy_saved_kwh} kWh
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Monthly Bill Saved</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  ₹{simResult.savings_projection.monthly_money_saved.toFixed(2)}
                </div>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 700 }}>Annual Bill Saved</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  ₹{simResult.savings_projection.annual_money_saved.toFixed(2)}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>CO₂ Emissions Reduced</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {simResult.savings_projection.annual_co2_reduction_kg} kg/yr
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Annual Tree Offset</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  ~{simResult.savings_projection.trees_offset_equivalent_yearly} Trees
                </div>
              </div>
            </div>

            {/* Natural Language Summary Banner */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem',
              color: '#e2e8f0',
              lineHeight: 1.45
            }}>
              💡 <strong>Actionable Impact:</strong> {simResult.summary_sentence}
            </div>
          </div>
        )}
      </div>

      {/* Section: Carbon Footprint Breakdown & Sustainability */}
      <div className="grid-responsive-2">
        {/* Carbon Footprint Chart */}
        <div className="glass-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <Leaf size={18} color="#10b981" />
                Appliance Carbon Contribution (kg CO₂ / mo)
              </h3>
              <p className="section-subtitle">
                Calculated at {emissionFactor} kg CO₂ / kWh grid baseline emission factor
              </p>
            </div>
          </div>

          <div style={{ width: '100%', height: 210 }}>
            {carbonChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={carbonChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" kg" />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }}
                    formatter={(val) => [`${val} kg CO₂`, 'Monthly Footprint']}
                  />
                  <Bar dataKey="co2" radius={[4, 4, 0, 0]}>
                    {carbonChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#06b6d4'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                No carbon data available
              </div>
            )}
          </div>
        </div>

        {/* Sustainability & Tree Offset Context Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="section-header">
              <div>
                <h3 className="section-title">
                  <TreePine size={18} color="#34d399" />
                  Environmental Impact &amp; Offset Context
                </h3>
                <p className="section-subtitle">Fossil fuel grid carbon footprint metrics</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: 12, borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TreePine size={22} />
              </div>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                  ~{treesNeededMonthly} Tree-Months
                </div>
                <div style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
                  Required to sequester your switchboard's projected monthly carbon emissions ({summary.total_monthly_projected_co2_kg || 0} kg CO₂).
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: '0.74rem', color: '#64748b' }}>
            ⚡ Following the recommendations below can offset approximately <strong>{(summary.potential_monthly_savings_co2_kg || 0).toFixed(1)} kg CO₂/month</strong>!
          </div>
        </div>
      </div>

      {/* Section: Explainable Rule-Based Recommendations */}
      <div className="glass-card">
        <div className="section-header">
          <div>
            <h3 className="section-title">
              <Lightbulb size={18} color="#fbbf24" />
              Explainable Energy-Saving Recommendations
            </h3>
            <p className="section-subtitle">
              Data-driven insights generated deterministically from your actual load characteristics
            </p>
          </div>

          {/* Severity Filters */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: 3, border: '1px solid var(--border-subtle)' }}>
            {['ALL', 'HIGH', 'MEDIUM/LOW'].map(f => (
              <button
                key={f}
                onClick={() => setFilterSeverity(f)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-xs)',
                  border: 'none',
                  background: filterSeverity === f ? 'var(--accent-cyan)' : 'transparent',
                  color: filterSeverity === f ? '#0f172a' : 'var(--text-secondary)',
                  fontWeight: filterSeverity === f ? 700 : 500,
                  fontSize: '0.76rem',
                  cursor: 'pointer'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Recommendations List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredRecs.length > 0 ? (
            filteredRecs.map(rec => {
              const isCritical = rec.severity === 'CRITICAL';
              const isHigh = rec.severity === 'HIGH';
              const isMedium = rec.severity === 'MEDIUM';

              const badgeColor = isCritical ? '#f43f5e' : isHigh ? '#f97316' : isMedium ? '#f59e0b' : '#10b981';
              const badgeBg = isCritical ? 'rgba(244,63,94,0.15)' : isHigh ? 'rgba(249,115,22,0.15)' : isMedium ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)';

              return (
                <div
                  key={rec.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: `1px solid ${isCritical ? 'rgba(244,63,94,0.35)' : isHigh ? 'rgba(249,115,22,0.35)' : 'var(--border-subtle)'}`,
                    borderLeft: `4px solid ${badgeColor}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}
                >
                  {/* Top Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-xs)',
                        background: badgeBg,
                        color: badgeColor,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        {rec.severity} PRIORITY
                      </span>

                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>
                        {rec.appliance} (Ch {rec.channel})
                      </span>
                    </div>

                    <div style={{
                      fontSize: '0.72rem',
                      color: '#94a3b8',
                      background: 'rgba(255,255,255,0.04)',
                      padding: '2px 7px',
                      borderRadius: 'var(--radius-xs)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      Priority Score: <strong style={{ color: '#fff' }}>{rec.priority_score} / 100</strong>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#f8fafc', marginBottom: 3 }}>
                      {rec.title}
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                      {rec.description}
                    </p>
                  </div>

                  {/* Reason & Action Items */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                    <div style={{ background: 'rgba(0,0,0,0.22)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.76rem' }}>
                      <span style={{ color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 2 }}>Data Trigger Reason:</span>
                      <span style={{ color: '#e2e8f0' }}>{rec.reason}</span>
                    </div>

                    {rec.action_item && (
                      <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.76rem' }}>
                        <span style={{ color: '#34d399', fontWeight: 700, display: 'block', marginBottom: 2 }}>Actionable Step:</span>
                        <span style={{ color: '#f8fafc' }}>{rec.action_item}</span>
                      </div>
                    )}
                  </div>

                  {/* Estimated Savings Metrics */}
                  {rec.estimated_saving_kwh > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: 8,
                      flexWrap: 'wrap',
                      fontSize: '0.76rem'
                    }}>
                      <div style={{ color: '#94a3b8' }}>Expected Monthly Reduction:</div>
                      <div style={{ color: '#34d399', fontWeight: 700 }}>
                        ⚡ {rec.estimated_saving_kwh} kWh / mo
                      </div>
                      <div style={{ color: '#fbbf24', fontWeight: 700 }}>
                        ₹ {rec.estimated_saving_cost.toFixed(2)} / mo
                      </div>
                      <div style={{ color: '#38bdf8', fontWeight: 700 }}>
                        🌱 {rec.estimated_co2_reduction} kg CO₂ / mo
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
              <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '0.84rem' }}>All monitored appliances are currently operating within optimal parameters.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
