import React from 'react';
import { DiagEvent } from '../types';
import { StatusBadge } from './StatusBadge';
import { useApp } from '../state/AppContext';
import { AlertCircle, CheckCircle, HelpCircle, X } from 'lucide-react';

export const EventDetail: React.FC = () => {
  const { state, dispatch } = useApp();
  const event = state.selectedEvent;

  if (!event) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card event-detail-modal">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <StatusBadge severity={event.severity} />
            <h2>{event.title}</h2>
          </div>
          <button
            className="btn-close"
            onClick={() => dispatch({ type: 'SELECT_EVENT', event: null })}
          >
            <X size={20} />
          </button>
        </div>

        <div className="event-detail-body">
          <div className="detail-meta-grid">
            <div>
              <span className="meta-label">Sensor Profile</span>
              <p className="meta-val">{event.sensorName} ({event.sensorId})</p>
            </div>
            <div>
              <span className="meta-label">Channel</span>
              <p className="meta-val">{event.channel}</p>
            </div>
            <div>
              <span className="meta-label">Diagnostic Rule</span>
              <p className="meta-val code-badge">{event.rule}</p>
            </div>
            <div>
              <span className="meta-label">Timestamp</span>
              <p className="meta-val">{new Date(event.timestamp).toLocaleString()}</p>
            </div>
            <div>
              <span className="meta-label">Observed Value</span>
              <p className="meta-val highlight">{event.observed !== null ? event.observed : 'Null / No Data'}</p>
            </div>
            <div>
              <span className="meta-label">Limit / Threshold</span>
              <p className="meta-val">{event.limitText}</p>
            </div>
            <div>
              <span className="meta-label">State</span>
              <p className="meta-val">
                <span className={`badge ${event.state === 'Active' ? 'badge-critical' : 'badge-normal'}`}>
                  {event.state}
                </span>
              </p>
            </div>
            <div>
              <span className="meta-label">Reviewed Status</span>
              <p className="meta-val">{event.reviewed ? 'Reviewed by User' : 'Pending Review'}</p>
            </div>
          </div>

          <div className="explanation-box">
            <h4><HelpCircle size={18} /> Why am I seeing this? (Plain-Language Explanation)</h4>
            <p>{event.explanation}</p>
          </div>

          <div className="checks-box">
            <h4><AlertCircle size={18} /> What should I check? (Safe Diagnostic Steps)</h4>
            <ul>
              {event.checks.map((chk, idx) => (
                <li key={idx}>{chk}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="modal-actions">
          {!event.reviewed && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                dispatch({ type: 'MARK_REVIEWED', eventId: event.id });
              }}
            >
              <CheckCircle size={16} /> Mark as Reviewed
            </button>
          )}
          {event.state === 'Active' && (
            <button
              className="btn btn-primary"
              onClick={() => {
                dispatch({ type: 'RESOLVE_EVENT', eventId: event.id });
              }}
            >
              Resolve Event
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'SELECT_EVENT', event: null })}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
