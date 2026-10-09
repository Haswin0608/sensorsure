import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { StatusBadge } from './StatusBadge';
import { DiagEvent } from '../types';
import { Search, Download, Trash2, CheckCircle } from 'lucide-react';
import { exportEventsToCsv } from '../utils/csv';

interface EventTableProps {
  compact?: boolean;
  onViewAll?: () => void;
  onRequestClear?: () => void;
}

export const EventTable: React.FC<EventTableProps> = ({ compact = false, onViewAll, onRequestClear }) => {
  const { state, dispatch } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSensor, setFilterSensor] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterState, setFilterState] = useState('ALL');

  const events = state.events;

  const filtered = events.filter((ev) => {
    if (filterSensor !== 'ALL' && ev.sensorId !== filterSensor) return false;
    if (filterSeverity !== 'ALL' && ev.severity !== filterSeverity) return false;
    if (filterState !== 'ALL' && ev.state !== filterState) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ev.title.toLowerCase().includes(q);
      const matchSensor = ev.sensorName.toLowerCase().includes(q);
      const matchRule = ev.rule.toLowerCase().includes(q);
      const matchExplain = ev.explanation.toLowerCase().includes(q);
      if (!matchTitle && !matchSensor && !matchRule && !matchExplain) return false;
    }
    return true;
  });

  const displayEvents = compact ? filtered.slice(0, 5) : filtered;

  return (
    <div className="card event-table-card">
      <div className="table-header-bar">
        <div>
          <h3>Diagnostic Event Log</h3>
          <p className="card-subtitle">
            {compact ? 'Recent 5 anomalies and events' : `Showing ${displayEvents.length} of ${events.length} events`}
          </p>
        </div>

        <div className="table-actions">
          {!compact && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => exportEventsToCsv(events)}
                disabled={events.length === 0}
              >
                <Download size={14} /> Export CSV
              </button>
              <button
                className="btn btn-danger-outline btn-sm"
                onClick={onRequestClear}
                disabled={events.length === 0}
              >
                <Trash2 size={14} /> Clear Log
              </button>
            </>
          )}
          {compact && onViewAll && (
            <button className="btn btn-primary btn-sm" onClick={onViewAll}>
              View All ({events.length})
            </button>
          )}
        </div>
      </div>

      {!compact && (
        <div className="filter-bar">
          <div className="search-input-wrap">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search title, sensor, rule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={filterSensor}
            onChange={(e) => setFilterSensor(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">All Sensors</option>
            <option value="dht11">DHT11</option>
            <option value="ds18b20">DS18B20</option>
            <option value="hc-sr04">HC-SR04</option>
            <option value="analog-pot">Analog Potentiometer</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">All States</option>
            <option value="Active">Active</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      )}

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Sensor / Channel</th>
              <th>Rule</th>
              <th>Severity</th>
              <th>Title</th>
              <th>Observed</th>
              <th>State</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {displayEvents.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-table-cell">
                  No diagnostic events match current filters. System operating within normal parameters.
                </td>
              </tr>
            ) : (
              displayEvents.map((ev: DiagEvent) => (
                <tr
                  key={ev.id}
                  onClick={() => dispatch({ type: 'SELECT_EVENT', event: ev })}
                  className="clickable-row"
                >
                  <td>{new Date(ev.timestamp).toLocaleTimeString()}</td>
                  <td>
                    <strong>{ev.sensorName}</strong>
                    <br />
                    <span className="text-sub">{ev.channel}</span>
                  </td>
                  <td>
                    <span className="code-badge">{ev.rule}</span>
                  </td>
                  <td>
                    <StatusBadge severity={ev.severity} />
                  </td>
                  <td>{ev.title}</td>
                  <td>{ev.observed !== null ? ev.observed : 'N/A'}</td>
                  <td>
                    <span className={`badge ${ev.state === 'Active' ? 'badge-critical' : 'badge-normal'}`}>
                      {ev.state}
                    </span>
                  </td>
                  <td>
                    {ev.reviewed ? (
                      <span className="reviewed-text" title="Reviewed">
                        <CheckCircle size={14} /> Reviewed
                      </span>
                    ) : (
                      <button
                        className="btn-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: 'MARK_REVIEWED', eventId: ev.id });
                        }}
                      >
                        Mark Reviewed
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
