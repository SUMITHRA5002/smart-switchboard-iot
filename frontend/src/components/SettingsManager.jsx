import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  ShieldCheck
} from 'lucide-react';
import { fetchAppliances, updateAppliance } from '../services/api';

const PRESET_APPLIANCES = [
  { name: 'Air Conditioner', category: 'Cooling', threshold: 2200 },
  { name: 'Refrigerator', category: 'Cooling', threshold: 450 },
  { name: 'Water Heater (Geyser)', category: 'Heating', threshold: 2000 },
  { name: 'Microwave Oven', category: 'Kitchen', threshold: 1200 },
  { name: 'Induction Cooktop', category: 'Kitchen', threshold: 2000 },
  { name: 'Washing Machine', category: 'Cleaning', threshold: 800 },
  { name: 'Desktop PC / TV', category: 'Entertainment', threshold: 300 },
  { name: 'Lighting Load', category: 'Lighting', threshold: 150 }
];

export default function SettingsManager({ onApplianceUpdated }) {
  const [appliances, setAppliances] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingState, setEditingState] = useState({});
  const [savingChannel, setSavingChannel] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    loadApplianceData();
  }, []);

  async function loadApplianceData() {
    setIsLoading(true);
    try {
      const data = await fetchAppliances();
      setAppliances(data.appliances || []);
      setCategories(data.categories || []);

      // Initialize form state
      const initialFormState = {};
      (data.appliances || []).forEach(a => {
        initialFormState[a.channel_id] = {
          name: a.name,
          category: a.category || 'General',
          power_threshold_w: a.power_threshold_w,
          is_active: a.is_active === 1
        };
      });
      setEditingState(initialFormState);
    } catch (err) {
      console.error('Failed to load appliances:', err);
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleFieldChange(channelId, field, value) {
    setEditingState(prev => ({
      ...prev,
      [channelId]: {
        ...prev[channelId],
        [field]: value
      }
    }));
  }

  function applyPreset(channelId, preset) {
    setEditingState(prev => ({
      ...prev,
      [channelId]: {
        ...prev[channelId],
        name: preset.name,
        category: preset.category,
        power_threshold_w: preset.threshold
      }
    }));
  }

  async function handleSaveAppliance(channelId) {
    const formData = editingState[channelId];
    if (!formData) return;

    setSavingChannel(channelId);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await updateAppliance(channelId, {
        name: formData.name,
        category: formData.category,
        power_threshold_w: parseFloat(formData.power_threshold_w),
        is_active: formData.is_active
      });

      setStatusMessage(`Channel #${channelId} (${formData.name}) updated successfully!`);
      
      if (onApplianceUpdated) {
        onApplianceUpdated();
      }

      await loadApplianceData();
    } catch (err) {
      console.error('Save failed:', err);
      setErrorMessage(err.message);
    } finally {
      setSavingChannel(null);
    }
  }

  return (
    <div className="page-container">
      {/* Standardized Page Header Card */}
      <div className="page-header-card">
        <div className="page-header-title-group">
          <h2 className="page-header-title">
            <Sliders size={22} color="#10b981" />
            Appliance &amp; Channel Configuration
          </h2>
          <p className="page-header-subtitle">
            Rename monitored appliances, assign categories, and calibrate individual safety wattage limits
          </p>
        </div>

        <div className="page-header-actions">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            fontSize: '0.78rem',
            fontWeight: 600
          }}>
            <ShieldCheck size={15} />
            <span>Real-Time Anomaly Sync Active</span>
          </div>
        </div>
      </div>

      {/* Status Alerts */}
      {statusMessage && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#34d399',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.82rem'
        }}>
          <CheckCircle2 size={16} />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#fb7185',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.82rem'
        }}>
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Data-Driven Appliance List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {appliances.length > 0 ? (
          appliances.map(appliance => {
            const channelId = appliance.channel_id;
            const currentForm = editingState[channelId] || {};
            const isSaving = savingChannel === channelId;

            return (
              <div 
                key={channelId} 
                className="glass-card"
                style={{
                  borderLeft: `4px solid ${channelId === 1 ? 'var(--accent-emerald)' : 'var(--accent-cyan)'}`
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-sm)',
                      background: channelId === 1 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                      color: channelId === 1 ? '#34d399' : '#38bdf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Zap size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                          Channel {channelId}: {appliance.name}
                        </h3>
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-xs)',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#cbd5e1',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {channelId === 1 ? 'UART Serial2 (GPIO 26/27)' : 'UART Serial1 (GPIO 16/17)'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                        Safety threshold: <strong style={{ color: '#fbbf24' }}>{appliance.power_threshold_w} W</strong> | Category: <strong style={{ color: '#38bdf8' }}>{appliance.category}</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    className="btn-primary"
                    onClick={() => handleSaveAppliance(channelId)}
                    disabled={isSaving}
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                  >
                    <Save size={14} />
                    <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
                  </button>
                </div>

                {/* Form Fields Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  {/* Appliance Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                      Appliance Name
                    </label>
                    <input
                      type="text"
                      value={currentForm.name || ''}
                      onChange={(e) => handleFieldChange(channelId, 'name', e.target.value)}
                      placeholder="e.g. Air Conditioner, Refrigerator"
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

                  {/* Category Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                      Appliance Category
                    </label>
                    <select
                      value={currentForm.category || 'General'}
                      onChange={(e) => handleFieldChange(channelId, 'category', e.target.value)}
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
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Power Threshold Input */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                      Safe Power Threshold (Watts)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        min="10"
                        max="10000"
                        step="10"
                        value={currentForm.power_threshold_w || ''}
                        onChange={(e) => handleFieldChange(channelId, 'power_threshold_w', e.target.value)}
                        placeholder="e.g. 2000"
                        style={{
                          width: '100%',
                          background: 'var(--bg-input)',
                          color: '#fbbf24',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '8px 28px 8px 12px',
                          fontSize: '0.88rem',
                          outline: 'none'
                        }}
                      />
                      <span style={{ position: 'absolute', right: 10, top: 8, color: '#94a3b8', fontSize: '0.78rem' }}>W</span>
                    </div>
                  </div>
                </div>

                {/* Quick Presets Row */}
                <div style={{ marginTop: 12 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    Quick Presets for Channel {channelId}:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {PRESET_APPLIANCES.map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(channelId, preset)}
                        className="pill-btn"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span>{preset.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8', fontSize: '0.7rem' }}>({preset.threshold}W)</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-card" style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: '0.84rem' }}>
            Loading appliance channels...
          </div>
        )}
      </div>

      {/* Educational / System Context Box */}
      <div className="glass-card" style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid var(--border-subtle)'
      }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <ShieldCheck size={16} color="#10b981" />
          Appliance Safety Threshold Protection
        </h4>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
          Each PZEM-004T module continuously measures active power draw. When a connected appliance exceeds its configured threshold (e.g. an AC drawing &gt;2200W due to compressor overload), the backend Anomaly Detection Engine instantly flags an over-power surge alert. The threshold can be re-calibrated at any time through this interface without altering ESP32 firmware.
        </p>
      </div>
    </div>
  );
}
