import React from 'react';
import { SENSOR_PROFILES } from '../profiles/sensorProfiles';
import { ProfileCard } from '../components/ProfileCard';

export const Sensors: React.FC = () => {
  return (
    <div className="page-content">
      <div className="page-title-row">
        <div>
          <h2>Sensor Profiles & Specifications</h2>
          <p className="page-subtitle">Select an educational ECE sensor profile to load into the simulation and diagnostic engine.</p>
        </div>
      </div>

      <div className="profiles-grid">
        {SENSOR_PROFILES.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} />
        ))}
      </div>
    </div>
  );
};
