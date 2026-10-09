import { SensorProfile, Channel, Settings, DiagEvent, ChannelState, RuleId, Status } from '../types';

export function createInitialChannelState(): ChannelState {
  return {
    recentReadings: [],
    lastSampleTime: 0,
    activeAlerts: {
      RANGE: { eventId: '', consecutiveValidCount: 0 },
      SPIKE: { eventId: '', consecutiveValidCount: 0 },
      STUCK: { eventId: '', consecutiveValidCount: 0 },
      MISSING: { eventId: '', consecutiveValidCount: 0 },
      CROSS_CHECK: { eventId: '', consecutiveValidCount: 0 },
    },
  };
}

export function crossCheck(a: number, b: number, tolerance: number): boolean {
  // Marked as not active: requires two independent sensors
  return Math.abs(a - b) <= tolerance;
}

export function checkStale(now: number, lastSampleTime: number, staleTimeoutMs: number): boolean {
  if (lastSampleTime === 0) return false;
  return now - lastSampleTime > staleTimeoutMs;
}

interface EvalResult {
  newState: ChannelState;
  newEvents: DiagEvent[];
  resolvedEventIds: string[];
  status: Status;
}

export function evaluate(
  profile: SensorProfile,
  channelKey: string,
  opRange: { min: number; max: number },
  settings: Settings,
  newReading: { timestamp: number; value: number | null; simulated?: boolean },
  currentState: ChannelState,
  existingEvents: DiagEvent[],
  now: number
): EvalResult {
  const channel = profile.channels.find((c) => c.key === channelKey);
  if (!channel) {
    return {
      newState: currentState,
      newEvents: [],
      resolvedEventIds: [],
      status: 'No Data',
    };
  }

  const newEvents: DiagEvent[] = [];
  const resolvedEventIds: string[] = [];

  // Clone state structures
  const recentReadings = [...currentState.recentReadings, newReading];
  // Keep last 100 readings for window analysis
  if (recentReadings.length > 100) {
    recentReadings.shift();
  }

  const activeAlerts = JSON.parse(JSON.stringify(currentState.activeAlerts)) as ChannelState['activeAlerts'];
  let lastSampleTime = currentState.lastSampleTime;

  const isInvalid =
    newReading.value === null ||
    Number.isNaN(newReading.value) ||
    !Number.isFinite(newReading.value);

  if (!isInvalid) {
    lastSampleTime = newReading.timestamp;
  }

  const staleTimeoutMs = settings.samplingMs * settings.staleTimeoutMultiplier;
  const isStale = checkStale(now, lastSampleTime, staleTimeoutMs);

  // 1. MISSING / INVALID RULE CHECK
  if (isInvalid) {
    const rule: RuleId = 'MISSING';
    const alertInfo = activeAlerts[rule];
    if (!alertInfo.eventId) {
      const eventId = `ev-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newEvent: DiagEvent = {
        id: eventId,
        timestamp: newReading.timestamp,
        sensorId: profile.id,
        sensorName: profile.name,
        channel: channel.label,
        rule,
        severity: 'critical',
        title: 'Missing or Invalid Sensor Data',
        observed: newReading.value,
        limitText: 'Valid numeric reading expected',
        explanation:
          'Sensor is transmitting null, NaN, or non-numeric data packets. This may indicate a loose signal wire, power dropout, or communication failure.',
        checks: [
          'Verify sensor wiring connections and terminal blocks.',
          'Check power supply voltage (VCC and GND continuity).',
          'Inspect interface wiring (I2C/SPI/UART/Analog pins).',
        ],
        state: 'Active',
        reviewed: false,
        isTest: !newReading.simulated,
      };
      newEvents.push(newEvent);
      alertInfo.eventId = eventId;
    }
    alertInfo.consecutiveValidCount = 0;
  } else {
    // Check if MISSING was active and can be resolved
    const rule: RuleId = 'MISSING';
    const alertInfo = activeAlerts[rule];
    if (alertInfo.eventId) {
      resolvedEventIds.push(alertInfo.eventId);
      // Mark event resolved in existing events if needed
      alertInfo.eventId = '';
    }
  }

  // 2. STALE / DISCONNECTED CHECK
  if (isStale) {
    const rule: RuleId = 'MISSING';
    const alertInfo = activeAlerts[rule];
    if (!alertInfo.eventId) {
      const eventId = `ev-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newEvent: DiagEvent = {
        id: eventId,
        timestamp: now,
        sensorId: profile.id,
        sensorName: profile.name,
        channel: channel.label,
        rule,
        severity: 'critical',
        title: 'Sensor Disconnected / Stale Data',
        observed: null,
        limitText: `No update received within ${staleTimeoutMs / 1000}s`,
        explanation:
          'No fresh data packets have been received from the sensor within the expected timeout window. The sensor may be disconnected or unresponsive.',
        checks: [
          'Confirm sensor power LED or status indicator is lit.',
          'Check serial or network interface connection.',
          'Verify sampling rate and timeout settings.',
        ],
        state: 'Active',
        reviewed: false,
        isTest: false,
      };
      newEvents.push(newEvent);
      alertInfo.eventId = eventId;
    }
  }

  // If valid reading, check RANGE, SPIKE, STUCK
  if (!isInvalid && !isStale) {
    const val = newReading.value as number;

    // --- RANGE CHECK ---
    const rangeRule: RuleId = 'RANGE';
    const rangeAlert = activeAlerts[rangeRule];
    let rangeSeverity: 'warning' | 'critical' | null = null;
    let rangeLimitText = '';
    let rangeTitle = '';
    let rangeExplanation = '';

    if (val < channel.ratedMin || val > channel.ratedMax) {
      rangeSeverity = 'critical';
      rangeLimitText = `Rated Spec: [${channel.ratedMin}, ${channel.ratedMax}] ${channel.unit}`;
      rangeTitle = 'Reading Outside Rated Specification';
      rangeExplanation = `Observed value (${val} ${channel.unit}) exceeds the absolute physical rated limits of the sensor. Possible hardware saturation, sensor damage, or severe environmental overload.`;
    } else if (val < opRange.min || val > opRange.max) {
      rangeSeverity = 'warning';
      rangeLimitText = `Operating Range: [${opRange.min}, ${opRange.max}] ${channel.unit}`;
      rangeTitle = 'Reading Outside Operating Range';
      rangeExplanation = `Observed value (${val} ${channel.unit}) is outside the user-configured operating threshold. Possible normal process fluctuation or sub-optimal operating conditions.`;
    }

    if (rangeSeverity) {
      if (!rangeAlert.eventId) {
        const eventId = `ev-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newEvent: DiagEvent = {
          id: eventId,
          timestamp: newReading.timestamp,
          sensorId: profile.id,
          sensorName: profile.name,
          channel: channel.label,
          rule: rangeRule,
          severity: rangeSeverity,
          title: rangeTitle,
          observed: val,
          limitText: rangeLimitText,
          explanation: rangeExplanation,
          checks: [
            'Compare reading with a calibrated reference instrument.',
            'Check for localized heat sources, drafts, or obstructions.',
            'Verify operating threshold configuration in Settings.',
          ],
          state: 'Active',
          reviewed: false,
          isTest: false,
        };
        newEvents.push(newEvent);
        rangeAlert.eventId = eventId;
        rangeAlert.consecutiveValidCount = 0;
      } else {
        rangeAlert.consecutiveValidCount = 0;
      }
    } else {
      // Clear condition: reading valid and back in range for 3 consecutive samples
      if (rangeAlert.eventId) {
        rangeAlert.consecutiveValidCount += 1;
        if (rangeAlert.consecutiveValidCount >= 3) {
          resolvedEventIds.push(rangeAlert.eventId);
          rangeAlert.eventId = '';
          rangeAlert.consecutiveValidCount = 0;
        }
      }
    }

    // --- SPIKE CHECK ---
    const spikeRule: RuleId = 'SPIKE';
    const spikeAlert = activeAlerts[spikeRule];
    const validReadings = recentReadings.filter((r) => r.value !== null && Number.isFinite(r.value));

    let isSpike = false;
    let spikeLimit = 0;
    if (validReadings.length >= 2) {
      const prev = validReadings[validReadings.length - 2];
      const dt = (newReading.timestamp - prev.timestamp) / 1000;
      if (dt > 0) {
        const diff = Math.abs(val - prev.value!);
        spikeLimit = channel.maxRatePerSec * settings.spikeSensitivity * dt;
        if (diff > spikeLimit) {
          isSpike = true;
        }
      }
    }

    if (isSpike) {
      if (!spikeAlert.eventId) {
        const eventId = `ev-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newEvent: DiagEvent = {
          id: eventId,
          timestamp: newReading.timestamp,
          sensorId: profile.id,
          sensorName: profile.name,
          channel: channel.label,
          rule: spikeRule,
          severity: 'warning',
          title: 'Sudden Rate of Change (Spike)',
          observed: val,
          limitText: `Max allowed rate: ${(channel.maxRatePerSec * settings.spikeSensitivity).toFixed(1)} ${channel.unit}/s`,
          explanation:
            'Value changed much faster than the physical time constant of the sensed phenomenon. Possible electrical noise pickup, loose contact, or electromagnetic interference (EMI).',
          checks: [
            'Inspect cabling for shielding and grounding integrity.',
            'Check for nearby high-current inductive loads (motors, relays).',
            'Verify power supply filtering capacitors.',
          ],
          state: 'Active',
          reviewed: false,
          isTest: false,
        };
        newEvents.push(newEvent);
        spikeAlert.eventId = eventId;
        spikeAlert.consecutiveValidCount = 0;
      } else {
        spikeAlert.consecutiveValidCount = 0;
      }
    } else {
      if (spikeAlert.eventId) {
        spikeAlert.consecutiveValidCount += 1;
        if (spikeAlert.consecutiveValidCount >= 3) {
          resolvedEventIds.push(spikeAlert.eventId);
          spikeAlert.eventId = '';
          spikeAlert.consecutiveValidCount = 0;
        }
      }
    }

    // --- STUCK CHECK ---
    const stuckRule: RuleId = 'STUCK';
    const stuckAlert = activeAlerts[stuckRule];
    const stuckWindowMs = settings.stuckWindowSec * 1000;
    const windowStart = newReading.timestamp - stuckWindowMs;
    const windowReadings = recentReadings.filter((r) => r.timestamp >= windowStart && r.value !== null && Number.isFinite(r.value));

    // Needs at least 5 samples spanning >= 80% of the window
    let isStuck = false;
    if (windowReadings.length >= 5) {
      const span = windowReadings[windowReadings.length - 1].timestamp - windowReadings[0].timestamp;
      if (span >= stuckWindowMs * 0.8) {
        const values = windowReadings.map((r) => r.value as number);
        const minV = Math.min(...values);
        const maxV = Math.max(...values);
        if (maxV - minV <= channel.stuckTolerance) {
          isStuck = !isInvalid; // Don't flag stuck if already missing/invalid
        }
      }
    }

    if (isStuck) {
      if (!stuckAlert.eventId) {
        const eventId = `ev-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newEvent: DiagEvent = {
          id: eventId,
          timestamp: newReading.timestamp,
          sensorId: profile.id,
          sensorName: profile.name,
          channel: channel.label,
          rule: stuckRule,
          severity: 'warning',
          title: 'Sensor Output Stuck / Frozen',
          observed: val,
          limitText: `Max variation ≤ ${channel.stuckTolerance} ${channel.unit} over ${settings.stuckWindowSec}s`,
          explanation:
            'Sensor output remained nearly constant over an extended time window. A constant value can be legitimate in a highly stable environment, but may also indicate a frozen ADC register, locked I2C bus, or unresponsive sensor firmware.',
          checks: [
            'Verify if the environment is genuinely static (e.g., insulated box).',
            'Check for communication bus lockup (I2C SDA/SCL pull-ups).',
            'Test sensor response by gently disturbing the environment.',
          ],
          state: 'Active',
          reviewed: false,
          isTest: false,
        };
        newEvents.push(newEvent);
        stuckAlert.eventId = eventId;
      }
    } else {
      if (stuckAlert.eventId) {
        resolvedEventIds.push(stuckAlert.eventId);
        stuckAlert.eventId = '';
      }
    }
  }

  // Compute overall status
  let status: Status = 'Normal';
  if (isInvalid) {
    status = 'No Data';
  } else if (isStale) {
    status = 'Disconnected';
  } else {
    // Check active alerts across all rules for this channel
    let hasCritical = false;
    let hasWarning = false;

    // Check against existing events that are active for this sensor/channel
    const channelActiveEvents = existingEvents.filter(
      (ev) => ev.sensorId === profile.id && ev.channel === channel.label && ev.state === 'Active'
    );
    // Also include newly added events
    const allActive = [...channelActiveEvents, ...newEvents];

    for (const ev of allActive) {
      if (ev.severity === 'critical') hasCritical = true;
      if (ev.severity === 'warning') hasWarning = true;
    }

    if (hasCritical) status = 'Critical';
    else if (hasWarning) status = 'Warning';
    else status = 'Normal';
  }

  return {
    newState: {
      recentReadings,
      lastSampleTime,
      activeAlerts,
    },
    newEvents,
    resolvedEventIds,
    status,
  };
}
