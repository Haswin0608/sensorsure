import React from 'react';
import { useApp } from '../state/AppContext';
import { StatusBadge } from './StatusBadge';
import { Activity, Cpu, AlertTriangle, Layers, TrendingUp } from 'lucide-react';

export const SummaryCards: React.FC = () => {
  const { state, currentProfile, currentChannel } = useApp();

  const latestReading = state.readings[state.readings.length - 1];
  const latestVal = latestReading && latestReading.value !== null ? `${latestReading.value} ${currentChannel.unit}` : 'No Data';

  const activeAlerts = state.events.filter(
    (ev) => ev.sensorId === currentProfile.id && ev.channel === currentChannel.label && ev.state === 'Active'
  ).length;

  const totalEvents = state.events.length;

  return (
    <div className="summary-cards-grid">
      <div className="summary-card">
        <div className="card-icon-wrap" style={{ background: '#e0f2fe', color: '#0369a1' }}>
          <Cpu size={22} />
        </div>
        <div>
          <p className="card-label">Active Profile</p>
          <h4 className="card-value-sm">{currentProfile.name}</h4>
          <p className="card-sub">{currentChannel.label} ({currentChannel.unit})</p>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-icon-wrap" style={{ background: '#ccfbf1', color: '#0f766e' }}>
          <TrendingUp size={22} />
        </div>
        <div>
          <p className="card-label">Latest Reading</p>
          <h3 className="card-value">{latestVal}</h3>
          <p className="card-sub">Sampling every {state.settings.samplingMs}ms</p>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-icon-wrap" style={{ background: '#fef3c7', color: '#b45309' }}>
          <Activity size={22} />
        </div>
        <div>
          <p className="card-label">System Status</p>
          <div className="card-status-wrap">
            <StatusBadge status={state.status} />
          </div>
          <p className="card-sub">Deterministic engine state</p>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-icon-wrap" style={{ background: '#fee2e2', color: '#b91c1c' }}>
          <AlertTriangle size={22} />
        </div>
        <div>
          <p className="card-label">Active Alerts</p>
          <h3 className="card-value">{activeAlerts}</h3>
          <p className="card-sub">Current channel faults</p>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-icon-wrap" style={{ background: '#f3e8ff', color: '#6b21a8' }}>
          <Layers size={22} />
        </div>
        <div>
          <p className="card-label">Total Events Logged</p>
          <h3 className="card-value">{totalEvents}</h3>
          <p className="card-sub">Retention max: {state.settings.retentionMax}</p>
        </div>
      </div>
    </div>
  );
};
