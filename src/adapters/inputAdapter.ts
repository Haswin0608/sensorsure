import { SensorProfile, Settings } from '../types';
import { generateReading, GeneratedReading } from '../engine/simulator';

export interface ReadingInput {
  name: string;
  isConnected: boolean;
  start(
    callback: (reading: GeneratedReading) => void,
    profile?: SensorProfile,
    settings?: Settings,
    getTickCount?: () => number
  ): void;
  stop(): void;
}

export class SimulationAdapter implements ReadingInput {
  name = 'Built-in Simulation Mode';
  isConnected = true;
  private timer: number | null = null;

  start(callback: (reading: GeneratedReading) => void, profile: SensorProfile, settings: Settings, getTickCount: () => number): void {
    this.stop();
    const interval = settings.samplingMs || profile.defaultSamplingMs;

    this.timer = window.setInterval(() => {
      const reading = generateReading(profile, settings, getTickCount());
      callback(reading);
    }, interval);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

/**
 * ============================================================================
 * HARDWARE INPUT ADAPTER PLACEHOLDERS (NOT IMPLEMENTED)
 * ============================================================================
 * 
 * Planned architecture for physical hardware connection:
 * 
 * 1. Arduino USB Serial Adapter (Web Serial API):
 *    - Uses navigator.serial.requestPort()
 *    - Reads incoming newline-delimited JSON or CSV lines:
 *      { "sensorId": "dht11", "timestamp": 123456789, "values": { "temperature": 24.5, "humidity": 55 } }
 *    - Implements ReadingInput interface.
 * 
 * 2. ESP32 Wi-Fi Adapter (HTTP Polling or WebSocket):
 *    - Connects to ws://<esp32-ip-address>/ws or GET http://<esp32-ip-address>/sensor
 *    - Parses JSON payloads matching the ReadingInput schema.
 * 
 * Both placeholders are reserved for future capstone expansion outside simulation mode.
 * ============================================================================
 */
export const HARDWARE_ADAPTER_PLACEHOLDERS = {
  arduinoWebSerial: {
    status: 'Planned / Not Implemented',
    description: 'Direct USB serial streaming from Arduino / AVR microcontrollers via Web Serial API.',
    jsonSchema: '{"sensorId": "string", "timestamp": number, "values": Record<string, number>}',
  },
  esp32WiFi: {
    status: 'Planned / Not Implemented',
    description: 'Wi-Fi telemetry ingestion from ESP32 / ESP8266 nodes via HTTP REST or WebSockets.',
    jsonSchema: '{"sensorId": "string", "timestamp": number, "values": Record<string, number>}',
  },
};
