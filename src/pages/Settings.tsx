import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { SENSOR_PROFILES } from '../profiles/sensorProfiles';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { HARDWARE_ADAPTER_PLACEHOLDERS } from '../adapters/inputAdapter';
import { Save, RotateCcw, ShieldAlert, Cpu } from 'lucide-react';

export const Settings: React.FC = () => {
  const { state, dispatch } = useApp();
  const [settings, setSettings] = useState(state.settings);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleOpRangeChange = (profileId: string, channelKey: string, field: 'min' | 'max', valStr: string) => {
    const num = parseFloat(valStr);
    const profile = SENSOR_PROFILES.find((p) => p.id === profileId);
    const channel = profile?.channels.find((c) => c.key === channelKey);

    if (!channel) return;

    // Validate against rated range
    if (!Number.isNaN(num)) {
      if (num < channel.ratedMin || num > channel.ratedMax) {
        setErrorMsg(`Value ${num} for ${channel.label} is outside rated specification [${channel.ratedMin}, ${channel.ratedMax}].`);
      } else {
        setErrorMsg(null);
      }
    }

    const currentRanges = settings.opRanges[profileId] || {};
    const currentChanRange = currentRanges[channelKey] || { min: channel.defaultOpMin, max: channel.defaultOpMax };

    setSettings({
      ...settings,
      opRanges: {
        ...settings.opRanges,
        [profileId]: {
          ...currentRanges,
          [channelKey]: {
            ...currentChanRange,
            [field]: Number.isNaN(num) ? 0 : num,
          },
        },
      },
    });
  };

  const handleSave = () => {
    // Validate all operating ranges before saving
    for (const p of SENSOR_PROFILES) {
      const pRanges = settings.opRanges[p.id] || {};
      for (const ch of p.channels) {
        const r = pRanges[ch.key];
        if (r) {
          if (r.min >= r.max) {
            setErrorMsg(`Invalid operating range for ${p.name} (${ch.label}): Min must be less than Max.`);
            return;
          }
          if (r.min < ch.ratedMin || r.max > ch.ratedMax) {
            setErrorMsg(`Operating range for ${p.name} (${ch.label}) cannot exceed rated spec [${ch.ratedMin}, ${ch.ratedMax}].`);
            return;
          }
        }
      }
    }

    setErrorMsg(null);
    dispatch({ type: 'UPDATE_SETTINGS', settings });
    setSuccessMsg('Settings updated successfully and applied to engine!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="page-content">
      <div className="page-title-row">
        <div>
          <h2>System Settings & Configuration</h2>
          <p className="page-subtitle">Configure diagnostic engine rules, sampling rates, thresholds, and retention limits.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={16} /> Save Changes
        </button>
      </div>

      {errorMsg && <div className="alert alert-error"><ShieldAlert size={16} /> {errorMsg}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="settings-grid">
        <div className="card">
          <h3>General Engine Parameters</h3>
          <p className="card-subtitle">Timing, window size, and anomaly sensitivity parameters.</p>

          <div className="form-group">
            <label>Sampling Interval (ms):</label>
            <div className="input-unit-wrap">
              <input
                type="number"
                min={500}
                max={10000}
                step={100}
                value={settings.samplingMs}
                onChange={(e) => setSettings({ ...settings, samplingMs: parseInt(e.target.value) || 1000 })}
              />
              <span className="unit-label">ms</span>
            </div>
            <p className="form-hint">Range: 500 – 10000 ms.</p>
          </div>

          <div className="form-group">
            <label>Stuck Detection Window (seconds):</label>
            <div className="input-unit-wrap">
              <input
                type="number"
                min={5}
                max={300}
                value={settings.stuckWindowSec}
                onChange={(e) => setSettings({ ...settings, stuckWindowSec: parseInt(e.target.value) || 30 })}
              />
              <span className="unit-label">sec</span>
            </div>
            <p className="form-hint">Range: 5 – 300 s.</p>
          </div>

          <div className="form-group">
            <label>Spike Rate Sensitivity (Multiplier):</label>
            <div className="input-unit-wrap">
              <input
                type="number"
                min={0.5}
                max={3.0}
                step={0.1}
                value={settings.spikeSensitivity}
                onChange={(e) => setSettings({ ...settings, spikeSensitivity: parseFloat(e.target.value) || 1.0 })}
              />
              <span className="unit-label">×</span>
            </div>
            <p className="form-hint">Range: 0.5× – 3.0× maxRatePerSec.</p>
          </div>

          <div className="form-group">
            <label>Event Retention Max (events):</label>
            <div className="input-unit-wrap">
              <input
                type="number"
                min={50}
                max={2000}
                step={50}
                value={settings.retentionMax}
                onChange={(e) => setSettings({ ...settings, retentionMax: parseInt(e.target.value) || 500 })}
              />
              <span className="unit-label">events</span>
            </div>
            <p className="form-hint">Range: 50 – 2000 events stored in localStorage.</p>
          </div>
        </div>

        <div className="card">
          <h3>Per-Profile Operating Ranges (Configurable)</h3>
          <p className="card-subtitle">Adjust custom operating thresholds. Rated specifications are fixed read-only bounds.</p>

          {SENSOR_PROFILES.map((profile) => (
            <div key={profile.id} className="settings-profile-section">
              <h4>{profile.name}</h4>
              {profile.channels.map((ch) => {
                const profileRanges = settings.opRanges[profile.id] || {};
                const opRange = profileRanges[ch.key] || { min: ch.defaultOpMin, max: ch.defaultOpMax };

                return (
                  <div key={ch.key} className="channel-settings-row">
                    <span className="chan-title">{ch.label} ({ch.unit})</span>
                    
                    <div className="rated-readonly-block">
                      <span>Rated: [{ch.ratedMin} – {ch.ratedMax}] {ch.unit}</span>
                    </div>

                    <div className="op-inputs-block">
                      <label>Min:</label>
                      <input
                        type="number"
                        step={Math.pow(10, -ch.decimals)}
                        value={opRange.min}
                        onChange={(e) => handleOpRangeChange(profile.id, ch.key, 'min', e.target.value)}
                      />
                      <label>Max:</label>
                      <input
                        type="number"
                        step={Math.pow(10, -ch.decimals)}
                        value={opRange.max}
                        onChange={(e) => handleOpRangeChange(profile.id, ch.key, 'max', e.target.value)}
                      />
                      <span className="unit-label">{ch.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          <div className="settings-reset-bar">
            <button
              className="btn btn-danger-outline"
              onClick={() => setIsResetConfirmOpen(true)}
            >
              <RotateCcw size={16} /> Reset All Settings & Events
            </button>
          </div>
        </div>
      </div>

      <div className="card hardware-about-card">
        <h3><Cpu size={20} /> About & Hardware Integration Roadmap</h3>
        <p className="card-subtitle">Documenting future physical hardware ingestion protocols (Currently 100% Simulation Mode).</p>
        
        <div className="hardware-grid">
          <div className="hardware-box">
            <h4>1. Arduino USB Serial (Web Serial API)</h4>
            <p>{HARDWARE_ADAPTER_PLACEHOLDERS.arduinoWebSerial.description}</p>
            <code>{HARDWARE_ADAPTER_PLACEHOLDERS.arduinoWebSerial.jsonSchema}</code>
            <span className="badge badge-disconnected mt-2">Status: {HARDWARE_ADAPTER_PLACEHOLDERS.arduinoWebSerial.status}</span>
          </div>

          <div className="hardware-box">
            <h4>2. ESP32 Wi-Fi Telemetry (HTTP / WebSocket)</h4>
            <p>{HARDWARE_ADAPTER_PLACEHOLDERS.esp32WiFi.description}</p>
            <code>{HARDWARE_ADAPTER_PLACEHOLDERS.esp32WiFi.jsonSchema}</code>
            <span className="badge badge-disconnected mt-2">Status: {HARDWARE_ADAPTER_PLACEHOLDERS.esp32WiFi.status}</span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title="Reset to Default Settings"
        message="Are you sure you want to reset all settings and clear all logged events to default values?"
        confirmText="Reset Defaults"
        danger={true}
        onConfirm={() => {
          dispatch({ type: 'RESET_DEFAULTS' });
          setSettings(state.settings);
          setIsResetConfirmOpen(false);
          setSuccessMsg('Reset all settings to defaults.');
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
