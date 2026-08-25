import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import LiveMonitoring from './components/LiveMonitoring';
import EnergyAnalytics from './components/EnergyAnalytics';
import EnergyForecast from './components/EnergyForecast';
import EnergyBudget from './components/EnergyBudget';
import ApplianceBehaviour from './components/ApplianceBehaviour';
import EnergyIntelligence from './components/EnergyIntelligence';
import EnergyAssistant from './components/EnergyAssistant';
import BillEstimator from './components/BillEstimator';
import ReportDownloads from './components/ReportDownloads';
import AlertsCenter from './components/AlertsCenter';
import SettingsManager from './components/SettingsManager';
import { fetchLatestTelemetry, fetchAlerts } from './services/api';
import { AlertTriangle, Bell, ArrowRight } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('live');
  const [latestReadings, setLatestReadings] = useState([]);
  const [liveHistory, setLiveHistory] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(3000);
  const [tariff, setTariff] = useState(7.0);
  const [apiError, setApiError] = useState(null);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);

  const timerRef = useRef(null);

  // Poll for latest telemetry readings & active alerts
  async function updateTelemetry(isManual = false) {
    if (isManual) setIsRefreshing(true);
    try {
      const [data, alertsRes] = await Promise.all([
        fetchLatestTelemetry(),
        fetchAlerts('0').catch(() => ({ active_count: 0 }))
      ]);

      setLatestReadings(data);
      setActiveAlertsCount(alertsRes.active_count || 0);
      setIsOnline(true);
      setApiError(null);

      if (data && data.length > 0) {
        const timeLabel = new Date().toLocaleTimeString();
        const p1 = data.find(d => d.channel_id === 1)?.power || 0;
        const p2 = data.find(d => d.channel_id === 2)?.power || 0;
        const total = p1 + p2;

        setLastUpdated(data[0]?.timestamp || new Date().toISOString());

        // Append to live history stream (max 30 points)
        setLiveHistory(prev => {
          const next = [...prev, {
            time: timeLabel,
            pzem1Power: parseFloat(p1.toFixed(1)),
            pzem2Power: parseFloat(p2.toFixed(1)),
            totalPower: parseFloat(total.toFixed(1))
          }];
          return next.length > 30 ? next.slice(next.length - 30) : next;
        });
      }
    } catch (err) {
      console.warn('Backend polling error:', err.message);
      setIsOnline(false);
      setApiError('Unable to connect to Smart Switchboard backend. Please ensure the server is running on port 5000.');
    } finally {
      if (isManual) setTimeout(() => setIsRefreshing(false), 400);
    }
  }

  // Auto-refresh interval lifecycle
  useEffect(() => {
    updateTelemetry();

    if (autoRefreshInterval > 0) {
      timerRef.current = setInterval(() => {
        updateTelemetry();
      }, autoRefreshInterval);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefreshInterval]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOnline={isOnline}
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing}
        onManualRefresh={() => updateTelemetry(true)}
        autoRefreshInterval={autoRefreshInterval}
        setAutoRefreshInterval={setAutoRefreshInterval}
        activeAlertsCount={activeAlertsCount}
      />

      {/* Main Content Area */}
      <main className="app-container" style={{ flex: 1, paddingTop: 20, paddingBottom: 36 }}>
        {/* Compact Error Alert Banner if Backend connection is down */}
        {apiError && (
          <div className="compact-alert-banner-error">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="#fb7185" />
              <span>{apiError}</span>
            </div>
            <button
              onClick={() => updateTelemetry(true)}
              style={{
                background: 'rgba(244, 63, 94, 0.2)',
                color: '#fff',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                borderRadius: 6,
                padding: '3px 10px',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Compact Global Notification Strip for Active Anomalies */}
        {activeAlertsCount > 0 && activeTab !== 'alerts' && (
          <div className="compact-alert-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={15} color="#f59e0b" className="live-pulse" />
              <span>
                <strong>System Notice:</strong> {activeAlertsCount} active load anomaly alert(s) detected.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('alerts')}
              style={{
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: 6,
                padding: '3px 10px',
                fontSize: '0.76rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer'
              }}
            >
              <span>View Alerts</span>
              <ArrowRight size={12} />
            </button>
          </div>
        )}

        {/* Tab Views */}
        {activeTab === 'live' && (
          <LiveMonitoring
            latestReadings={latestReadings}
            liveHistory={liveHistory}
            isOnline={isOnline}
            lastUpdated={lastUpdated}
          />
        )}

        {activeTab === 'analytics' && (
          <EnergyAnalytics tariff={tariff} />
        )}

        {activeTab === 'forecast' && (
          <EnergyForecast tariff={tariff} setTariff={setTariff} />
        )}

        {activeTab === 'budget' && (
          <EnergyBudget tariff={tariff} setTariff={setTariff} />
        )}

        {activeTab === 'behaviour' && (
          <ApplianceBehaviour />
        )}

        {activeTab === 'intelligence' && (
          <EnergyIntelligence tariff={tariff} setTariff={setTariff} />
        )}

        {activeTab === 'assistant' && (
          <EnergyAssistant tariff={tariff} />
        )}

        {activeTab === 'bill' && (
          <BillEstimator tariff={tariff} setTariff={setTariff} />
        )}

        {activeTab === 'alerts' && (
          <AlertsCenter onAlertsChanged={(count) => setActiveAlertsCount(count)} />
        )}

        {activeTab === 'settings' && (
          <SettingsManager onApplianceUpdated={() => updateTelemetry(false)} />
        )}

        {activeTab === 'reports' && (
          <ReportDownloads tariff={tariff} />
        )}
      </main>

      {/* Standardized Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: '0.78rem',
        color: '#64748b'
      }}>
        <div>Smart Switchboard IoT Project • Real-Time Energy Monitoring & Analytics System</div>
        <div style={{ marginTop: 3, fontSize: '0.7rem', color: '#475569' }}>
          Node.js Backend | SQLite Engine | React + Vite UI | Dual PZEM-004T ESP32 Node
        </div>
      </footer>
    </div>
  );
}
