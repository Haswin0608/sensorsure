import React from 'react';
import { AppProvider, useApp } from './state/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Sensors } from './pages/Sensors';
import { Diagnostics } from './pages/Diagnostics';
import { TestLab } from './pages/TestLab';
import { Settings } from './pages/Settings';
import { EventDetail } from './components/EventDetail';

function AppContent() {
  const { state } = useApp();

  let activePageComponent = <Dashboard />;
  if (state.activeView === 'sensors') activePageComponent = <Sensors />;
  else if (state.activeView === 'diagnostics') activePageComponent = <Diagnostics />;
  else if (state.activeView === 'testlab') activePageComponent = <TestLab />;
  else if (state.activeView === 'settings') activePageComponent = <Settings />;

  return (
    <Layout>
      {activePageComponent}
      <EventDetail />
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
