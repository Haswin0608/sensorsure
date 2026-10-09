import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { SensorProfile, Settings, DiagEvent, Reading, Status, ChannelState } from '../types';
import { SENSOR_PROFILES } from '../profiles/sensorProfiles';
import { STORAGE_KEYS, safeGetItem, safeSetItem } from '../utils/storage';
import { evaluate, createInitialChannelState } from '../engine/diagnosticEngine';
import { generateReading } from '../engine/simulator';

interface AppState {
  currentProfileId: string;
  currentChannelKey: string;
  activeView: string; // 'dashboard' | 'sensors' | 'diagnostics' | 'testlab' | 'settings'
  simState: 'running' | 'paused' | 'stopped';
  tickCount: number;
  readings: Reading[];
  channelStates: Record<string, Record<string, ChannelState>>; // profileId -> channelKey -> ChannelState
  events: DiagEvent[];
  settings: Settings;
  selectedEvent: DiagEvent | null;
  status: Status;
}

type Action =
  | { type: 'SET_PROFILE'; profileId: string }
  | { type: 'SET_CHANNEL'; channelKey: string }
  | { type: 'SET_VIEW'; view: string }
  | { type: 'SET_SIM_STATE'; state: 'running' | 'paused' | 'stopped' }
  | { type: 'TICK_SIMULATION' }
  | { type: 'ADD_READING'; reading: Reading; events: DiagEvent[]; resolvedIds: string[]; status: Status }
  | { type: 'UPDATE_SETTINGS'; settings: Settings }
  | { type: 'MARK_REVIEWED'; eventId: string }
  | { type: 'RESOLVE_EVENT'; eventId: string }
  | { type: 'CLEAR_EVENTS' }
  | { type: 'SELECT_EVENT'; event: DiagEvent | null }
  | { type: 'RESET_DEFAULTS' };

const defaultSettings: Settings = {
  samplingMs: 1500,
  stuckWindowSec: 30,
  spikeSensitivity: 1.0,
  retentionMax: 500,
  defaultView: 'dashboard',
  opRanges: {
    dht11: { temperature: { min: 15, max: 35 }, humidity: { min: 30, max: 70 } },
    ds18b20: { temperature: { min: 10, max: 40 } },
    'hc-sr04': { distance: { min: 5, max: 300 } },
    'analog-pot': { counts: { min: 50, max: 973 } },
  },
  staleTimeoutMultiplier: 3,
};

function getInitialSettings(): Settings {
  const loaded = safeGetItem<Settings>(STORAGE_KEYS.SETTINGS, defaultSettings);
  // Ensure opRanges are fully populated for all profiles
  const opRanges = { ...defaultSettings.opRanges, ...(loaded.opRanges || {}) };
  SENSOR_PROFILES.forEach((p) => {
    if (!opRanges[p.id]) {
      opRanges[p.id] = {};
    }
    p.channels.forEach((c) => {
      if (!opRanges[p.id][c.key]) {
        opRanges[p.id][c.key] = { min: c.defaultOpMin, max: c.defaultOpMax };
      }
    });
  });
  return { ...defaultSettings, ...loaded, opRanges };
}

function getInitialEvents(): DiagEvent[] {
  return safeGetItem<DiagEvent[]>(STORAGE_KEYS.EVENTS, []);
}

