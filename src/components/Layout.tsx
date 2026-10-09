import React from 'react';
import { Sidebar } from './Sidebar';
import { useApp } from '../state/AppContext';
import { StatusBadge } from './StatusBadge';
import { Play, Pause, RotateCcw } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, currentProfile, currentChannel, startSimulation, pauseSimulation, resetSimulation } = useApp();

  // Count active alerts
  const activeAlertCount = state.events.filter(
    (ev) => ev.sensorId === currentProfile.id && ev.channel === currentChannel.label && ev.state === 'Active'
  ).length;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content-wrapper">
        <header className="top-header">
          <div className="header-info">
            <span className="current-sensor-pill">
              Sensor: <strong>{currentProfile.name}</strong> ({currentChannel.label})
            </span>
            <div className="sim-mode-indicator" title="All telemetry is generated locally in simulation mode">
              <span className="pulse-dot"></span> SIMULATED DATA
            </div>
          </div>

          <div className="header-controls">
            <div className="status-overview">
              <span>Status:</span>
              <StatusBadge status={state.status} />
              {activeAlertCount > 0 && (
                <span className="alert-count-pill">{activeAlertCount} active alert{activeAlertCount > 1 ? 's' : ''}</span>
              )}
            </div>

            <div className="sim-action-buttons">
              {state.simState === 'running' ? (
                <button className="btn-icon" onClick={pauseSimulation} title="Pause Simulation">
                  <Pause size={16} /> Pause
                </button>
              ) : (
                <button className="btn-icon" onClick={startSimulation} title="Resume Simulation">
                  <Play size={16} /> Resume
                </button>
              )}
              <button className="btn-icon" onClick={resetSimulation} title="Reset Simulation">
                <RotateCcw size={16} /> Reset
              </button>
            </div>
          </div>
        </header>

        <main className="page-container">{children}</main>
      </div>
    </div>
  );
};
