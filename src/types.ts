export type Severity = 'info' | 'warning' | 'critical';

export type Status = 'Normal' | 'Warning' | 'Critical' | 'No Data' | 'Disconnected';

export type RuleId = 'RANGE' | 'SPIKE' | 'STUCK' | 'MISSING' | 'CROSS_CHECK';

export interface Channel {
  key: string;
  label: string;
  unit: string;
  ratedMin: number;
  ratedMax: number;
  defaultOpMin: number;
  defaultOpMax: number;
  decimals: number;
  maxRatePerSec: number;
  stuckTolerance: number;
  opRangeIsOfficialSpec: boolean;
}

export interface SensorProfile {
  id: string;
  name: string;
  measurementType: string;
  channels: Channel[];
  expectedBehaviour: string;
  defaultSamplingMs: number;
  applicableRules: RuleId[];
  configNotes: string;
  verificationNote: string;
}

export interface Reading {
  sensorId: string;
  channel: string;
  timestamp: number;
  value: number | null;
  simulated: boolean;
}

export interface Settings {
  samplingMs: number;
  stuckWindowSec: number;
  spikeSensitivity: number; // 0.5 - 3
  retentionMax: number; // 50 - 2000
  defaultView: string;
  opRanges: Record<string, Record<string, { min: number; max: number }>>;
  staleTimeoutMultiplier: number; // default 3
}

export interface DiagEvent {
  id: string;
  timestamp: number;
  sensorId: string;
  sensorName: string;
  channel: string;
  rule: RuleId;
  severity: Severity;
  title: string;
  observed: number | null;
  limitText: string;
  explanation: string;
  checks: string[];
  state: 'Active' | 'Resolved';
  resolvedAt?: number;
  reviewed: boolean;
  isTest: boolean;
}

export interface ChannelState {
  recentReadings: { timestamp: number; value: number | null }[];
  lastSampleTime: number;
  activeAlerts: Record<RuleId, { eventId: string; consecutiveValidCount: number }>;
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  expectedRule: RuleId | 'NONE';
  actualRulesTriggered: RuleId[];
  passed: boolean;
  details: string;
}
