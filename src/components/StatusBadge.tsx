import React from 'react';
import { Status, Severity } from '../types';

interface StatusBadgeProps {
  status?: Status;
  severity?: Severity;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, severity, label }) => {
  const text = label || status || severity || 'Normal';
  
  let className = 'badge-normal';
  const val = text.toLowerCase();

  if (val.includes('critical') || val.includes('error')) {
    className = 'badge-critical';
  } else if (val.includes('warning') || val.includes('spike') || val.includes('stuck')) {
    className = 'badge-warning';
  } else if (val.includes('no data') || val.includes('disconnected')) {
    className = 'badge-disconnected';
  } else if (val.includes('info')) {
    className = 'badge-info';
  }

  return <span className={`badge ${className}`}>{text}</span>;
};
