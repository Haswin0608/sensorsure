import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { EventTable } from '../components/EventTable';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const Diagnostics: React.FC = () => {
  const { dispatch } = useApp();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return (
    <div className="page-content">
      <div className="page-title-row">
        <div>
          <h2>Diagnostics & Event History</h2>
          <p className="page-subtitle">Inspect anomaly events, examine plain-language explanations, and follow safe check guidelines.</p>
        </div>
      </div>

      <EventTable
        compact={false}
        onRequestClear={() => setIsConfirmOpen(true)}
      />

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Clear Diagnostic Event Log"
        message="Are you sure you want to clear all logged diagnostic events? This action cannot be undone."
        confirmText="Clear Log"
        danger={true}
        onConfirm={() => {
          dispatch({ type: 'CLEAR_EVENTS' });
          setIsConfirmOpen(false);
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};
