import React from 'react';
import { useApp } from '../state/AppContext';
import { LayoutDashboard, Cpu, Activity, FlaskConical, Settings as SettingsIcon } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { state, dispatch } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sensors', label: 'Sensor Profiles', icon: Cpu },
    { id: 'diagnostics', label: 'Diagnostics & Events', icon: Activity },
    { id: 'testlab', label: 'Test Lab', icon: FlaskConical },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo-icon">⚡</div>
        <div>
          <h1 className="brand-title">SensorSure</h1>
          <p className="brand-tagline">Monitor. Detect. Understand.</p>
        </div>
      </div>

      <div className="simulation-badge-container">
        <span className="badge-simulation">Simulation Mode</span>
        <span className="badge-hardware-plan">Hardware: Planned</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = state.activeView === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_VIEW', view: item.id })}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <p className="footer-title">Educational ECE Tool</p>
        <p className="footer-sub">Reusable sensor fault-detection & monitoring framework.</p>
      </div>
    </aside>
  );
};
