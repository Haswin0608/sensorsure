import React from 'react';
import { useApp } from '../state/AppContext';

export const LiveChart: React.FC = () => {
  const { state, currentProfile, currentChannel, currentOpRange } = useApp();

  const readings = state.readings;
  const width = 800;
  const height = 300;
  const padding = 50;

  if (readings.length === 0) {
    return (
      <div className="card chart-card">
        <div className="card-header">
          <h3>Live Telemetry & Operating Range</h3>
          <span className="unit-badge">{currentChannel.unit}</span>
        </div>
        <div className="chart-empty-state">
          <p>No readings yet. Start simulation or select a sensor profile.</p>
        </div>
      </div>
    );
  }

  // Find min/max for y-axis scaling
  const values = readings.map((r) => r.value).filter((v): v is number => v !== null);
  const minVal = values.length > 0 ? Math.min(...values, currentOpRange.min) : currentOpRange.min;
  const maxVal = values.length > 0 ? Math.max(...values, currentOpRange.max) : currentOpRange.max;
  const yPaddingRange = (maxVal - minVal) * 0.1 || 1;
  const yMin = minVal - yPaddingRange;
  const yMax = maxVal + yPaddingRange;

  const minTime = readings[0].timestamp;
  const maxTime = readings[readings.length - 1].timestamp || minTime + 1;
  const timeSpan = maxTime - minTime || 1;

  const getX = (t: number) => padding + ((t - minTime) / timeSpan) * (width - padding * 2);
  const getY = (v: number) => height - padding - ((v - yMin) / (yMax - yMin)) * (height - padding * 2);

  // Operating range Y coordinates
  const opMaxY = getY(currentOpRange.max);
  const opMinY = getY(currentOpRange.min);

  // Build SVG path for line
  const validReadings = readings.filter((r) => r.value !== null);
  const pathPoints = validReadings
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(r.timestamp)} ${getY(r.value as number)}`)
    .join(' ');

  // Check which points have active events
  const activeEvents = state.events.filter(
    (ev) => ev.sensorId === currentProfile.id && ev.channel === currentChannel.label && ev.state === 'Active'
  );

  return (
    <div className="card chart-card">
      <div className="card-header">
        <div>
          <h3>Live Telemetry Stream — {currentChannel.label}</h3>
          <p className="card-subtitle">
            Operating Range: [{currentOpRange.min} – {currentOpRange.max}] {currentChannel.unit} | Rated: [{currentChannel.ratedMin} – {currentChannel.ratedMax}] {currentChannel.unit}
          </p>
        </div>
        <div className="chart-legend">
          <span className="legend-item"><span className="dot-op"></span> Operating Band</span>
          <span className="legend-item"><span className="dot-line"></span> Live Stream</span>
          <span className="legend-item"><span className="dot-anomaly"></span> Anomaly</span>
        </div>
      </div>

      <div className="svg-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="live-svg">
          {/* Background Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((pct, idx) => {
            const y = padding + pct * (height - padding * 2);
            const val = yMax - pct * (yMax - yMin);
            return (
              <g key={idx}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                <text x={padding - 10} y={y + 4} fontSize="10" fill="#64748b" textAnchor="end">
                  {val.toFixed(currentChannel.decimals)}
                </text>
              </g>
            );
          })}

          {/* Shaded Operating Range Band */}
          <rect
            x={padding}
            y={Math.min(opMaxY, opMinY)}
            width={width - padding * 2}
            height={Math.abs(opMinY - opMaxY)}
            fill="#14b8a6"
            fillOpacity="0.08"
          />
          <line x1={padding} y1={opMaxY} x2={width - padding} y2={opMaxY} stroke="#14b8a6" strokeDasharray="2 2" strokeWidth="1" />
          <line x1={padding} y1={opMinY} x2={width - padding} y2={opMinY} stroke="#14b8a6" strokeDasharray="2 2" strokeWidth="1" />

          {/* Main Reading Line */}
          {pathPoints && <path d={pathPoints} fill="none" stroke="#0b1f3a" strokeWidth="2.5" />}

          {/* Data Points and Anomaly Markers */}
          {validReadings.map((r, i) => {
            const cx = getX(r.timestamp);
            const cy = getY(r.value as number);
            const isOutOfRange = r.value! < currentOpRange.min || r.value! > currentOpRange.max;
            const hasAlert = activeEvents.some(
              (ev) => Math.abs(ev.timestamp - r.timestamp) < 3000
            );

            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={isOutOfRange || hasAlert ? 5 : 3}
                fill={isOutOfRange || hasAlert ? '#ef4444' : '#14b8a6'}
                stroke="#ffffff"
                strokeWidth="1.5"
              >
                <title>{`${new Date(r.timestamp).toLocaleTimeString()}: ${r.value} ${currentChannel.unit}`}</title>
              </circle>
            );
          })}

          {/* X Axis Time Labels */}
          {readings.length > 0 && (
            <g>
              <text x={padding} y={height - 15} fontSize="10" fill="#64748b">
                {new Date(readings[0].timestamp).toLocaleTimeString()}
              </text>
              <text x={width - padding} y={height - 15} fontSize="10" fill="#64748b" textAnchor="end">
                {new Date(readings[readings.length - 1].timestamp).toLocaleTimeString()}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
