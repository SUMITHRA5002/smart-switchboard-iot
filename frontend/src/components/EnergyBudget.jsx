import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  RefreshCw, 
  Sparkles, 
  Info
} from 'lucide-react';
import { fetchEnergyBudget, updateEnergyBudget } from '../services/api';

const PRESET_BUDGETS = [250, 500, 1000, 1500, 2000, 3000];

export default function EnergyBudget({ tariff = 7.0, setTariff }) {
  const [budgetData, setBudgetData] = useState(null);
  const [inputBudget, setInputTextBudget] = useState('500');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    loadBudgetData();
  }, [tariff]);

  async function loadBudgetData() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchEnergyBudget(tariff);
      setBudgetData(data);
      if (data?.budget_summary?.monthly_budget_inr) {
        setInputTextBudget(String(data.budget_summary.monthly_budget_inr));
      }
    } catch (err) {
      console.error('Failed to load energy budget:', err);
      setErrorMessage(err.message || 'Failed to load energy budget data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveBudget(e) {
    if (e) e.preventDefault();
    const val = parseFloat(inputBudget);
    if (isNaN(val) || val <= 0) {
      setErrorMessage('Please enter a valid positive budget amount in INR.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccessMsg(null);

    try {
      const res = await updateEnergyBudget(val, 90.0, tariff);
      setBudgetData(res.data || res);
      setSaveSuccessMsg(`Target budget updated to ₹${val.toFixed(2)} / month`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to update budget:', err);
      setErrorMessage(err.message || 'Failed to save budget target');
    } finally {
      setIsSaving(false);
    }
  }

  const bSummary = budgetData?.budget_summary || {};
  const appOpt = budgetData?.appliance_optimization || {};

  const monthlyBudget = bSummary.monthly_budget_inr || 500;
  const currentSpending = bSummary.current_spending_inr || 0;
  const predictedBill = bSummary.predicted_monthend_bill_inr || 0;
  const remainingBudget = bSummary.remaining_budget_inr || 0;
  const expectedExcess = bSummary.expected_excess_inr || 0;
  const status = bSummary.budget_status || 'UNDER_BUDGET';
  const statusLabel = bSummary.budget_status_label || 'Under Budget';
  const statusColor = bSummary.budget_status_color || '#10b981';
  const progressPct = Math.min(100, bSummary.current_progress_pct || 0);
  const utilizationPct = bSummary.forecasted_utilization_pct || 0;

  const isOver = status === 'OVER_BUDGET';
  const isNear = status === 'NEAR_BUDGET';

  return (
    <div className="page-container">
      {/* Standardized Page Header Card */}
      <div className="page-header-card">
        <div className="page-header-title-group">
          <h2 className="page-header-title">
            <Target size={22} color="#10b981" />
            Smart Energy Budget &amp; Goal System
          </h2>
          <p className="page-header-subtitle">
            Define monthly electricity spending targets, monitor forecasted utilization, and receive automatic optimization advice
          </p>
        </div>

        <div className="page-header-actions">
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
            onClick={loadBudgetData}
            className="btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
          >
            <RefreshCw size={13} className={isLoading ? 'live-pulse' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Target Setup Form Card */}
      <div className="glass-card" style={{ padding: '16px 20px' }}>
        <form onSubmit={handleSaveBudget} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>
              Target Monthly Budget:
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'var(--bg-input)',
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-active)'
            }}>
              <span style={{ color: '#34d399', fontWeight: 700, fontSize: '0.9rem' }}>₹</span>
              <input
                type="number"
                min="1"
                step="10"
                value={inputBudget}
                onChange={(e) => setInputTextBudget(e.target.value)}
                style={{
                  width: 85,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.92rem',
                  fontWeight: 700
                }}
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Presets:
            </span>
            {PRESET_BUDGETS.map((amt) => (
              <button
                type="button"
                key={amt}
                onClick={() => setInputTextBudget(String(amt))}
                className={`pill-btn ${inputBudget === String(amt) ? 'active' : ''}`}
              >
                ₹{amt}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary"
            style={{ marginLeft: 'auto' }}
          >
            {isSaving ? 'Saving...' : 'Set Budget Goal'}
          </button>
        </form>

        {saveSuccessMsg && (
          <div style={{ marginTop: 10, color: '#34d399', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={14} />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {errorMessage && (
          <div style={{ marginTop: 10, color: '#fb7185', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Top 4 Executive KPI Cards */}
      <div className="grid-kpi-4">
        {/* Monthly Budget Target */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Target Budget</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <Target size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-unit" style={{ fontSize: '1.1rem', color: '#34d399' }}>₹</span>
            <span className="kpi-value text-gradient-emerald">
              {monthlyBudget.toFixed(2)}
            </span>
          </div>
          <div className="kpi-subtext">
            <span>Household spending limit</span>
          </div>
        </div>

        {/* Current Spending */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Current Spent</span>
            <div className="kpi-icon-container" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#38bdf8' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-unit" style={{ fontSize: '1.1rem', color: '#38bdf8' }}>₹</span>
            <span className="kpi-value text-gradient-cyan">
              {currentSpending.toFixed(2)}
            </span>
          </div>
          <div className="kpi-subtext">
            <span>Consumed: {bSummary.current_consumed_kwh || 0} kWh</span>
          </div>
        </div>

        {/* Predicted Month-End Bill */}
        <div className="kpi-card" style={{ borderLeft: `4px solid ${isOver ? 'var(--accent-rose)' : 'var(--accent-indigo)'}` }}>
          <div className="kpi-card-header">
            <span className="kpi-label">Predicted Month-End</span>
            <div className="kpi-icon-container" style={{ background: isOver ? 'rgba(244, 63, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)', color: isOver ? '#fb7185' : '#818cf8' }}>
              {isOver ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-unit" style={{ fontSize: '1.1rem', color: isOver ? '#fb7185' : '#818cf8' }}>₹</span>
            <span className="kpi-value" style={{ color: isOver ? '#fb7185' : '#818cf8' }}>
              {predictedBill.toFixed(2)}
            </span>
          </div>
          <div className="kpi-subtext">
            <span>Projected: {bSummary.predicted_monthend_kwh || 0} kWh</span>
          </div>
        </div>

        {/* Budget Status Badge Card */}
        <div className="kpi-card" style={{
          background: isOver 
            ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(245, 158, 11, 0.12) 100%)' 
            : 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)',
          border: `1px solid ${statusColor}44`,
          borderLeft: `4px solid ${statusColor}`
        }}>
          <div className="kpi-card-header">
            <span className="kpi-label" style={{ color: statusColor }}>Budget Condition</span>
            <div className="kpi-icon-container" style={{ background: `${statusColor}25`, color: statusColor }}>
              {isOver ? <ShieldAlert size={18} /> : <CheckCircle2 size={18} />}
            </div>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: statusColor, textTransform: 'uppercase' }}>
            {statusLabel}
          </div>
          <div className="kpi-subtext">
            {isOver ? (
              <span style={{ color: '#fb7185', fontWeight: 600 }}>Overrun: +₹{expectedExcess.toFixed(2)}</span>
            ) : (
              <span style={{ color: '#34d399', fontWeight: 600 }}>Cushion: -₹{remainingBudget.toFixed(2)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Goal Progress Bar Card */}
      <div className="glass-card">
        <div className="section-header">
          <div>
            <h3 className="section-title">
              <Wallet size={18} color="#06b6d4" />
              Budget Target Progress &amp; Forecasted Utilization
            </h3>
            <p className="section-subtitle">Real-time spend against projected monthly threshold</p>
          </div>
          <div>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: statusColor }}>
              {utilizationPct}% Forecasted Load
            </span>
          </div>
        </div>

        {/* Multi-Segment Progress Bar */}
        <div style={{
          width: '100%',
          height: 14,
          background: 'rgba(15, 23, 42, 0.8)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid var(--border-subtle)'
        }}>
          <div
            style={{
              width: `${Math.min(100, utilizationPct)}%`,
              height: '100%',
              background: isOver 
                ? 'linear-gradient(90deg, #f59e0b 0%, #f43f5e 100%)' 
                : isNear
                ? 'linear-gradient(90deg, #10b981 0%, #f59e0b 100%)'
                : 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)',
              transition: 'width 0.4s ease-in-out'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: '0.74rem', color: '#94a3b8' }}>
          <span>Current Spent: ₹{currentSpending.toFixed(2)} ({progressPct}%)</span>
          <span>Target Budget: ₹{monthlyBudget.toFixed(2)}</span>
          <span style={{ color: isOver ? '#fb7185' : '#34d399', fontWeight: 600 }}>
            {isOver ? `Projected Overrun: +₹${expectedExcess.toFixed(2)}` : `Projected Cushion: -₹${remainingBudget.toFixed(2)}`}
          </span>
        </div>
      </div>

      {/* Intelligent Appliance Optimization & Action Plan Card */}
      <div className="glass-card" style={{
        background: isOver 
          ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(15, 23, 42, 0.9) 100%)'
          : 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: `1px solid ${isOver ? 'rgba(244, 63, 94, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
        borderLeft: `4px solid ${isOver ? 'var(--accent-rose)' : 'var(--accent-emerald)'}`
      }}>
        <div className="section-header">
          <div>
            <h3 className="section-title">
              <Sparkles size={18} color={isOver ? '#fb7185' : '#34d399'} />
              Intelligent Budget Optimization Plan
            </h3>
            <p className="section-subtitle">Recommended runtime adjustments to remain within budget</p>
          </div>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '3px 9px',
            borderRadius: 'var(--radius-full)',
            background: isOver ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            color: isOver ? '#fb7185' : '#34d399'
          }}>
            {isOver ? 'Action Required' : 'On Track'}
          </span>
        </div>

        <p style={{ fontSize: '0.86rem', lineHeight: 1.5, color: '#f8fafc', marginBottom: 12 }}>
          {appOpt.recommendation_text || 'All appliance loads are currently optimal and operating within target spending limits.'}
        </p>

        {isOver && appOpt.target_appliance && (
          <div className="grid-responsive-3" style={{ gap: 10 }}>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Target Appliance</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8', marginTop: 2 }}>
                {appOpt.target_appliance} (Ch {appOpt.channel_id})
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Daily Runtime Cut</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fbbf24', marginTop: 2 }}>
                ~{appOpt.suggested_daily_reduction_hours} hrs / day
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Monthly Savings Impact</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34d399', marginTop: 2 }}>
                ₹{appOpt.potential_monthly_savings_inr?.toFixed(2)} ({appOpt.potential_monthly_co2_reduction_kg?.toFixed(1)} kg CO₂)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Guidance Footer */}
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
          <strong>Budget Modeling:</strong> Targets are stored persistently in SQLite and recalculated continuously against incoming PZEM telemetry. Predicted month-end bills dynamically track load trends and provide actionable saving guidance.
        </span>
      </div>
    </div>
  );
}
