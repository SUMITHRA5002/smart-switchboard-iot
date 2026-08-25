import React from 'react';
import { 
  Zap, 
  Activity, 
  BarChart3, 
  Receipt, 
  FileSpreadsheet, 
  RefreshCw, 
  Bell, 
  Sliders,
  Sparkles,
  Bot,
  TrendingUp,
  Target,
  Compass
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  isOnline, 
  lastUpdated, 
  isRefreshing, 
  onManualRefresh,
  autoRefreshInterval,
  setAutoRefreshInterval,
  activeAlertsCount = 0
}) {
  return (
    <header style={{
      background: 'rgba(15, 23, 42, 0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '12px 24px'
    }}>
      <div style={{
        maxWidth: 1440,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14
      }}>
        {/* Project Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 14px rgba(16, 185, 129, 0.35)'
          }}>
            <Zap size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
                Smart Switchboard
              </h1>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 7px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(6, 182, 212, 0.3)'
              }}>
                IoT Node
              </span>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              Appliance-Level Energy Analytics &amp; Estimator
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(30, 41, 59, 0.6)',
          padding: 3,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          overflowX: 'auto'
        }}>
          <button 
            className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            <Activity size={16} />
            <span>Live</span>
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={16} />
            <span>Analytics</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
            onClick={() => setActiveTab('forecast')}
          >
            <TrendingUp size={16} color={activeTab === 'forecast' ? '#38bdf8' : 'currentColor'} />
            <span>Forecast</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'budget' ? 'active' : ''}`}
            onClick={() => setActiveTab('budget')}
          >
            <Target size={16} color={activeTab === 'budget' ? '#34d399' : 'currentColor'} />
            <span>Budget</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'behaviour' ? 'active' : ''}`}
            onClick={() => setActiveTab('behaviour')}
          >
            <Compass size={16} color={activeTab === 'behaviour' ? '#fbbf24' : 'currentColor'} />
            <span>Behaviour</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'intelligence' ? 'active' : ''}`}
            onClick={() => setActiveTab('intelligence')}
          >
            <Sparkles size={16} color={activeTab === 'intelligence' ? '#34d399' : 'currentColor'} />
            <span>Intelligence</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'assistant' ? 'active' : ''}`}
            onClick={() => setActiveTab('assistant')}
          >
            <Bot size={16} color={activeTab === 'assistant' ? '#38bdf8' : 'currentColor'} />
            <span>AI Assistant</span>
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'bill' ? 'active' : ''}`}
            onClick={() => setActiveTab('bill')}
          >
            <Receipt size={16} />
            <span>Bill</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
            style={{ position: 'relative' }}
          >
            <Bell size={16} color={activeAlertsCount > 0 ? '#fb7185' : 'currentColor'} />
            <span>Alerts</span>
            {activeAlertsCount > 0 && (
              <span style={{
                background: '#f43f5e',
                color: '#fff',
                fontSize: '0.68rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-full)',
                padding: '1px 5px',
                marginLeft: 2,
                boxShadow: '0 0 8px rgba(244, 63, 94, 0.6)'
              }}>
                {activeAlertsCount}
              </span>
            )}
          </button>

          <button 
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Sliders size={16} />
            <span>Settings</span>
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <FileSpreadsheet size={16} />
            <span>Reports</span>
          </button>
        </nav>

        {/* Live Status & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            background: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
            border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
          }}>
            <div style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: isOnline ? '#10b981' : '#f43f5e'
            }} className={isOnline ? 'live-pulse' : ''} />
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: isOnline ? '#34d399' : '#fb7185'
            }}>
              {isOnline ? 'ESP32 Node' : 'Offline'}
            </span>
          </div>

          {/* Auto Refresh Select */}
          <select 
            value={autoRefreshInterval} 
            onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
            style={{
              background: '#1e293b',
              color: '#cbd5e1',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 8px',
              fontSize: '0.78rem',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value={2000}>2s</option>
            <option value={3000}>3s</option>
            <option value={5000}>5s</option>
            <option value={0}>Pause</option>
          </select>

          {/* Manual Refresh Button */}
          <button 
            onClick={onManualRefresh}
            title="Refresh now"
            style={{
              background: '#1e293b',
              border: '1px solid var(--border-subtle)',
              color: '#e2e8f0',
              borderRadius: 'var(--radius-sm)',
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'live-pulse' : ''} />
          </button>
        </div>
      </div>
    </header>
  );
}
