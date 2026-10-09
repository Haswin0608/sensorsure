import { SensorProfile, Channel, Settings } from '../types';

export interface GeneratedReading {
  timestamp: number;
  values: Record<string, number>;
  simulated: true;
}

export function generateReading(
  profile: SensorProfile,
  settings: Settings,
  tickCount: number
): GeneratedReading {
  const timestamp = Date.now();
  const values: Record<string, number> = {};

  profile.channels.forEach((channel) => {
    // Get user operating range or default
    const profileRanges = settings.opRanges[profile.id];
    const opRange = profileRanges?.[channel.key] || {
      min: channel.defaultOpMin,
      max: channel.defaultOpMax,
    };

    const midpoint = (opRange.min + opRange.max) / 2;
    const amplitude = (opRange.max - opRange.min) * 0.25;

    // Slow sine drift based on tickCount
    const drift = Math.sin(tickCount * 0.15) * amplitude;

    // Gaussian-like noise (sum of 3 randoms) ensuring noise amplitude > stuckTolerance
    const noiseSpan = Math.max(channel.stuckTolerance * 2.5, amplitude * 0.1);
    const noise = (Math.random() + Math.random() + Math.random() - 1.5) * noiseSpan;

    let rawVal = midpoint + drift + noise;

    // Clamp inside operating range with safety margin
    const safetyMargin = (opRange.max - opRange.min) * 0.05;
    const clampedMin = opRange.min + safetyMargin;
    const clampedMax = opRange.max - safetyMargin;

    if (rawVal < clampedMin) rawVal = clampedMin;
    if (rawVal > clampedMax) rawVal = clampedMax;

    // Round to channel decimals
    const factor = Math.pow(10, channel.decimals);
    values[channel.key] = Math.round(rawVal * factor) / factor;
  });

  return {
    timestamp,
    values,
    simulated: true,
  };
}
