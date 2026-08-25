import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  AlertCircle, 
  Layers
} from 'lucide-react';
import { fetchAnalyticsSummary } from '../services/api';

export default function BillEstimator({ tariff, setTariff }) {
  const [billRange, setBillRange] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [applianceFilter, setApplianceFilter] = useState('all');
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadBillData();
  }, [billRange, customFrom, customTo, tariff, applianceFilter]);

  async function loadBillData() {
    setIsLoading(true);
    try {
      const data = await fetchAnalyticsSummary(tariff);
      setSummary(data);
    } catch (err) {
      console.error('Failed to calculate bill:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Filter appliance breakdown based on selection
  const rawBreakdown = summary?.appliance_breakdown || [];
  const filteredBreakdown = applianceFilter === 'all' 
    ? rawBreakdown 
    : rawBreakdown.filter(a => String(a.channel_id) === String(applianceFilter));

  const totalUnits = filteredBreakdown.reduce((sum, a) => sum + a.energy_kwh, 0);
  const totalCost = totalUnits * tariff;

  return (
    <div className="page-container">
      {/* Standardized Page Header Card */}
      <div className="page-header-card">
        <div className="page-header-title-group">
          <h2 className="page-header-title">
            <Receipt size={22} color="#10b981" />
            Electricity Bill Estimator
          </h2>
          <p className="page-header-subtitle">
            Real-time tariff modeling and appliance-level cost computation from recorded telemetry
          </p>
        </div>

        {/* Academic Estimation Disclaimer Pill */}
        <div className="page-header-actions">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            fontSize: '0.78rem',
            fontWeight: 600
          }}>
            <AlertCircle size={14} />
            <span>Academic Energy Tariff Model</span>
          </div>
        </div>
      </div>

      {/* Bill Configuration Form Card */}
      <div className="glass-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
          {/* Date Range Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#94a3b8', marginBottom: 5 }}>
              Billing Period
            </label>
            <select
              value={billRange}
              onChange={(e) => setBillRange(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                color: '#fff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">This Month (30 Days)</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Inputs if Custom Selected */}
          {billRange === 'custom' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#94a3b8', marginBottom: 5 }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    color: '#fff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#94a3b8', marginBottom: 5 }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    color: '#fff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>
            </>
          )}

          {/* Appliance Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#94a3b8', marginBottom: 5 }}>
              Appliance Filter
            </label>
            <select
              value={applianceFilter}
              onChange={(e) => setApplianceFilter(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                color: '#fff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Appliances (Combined)</option>
              {rawBreakdown.map(app => (
                <option key={app.channel_id} value={app.channel_id}>
                  Channel {app.channel_id}: {app.appliance_name}
                </option>
              ))}
            </select>
          </div>

          {/* Configurable Tariff Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#94a3b8', marginBottom: 5 }}>
              Tariff Rate (₹ / kWh)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: 8, color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem' }}>₹</span>
              <input
                type="number"
                step="0.1"
                min="0"
                value={tariff}
                onChange={(e) => setTariff(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  color: '#34d399',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px 8px 24px',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bill Summary Output Banner */}
      <div className="glass-card highlight-emerald" style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Estimated Electricity Bill
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 4 }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#34d399', marginRight: 3 }}>₹</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                {totalCost.toFixed(2)}
              </span>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 4 }}>
              Calculated for: <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{billRange.toUpperCase()}</span> | Total: <span style={{ color: '#34d399', fontWeight: 600 }}>{totalUnits.toFixed(3)} Units (kWh)</span>
            </div>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: 2 }}>Calculation Formula:</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#38bdf8' }}>
              Cost = {totalUnits.toFixed(3)} kWh × ₹{tariff.toFixed(2)} / kWh
            </div>
          </div>
        </div>
      </div>

      {/* Appliance-Wise Consumption & Cost Table */}
      <div className="glass-card">
        <div className="section-header">
          <div>
            <h3 className="section-title">
              <Layers size={18} color="#06b6d4" />
              Appliance-Level Cost Breakdown
            </h3>
            <p className="section-subtitle">Individual energy consumption and tariff charges</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: '#94a3b8' }}>
                <th style={{ padding: '10px 12px' }}>Channel</th>
                <th style={{ padding: '10px 12px' }}>Appliance Name</th>
                <th style={{ padding: '10px 12px' }}>Peak Load (W)</th>
                <th style={{ padding: '10px 12px' }}>Avg Load (W)</th>
                <th style={{ padding: '10px 12px' }}>Units Consumed (kWh)</th>
                <th style={{ padding: '10px 12px' }}>Tariff Rate</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Estimated Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {filteredBreakdown.length > 0 ? (
                filteredBreakdown.map((item) => (
                  <tr key={item.channel_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#f8fafc' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-xs)',
                        background: item.channel_id === 1 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                        color: item.channel_id === 1 ? '#34d399' : '#38bdf8',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem'
                      }}>
                        PZEM #{item.channel_id}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.appliance_name}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{item.peak_power_w} W</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{item.avg_power_w} W</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: '#fbbf24', fontWeight: 600 }}>
                      {item.energy_kwh.toFixed(3)} kWh
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
                      ₹{tariff.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#34d399', fontWeight: 700, fontSize: '0.95rem' }}>
                      ₹{(item.energy_kwh * tariff).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
                    No readings found for selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredBreakdown.length > 0 && (
              <tfoot>
                <tr style={{ background: 'rgba(255,255,255,0.03)', fontWeight: 700, color: '#fff' }}>
                  <td colSpan={4} style={{ padding: '10px 12px', textAlign: 'right' }}>Total Combined:</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>
                    {totalUnits.toFixed(3)} kWh
                  </td>
                  <td style={{ padding: '10px 12px' }}>-</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#34d399', fontSize: '1rem' }}>
                    ₹{totalCost.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
