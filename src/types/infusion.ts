export interface InfusionTelemetry {
  tpm: number; // Tetesan Per Menit (drops/min)
  berat: number; // Weight in grams (e.g. 184.2)
  volume?: number; // Volume in mL (e.g. 180)
  suhu: number; // Ambient Temperature in °C (e.g. 21.4)
  kelembaban: number; // Humidity % RH (e.g. 48.2)
  tekanan?: number; // Pressure in hPa (e.g. 1013.2)
  status?: string; // e.g. "Stagnant", "Normal", "Alert", "Low Volume"
  esp_status?: string; // "Connected" | "Disconnected" | "Online" | "Offline"
  latency?: number; // Latency in ms (e.g. 14)
  rssi?: number; // Signal dBm (e.g. -64)
  qos?: number; // Quality of Service % (e.g. 99.8)
  firmware?: string; // e.g. "FW v2.4.1"
  uptime?: string; // e.g. "18h 42m"
  battery?: number; // Battery % (e.g. 98)
  mainsPower?: boolean; // Power source
  tareInitial?: number; // Initial bag weight (e.g. 512.0)
  delivered?: number; // Weight delivered (e.g. 327.8)
  targetTpm?: number; // Prescribed rate (e.g. 20)
  lastUpdated?: number; // Unix timestamp
  patientName?: string; // e.g. "Eleanor Vance"
  patientAge?: number; // e.g. 58
  patientGender?: string; // e.g. "F"
  mrn?: string; // e.g. "#492-0192"
  attendingDoc?: string; // e.g. "Dr. K. Holtz"
  medicationName?: string; // e.g. "Normal Saline 0.9% (500 mL Bag)"
  bedLocation?: string; // e.g. "ICU Ward 3 - Bed 04A"
}

export interface FirebaseRtdbConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  path: string; // default "/infus"
}

export type ConnectionState = 'unconfigured' | 'connecting' | 'connected' | 'disconnected' | 'error';
