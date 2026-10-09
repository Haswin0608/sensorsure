import { crossCheck, checkStale, evaluate, createInitialChannelState } from './diagnosticEngine';
import { SENSOR_PROFILES } from '../profiles/sensorProfiles';

export function runEngineSelfTests(): { name: string; passed: boolean; message: string }[] {
  const results: { name: string; passed: boolean; message: string }[] = [];

  // Test 1: crossCheck helper
  try {
    const cc1 = crossCheck(25.0, 25.4, 1.0);
    const cc2 = crossCheck(25.0, 27.0, 1.0);
    results.push({
      name: 'Cross-Check Helper',
      passed: cc1 === true && cc2 === false,
      message: cc1 && !cc2 ? 'Passed tolerance checks correctly.' : 'Failed tolerance logic.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name: 'Cross-Check Helper', passed: false, message: `Error: ${message}` });
  }

  // Test 2: checkStale helper
  try {
    const st1 = checkStale(10000, 2000, 5000); // 8000 > 5000 -> stale
    const st2 = checkStale(5000, 2000, 5000); // 3000 <= 5000 -> not stale
    results.push({
      name: 'Stale Timeout Helper',
      passed: st1 === true && st2 === false,
      message: st1 && !st2 ? 'Stale timeout correctly detected.' : 'Failed stale logic.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name: 'Stale Timeout Helper', passed: false, message: `Error: ${message}` });
  }

  // Test 3: Evaluate normal reading returns Normal status
  try {
    const profile = SENSOR_PROFILES[0]; // DHT11
    const state = createInitialChannelState();
    const settings = {
      samplingMs: 2000,
      stuckWindowSec: 30,
      spikeSensitivity: 1.0,
      retentionMax: 500,
      defaultView: 'dashboard',
      opRanges: { dht11: { temperature: { min: 15, max: 35 }, humidity: { min: 30, max: 70 } } },
      staleTimeoutMultiplier: 3,
    };
    const res = evaluate(
      profile,
      'temperature',
      { min: 15, max: 35 },
      settings,
      { timestamp: 1000, value: 25.0, simulated: true },
      state,
      [],
      2000
    );
    results.push({
      name: 'Engine Evaluation (Normal)',
      passed: res.status === 'Normal' && res.newEvents.length === 0,
      message: res.status === 'Normal' ? 'Evaluated normal reading successfully.' : `Status was ${res.status}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name: 'Engine Evaluation (Normal)', passed: false, message: `Error: ${message}` });
  }

  return results;
}
