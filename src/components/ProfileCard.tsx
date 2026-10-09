import React from 'react';
import { SensorProfile } from '../types';
import { useApp } from '../state/AppContext';
import { Cpu, CheckCircle2 } from 'lucide-react';

export const ProfileCard: React.FC<{ profile: SensorProfile }> = ({ profile }) => {
  const { state, dispatch } = useApp();
  const isSelected = state.currentProfileId === profile.id;

  return (
    <div className={`card profile-card ${isSelected ? 'selected-profile' : ''}`}>
      <div className="profile-card-header">
        <div className="profile-icon-wrap">
          <Cpu size={24} />
        </div>
        <div>
          <span className="profile-type-badge">{profile.measurementType}</span>
          <h3>{profile.name}</h3>
        </div>
      </div>

      <p className="profile-desc"><strong>Expected Behaviour:</strong> {profile.expectedBehaviour}</p>

      <div className="profile-specs-box">
        <h4>Channels & Operating vs Rated Ranges:</h4>
        {profile.channels.map((ch) => {
          const profileRanges = state.settings.opRanges[profile.id] || {};
          const opRange = profileRanges[ch.key] || { min: ch.defaultOpMin, max: ch.defaultOpMax };

          return (
            <div key={ch.key} className="channel-spec-item">
              <div className="channel-title-row">
                <strong>{ch.label} ({ch.unit})</strong>
                <span className="sampling-badge">Default Sampling: {profile.defaultSamplingMs}ms</span>
              </div>
              <div className="range-comparison-grid">
                <div className="range-box rated">
                  <span className="range-label">Rated Range (Datasheet)</span>
                  <span className="range-val">[{ch.ratedMin}, {ch.ratedMax}] {ch.unit}</span>
                </div>
                <div className="range-box operating">
                  <span className="range-label">Operating Range (Config)</span>
                  <span className="range-val">[{opRange.min}, {opRange.max}] {ch.unit}</span>
                </div>
              </div>
              <p className="spec-note">{ch.opRangeIsOfficialSpec ? 'Official manufacturer specification range.' : 'Configurable example operating threshold (not an official spec).'}</p>
            </div>
          );
        })}
      </div>

      <div className="config-notes-box">
        <p><strong>Config Notes:</strong> {profile.configNotes}</p>
        <p className="verification-note"><strong>Verification Note:</strong> {profile.verificationNote}</p>
      </div>

      <div className="profile-card-actions">
        {isSelected ? (
          <button className="btn btn-success" disabled>
            <CheckCircle2 size={16} /> Currently Active Profile
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => {
              dispatch({ type: 'SET_PROFILE', profileId: profile.id });
            }}
          >
            Select & Load Profile
          </button>
        )}
      </div>
    </div>
  );
};