const initialState: AppState = {
  currentProfileId: 'dht11',
  currentChannelKey: 'temperature',
  activeView: 'dashboard',
  simState: 'running',
  tickCount: 0,
  readings: [],
  channelStates: {},
  events: getInitialEvents(),
  settings: getInitialSettings(),
  selectedEvent: null,
  status: 'Normal',
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PROFILE': {
      const profile = SENSOR_PROFILES.find((p) => p.id === action.profileId);
      const firstChannel = profile ? profile.channels[0].key : '';
      return {
        ...state,
        currentProfileId: action.profileId,
        currentChannelKey: firstChannel,
        readings: [],
        status: 'Normal',
        selectedEvent: null,
      };
    }
    case 'SET_CHANNEL':
      return {
        ...state,
        currentChannelKey: action.channelKey,
        readings: [],
        status: 'Normal',
      };
    case 'SET_VIEW':
      return {
        ...state,
        activeView: action.view,
      };
    case 'SET_SIM_STATE':
      return {
        ...state,
        simState: action.state,
      };
    case 'TICK_SIMULATION':
      return {
        ...state,
        tickCount: state.tickCount + 1,
      };
    case 'ADD_READING': {
      const newReadings = [...state.readings, action.reading];
      if (newReadings.length > 120) newReadings.shift();

      // Update events with resolvedIds
      const updatedEvents = state.events.map((ev) => {
        if (action.resolvedIds.includes(ev.id)) {
          return { ...ev, state: 'Resolved' as const, resolvedAt: Date.now() };
        }
        return ev;
      });

      // Add new events respecting retentionMax
      const combinedEvents = [...action.events, ...updatedEvents];
      if (combinedEvents.length > state.settings.retentionMax) {
        combinedEvents.length = state.settings.retentionMax;
      }

      safeSetItem(STORAGE_KEYS.EVENTS, combinedEvents);

      return {
        ...state,
        readings: newReadings,
        events: combinedEvents,
        status: action.status,
      };
    }
    case 'UPDATE_SETTINGS': {
      safeSetItem(STORAGE_KEYS.SETTINGS, action.settings);
      return {
        ...state,
        settings: action.settings,
      };
    }
    case 'MARK_REVIEWED': {
      const updated = state.events.map((ev) =>
        ev.id === action.eventId ? { ...ev, reviewed: true } : ev
      );
      safeSetItem(STORAGE_KEYS.EVENTS, updated);
      return {
        ...state,
        events: updated,
      };
    }
    case 'RESOLVE_EVENT': {
      const updated = state.events.map((ev) =>
        ev.id === action.eventId ? { ...ev, state: 'Resolved' as const, resolvedAt: Date.now() } : ev
      );
      safeSetItem(STORAGE_KEYS.EVENTS, updated);
      return {
        ...state,
        events: updated,
      };
    }
    case 'CLEAR_EVENTS': {
      safeSetItem(STORAGE_KEYS.EVENTS, []);
      return {
        ...state,
        events: [],
        selectedEvent: null,
      };
    }
    case 'SELECT_EVENT':
      return {
        ...state,
        selectedEvent: action.event,
      };
    case 'RESET_DEFAULTS':
      safeSetItem(STORAGE_KEYS.SETTINGS, defaultSettings);
      safeSetItem(STORAGE_KEYS.EVENTS, []);
      return {
        ...state,
        settings: defaultSettings,
        events: [],
        simState: 'running',
        readings: [],
        status: 'Normal',
      };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  currentProfile: SensorProfile;
  currentChannel: { key: string; label: string; unit: string; ratedMin: number; ratedMax: number; defaultOpMin: number; defaultOpMax: number; decimals: number; maxRatePerSec: number; stuckTolerance: number; opRangeIsOfficialSpec: boolean };
  currentOpRange: { min: number; max: number };
  startSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  resetSimulation: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const timerRef = useRef<number | null>(null);

  const currentProfile = SENSOR_PROFILES.find((p) => p.id === state.currentProfileId) || SENSOR_PROFILES[0];
  const currentChannel = currentProfile.channels.find((c) => c.key === state.currentChannelKey) || currentProfile.channels[0];
  const profileOpRanges = state.settings.opRanges[currentProfile.id] || {};
  const currentOpRange = profileOpRanges[currentChannel.key] || {
    min: currentChannel.defaultOpMin,
    max: currentChannel.defaultOpMax,
  };

  // Simulation loop effect
  useEffect(() => {
    if (state.simState === 'running') {
      const intervalMs = state.settings.samplingMs || currentProfile.defaultSamplingMs;

      timerRef.current = window.setInterval(() => {
        dispatch({ type: 'TICK_SIMULATION' });
        const gen = generateReading(currentProfile, state.settings, state.tickCount);
        const val = gen.values[currentChannel.key];
        const reading: Reading = {
          sensorId: currentProfile.id,
          channel: currentChannel.key,
          timestamp: gen.timestamp,
          value: val !== undefined ? val : null,
          simulated: true,
        };

        // Get or create channel state
        const profileStates = state.channelStates[currentProfile.id] || {};
        const chanState = profileStates[currentChannel.key] || createInitialChannelState();

        const evalRes = evaluate(
          currentProfile,
          currentChannel.key,
          currentOpRange,
          state.settings,
          { timestamp: reading.timestamp, value: reading.value },
          chanState,
          state.events,
          Date.now()
        );

        // Update channel states cache in ref/state if needed
        state.channelStates[currentProfile.id] = {
          ...profileStates,
          [currentChannel.key]: evalRes.newState,
        };

        dispatch({
          type: 'ADD_READING',
          reading,
          events: evalRes.newEvents,
          resolvedIds: evalRes.resolvedEventIds,
          status: evalRes.status,
        });
      }, intervalMs);
    } else {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.simState, state.settings, currentProfile, currentChannel, currentOpRange, state.tickCount]);

  const startSimulation = () => dispatch({ type: 'SET_SIM_STATE', state: 'running' });
  const pauseSimulation = () => dispatch({ type: 'SET_SIM_STATE', state: 'paused' });
  const resumeSimulation = () => dispatch({ type: 'SET_SIM_STATE', state: 'running' });
  const resetSimulation = () => {
    dispatch({ type: 'SET_SIM_STATE', state: 'stopped' });
    dispatch({ type: 'SET_PROFILE', profileId: currentProfile.id });
    setTimeout(() => dispatch({ type: 'SET_SIM_STATE', state: 'running' }), 50);
  };

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        currentProfile,
        currentChannel,
        currentOpRange,
        startSimulation,
        pauseSimulation,
        resumeSimulation,
        resetSimulation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
