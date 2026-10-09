import { SensorProfile, Settings, ScenarioResult, RuleId, DiagEvent } from '../types';
import { evaluate, createInitialChannelState } from './diagnosticEngine';

export interface TestScenarioDef {
  id: string;
  name: string;
  description: string;
  expectedRule: RuleId | 'NONE';
  generateReadings: (profile: SensorProfile, channelKey: string) => { timestamp: number; value: number | null; simulated: boolean }[];
}

export function getTestScenarios(profile: SensorProfile, channelKey: string): TestScenarioDef[] {
  const channel = profile.channels.find((c) => c.key === channelKey) || profile.channels[0];
  const baseTime = 1000000000;

  return [
    {
      id: 'normal',
      name: 'Normal Operating Conditions',
      description: 'Steady sequence of readings well within operating range with normal variation.',
      expectedRule: 'NONE',
      generateReadings: () => {
        const readings = [];
        const mid = (channel.defaultOpMin + channel.defaultOpMax) / 2;
        for (let i = 0; i < 10; i++) {
          readings.push({
            timestamp: baseTime + i * 1000,
            value: mid + (i % 2 === 0 ? 0.2 : -0.2),
            simulated: true,
          });
        }
        return readings;
      },
    },
    {
      id: 'out-of-range',
      name: 'Out-of-Range Fault',
      description: 'Readings pushed well beyond the operating range (or rated spec).',
      expectedRule: 'RANGE',
      generateReadings: () => {
        const readings = [];
        const mid = (channel.defaultOpMin + channel.defaultOpMax) / 2;
        for (let i = 0; i < 5; i++) {
          readings.push({ timestamp: baseTime + i * 1000, value: mid, simulated: true });
        }
        // Exceed range
        readings.push({
          timestamp: baseTime + 5000,
          value: channel.ratedMax + 10,
          simulated: true,
        });
        readings.push({
          timestamp: baseTime + 6000,
          value: channel.ratedMax + 12,
          simulated: true,
        });
        return readings;
      },
    },
    {
      id: 'spike',
      name: 'Sudden Spike / EMI Noise',
      description: 'Sudden rate of change exceeding max rate per second.',
      expectedRule: 'SPIKE',
      generateReadings: () => {
        const readings = [];
        const mid = (channel.defaultOpMin + channel.defaultOpMax) / 2;
        for (let i = 0; i < 5; i++) {
          readings.push({ timestamp: baseTime + i * 1000, value: mid, simulated: true });
        }
        // Sudden massive jump
        readings.push({
          timestamp: baseTime + 6000,
          value: mid + channel.maxRatePerSec * 10,
          simulated: true,
        });
        return readings;
      },
    },
    {
      id: 'stuck',
      name: 'Stuck Reading (Frozen Output)',
      description: 'Constant exact value maintained over multiple seconds within stuck tolerance.',
      expectedRule: 'STUCK',
      generateReadings: () => {
        const readings = [];
        const mid = (channel.defaultOpMin + channel.defaultOpMax) / 2;
        for (let i = 0; i < 8; i++) {
          readings.push({
            timestamp: baseTime + i * 1000,
            value: Math.round(mid * 10) / 10,
            simulated: true,
          });
        }
        return readings;
      },
    },
    {
      id: 'missing',
      name: 'Missing / Invalid Data Packet',
      description: 'Transmission of null values indicating sensor communication drop.',
      expectedRule: 'MISSING',
      generateReadings: () => {
        const readings = [];
        const mid = (channel.defaultOpMin + channel.defaultOpMax) / 2;
        for (let i = 0; i < 4; i++) {
          readings.push({ timestamp: baseTime + i * 1000, value: mid, simulated: true });
        }
        readings.push({ timestamp: baseTime + 5000, value: null, simulated: true });
        readings.push({ timestamp: baseTime + 6000, value: null, simulated: true });
        return readings;
      },
    },
    {
      id: 'stale-timeout',
      name: 'Stale / Disconnected Timeout',
      description: 'Long delay exceeding timeout multiplier without data updates.',
      expectedRule: 'MISSING',
      generateReadings: () => {
        const readings = [];
        const mid = (channel.defaultOpMin + channel.defaultOpMax) / 2;
        readings.push({ timestamp: baseTime, value: mid, simulated: true });
        // Jump time forward past timeout
        readings.push({ timestamp: baseTime + 15000, value: mid, simulated: true });
        return readings;
      },
    },
  ];
}

export function runScenario(
  scenario: TestScenarioDef,
  profile: SensorProfile,
  channelKey: string,
  settings: Settings
): ScenarioResult {
  const readings = scenario.generateReadings(profile, channelKey);
  let state = createInitialChannelState();
  const allEvents: DiagEvent[] = [];
  const triggeredRules = new Set<RuleId>();

  const profileRanges = settings.opRanges[profile.id];
  const channel = profile.channels.find((c) => c.key === channelKey) || profile.channels[0];
  const opRange = profileRanges?.[channelKey] || {
    min: channel.defaultOpMin,
    max: channel.defaultOpMax,
  };

  readings.forEach((r, idx) => {
    const evalRes = evaluate(
      profile,
      channelKey,
      opRange,
      settings,
      r,
      state,
      allEvents,
      r.timestamp + (idx === readings.length - 1 ? 100 : 0)
    );
    state = evalRes.newState;
    evalRes.newEvents.forEach((ev) => {
      allEvents.push({ ...ev, isTest: true });
      triggeredRules.add(ev.rule);
    });
  });

  const actualRulesArray = Array.from(triggeredRules);
  let passed = false;

  if (scenario.expectedRule === 'NONE') {
    passed = actualRulesArray.length === 0;
  } else {
    passed = actualRulesArray.includes(scenario.expectedRule as RuleId);
  }

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    expectedRule: scenario.expectedRule,
    actualRulesTriggered: actualRulesArray,
    passed,
    details: passed
      ? `Successfully detected expected rule [${scenario.expectedRule}].`
      : `Expected [${scenario.expectedRule}], but triggered [${actualRulesArray.join(', ') || 'NONE'}].`,
  };
}
