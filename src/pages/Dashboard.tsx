import React from 'react';
import { useApp } from '../state/AppContext';
import { SummaryCards } from '../components/SummaryCards';
import { LiveChart } from '../components/LiveChart';
import { EventTable } from '../components/EventTable';

export const Dashboard: React.FC = () => {
  const { state, dispatch, currentProfile, currentChannel } = useApp();

  return (
    <div className="page-content">
      <div className="page-title-row">
        <div>
          <h2>Sensor Monitoring & Fault Detection Dashboard</h2>
          <p className="page-subtitle">Real-time simulation and diagnostic evaluation for {currentProfile.name}.</p>
        </div>

        {currentProfile.channels.length > 1 && (
          <div className="channel-toggle-bar">
            <span>Channel:</span>
            {currentProfile.channels.map((ch) => (
              <button
                key={ch.key}
                className={`btn btn-sm ${currentChannel.key === ch.key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => dispatch({ type: 'SET_CHANNEL', channelKey: ch.key })}
              >
                {ch.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <SummaryCards />

      <LiveChart />

      <div className="status-legend-card">
        <h4>Status Legend & Meaning</h4>
        <div className="legend-grid">
          <div className="legend-box">
            <span className="badge badge-normal">Normal</span>
            <p>Readings are within operating limits; zero active faults detected.</p>
          </div>
          <div className="legend-box">
            <span className="badge badge-warning">Warning</span>
            <p>Operating range exceeded, sudden spike detected, or stuck reading flagged.</p>
          </div>
          <div className="legend-box">
            <span className="badge badge-critical">Critical</span>
            <p>Rated spec exceeded or invalid sensor data packets (null/NaN) received.</p>
          </div>
          <div className="legend-box">
            <span className="badge badge-disconnected">Disconnected</span>
            <p>Sensor telemetry stale; timeout exceeded without fresh data packets.</p>
          </div>
        </div>
      </div>

      <EventTable
        compact={true}
        onViewAll={() => dispatch({ type: 'SET_VIEW', view: 'diagnostics' })}
      />
    </div>
  );
};
