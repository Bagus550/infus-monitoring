import { initializeApp, getApps, deleteApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, type Database, type Unsubscribe } from 'firebase/database';
import { getAnalytics } from "firebase/analytics";
import { FirebaseRtdbConfig, InfusionTelemetry, ConnectionState } from '../types/infusion';

const CONFIG_STORAGE_KEY = 'med_monitor_firebase_rtdb_config';

export const DEFAULT_FIREBASE_CONFIG: FirebaseRtdbConfig = {
  apiKey: 'AIzaSyBiVYX297I_AzQiBbKiGkQGpQnkzyqj-Rk',
  authDomain: 'monitoring-infus-353c2.firebaseapp.com',
  databaseURL: 'https://monitoring-infus-353c2-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'monitoring-infus-353c2',
  storageBucket: 'monitoring-infus-353c2.firebasestorage.app',
  messagingSenderId: '683979006731',
  appId: '1:683979006731:web:406d07e575440ffbfef80e',
  path: '/infus'
};

class FirebaseRealtimeService {
  private app: FirebaseApp | null = null;
  private db: Database | null = null;
  private unsubscribe: Unsubscribe | null = null;
  private connectionState: ConnectionState = 'unconfigured';
  private connectionError: string | null = null;
  private listeners: Set<(state: ConnectionState, error: string | null) => void> = new Set();
  private dataListeners: Set<(data: Partial<InfusionTelemetry>) => void> = new Set();

  constructor() {
    // Attempt to load from localStorage
  }

  public getSavedConfig(): FirebaseRtdbConfig {
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_FIREBASE_CONFIG, ...parsed, path: parsed.path || '/infus' };
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_FIREBASE_CONFIG };
  }

  public saveConfig(config: FirebaseRtdbConfig) {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  }

  public subscribeConnectionState(cb: (state: ConnectionState, error: string | null) => void) {
    this.listeners.add(cb);
    cb(this.connectionState, this.connectionError);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public subscribeData(cb: (data: Partial<InfusionTelemetry>) => void) {
    this.dataListeners.add(cb);
    return () => {
      this.dataListeners.delete(cb);
    };
  }

  private notifyConnection(state: ConnectionState, error: string | null = null) {
    this.connectionState = state;
    this.connectionError = error;
    this.listeners.forEach((cb) => cb(state, error));
  }

  private notifyData(data: Partial<InfusionTelemetry>) {
    this.dataListeners.forEach((cb) => cb(data));
  }

  public disconnect() {
    if (this.unsubscribe) {
      try {
        this.unsubscribe();
      } catch {
        // ignore
      }
      this.unsubscribe = null;
    }
    this.db = null;
    if (this.app) {
      try {
        deleteApp(this.app);
      } catch {
        // ignore
      }
      this.app = null;
    }
    this.notifyConnection('unconfigured', null);
  }

  public connect(config: FirebaseRtdbConfig) {
    this.disconnect();

    const cleanDbUrl = config.databaseURL?.trim();
    if (!cleanDbUrl) {
      this.notifyConnection('unconfigured', 'URL Realtime Database belum diisi');
      return;
    }

    this.notifyConnection('connecting', null);

    try {
      const existingApps = getApps();
      const appName = `rtdb_monitor_${Date.now()}`;
      
      const firebaseAppConfig = {
        apiKey: config.apiKey?.trim() || 'placeholder-key',
        authDomain: config.authDomain?.trim() || undefined,
        databaseURL: cleanDbUrl,
        projectId: config.projectId?.trim() || 'med-monitor-project',
        storageBucket: config.storageBucket?.trim() || undefined,
        messagingSenderId: config.messagingSenderId?.trim() || undefined,
        appId: config.appId?.trim() || undefined,
      };

      this.app = initializeApp(firebaseAppConfig, appName);
      this.db = getDatabase(this.app);

      const listenPath = (config.path?.trim() || '/infus').replace(/^\/?/, '/');
      const dataRef = ref(this.db, listenPath);

      // Set up onValue listener using Modular Firebase SDK v10
      this.unsubscribe = onValue(
        dataRef,
        (snapshot) => {
          this.notifyConnection('connected', null);
          if (snapshot.exists()) {
            const rawVal = snapshot.val();
            const normalized = this.normalizePayload(rawVal);
            this.notifyData(normalized);
          } else {
            // Snapshot exists but is null at this path
            this.notifyData({});
          }
        },
        (error) => {
          const errMsg = error.message || 'Gagal tersambung ke Firebase RTDB';
          this.notifyConnection('error', errMsg);
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Inisialisasi Firebase gagal';
      this.notifyConnection('error', msg);
    }
  }

  /**
   * Helper to normalize raw values from ESP32 payload
   * Supports Indonesian & English keys commonly sent by microcontrollers
   */
  public normalizePayload(val: unknown): Partial<InfusionTelemetry> {
    if (!val || typeof val !== 'object') {
      return {};
    }

    const raw = val as Record<string, unknown>;

    // Case-insensitive key lookup helper
    const getVal = (...keys: string[]): unknown => {
      for (const key of keys) {
        if (raw[key] !== undefined && raw[key] !== null) return raw[key];
        const foundKey = Object.keys(raw).find((k) => k.toLowerCase() === key.toLowerCase());
        if (foundKey && raw[foundKey] !== undefined && raw[foundKey] !== null) return raw[foundKey];
      }
      return undefined;
    };

    const parseNum = (v: unknown): number | undefined => {
      if (v === undefined || v === null || v === '') return undefined;
      const n = Number(v);
      return isNaN(n) ? undefined : n;
    };

    const rawTpm = parseNum(getVal('tpm', 'tpm_count', 'dropRate', 'droprate', 'drop_rate', 'tetesan', 'bpm'));
    const rawBerat = parseNum(getVal('berat_gram', 'berat', 'weight', 'gram', 'loadcell', 'berat_infus', 'w', 'b'));
    const rawVolume = parseNum(getVal('volume', 'vol', 'ml', 'v', 'volume_infus'));
    const rawSuhu = parseNum(getVal('suhu', 'temperature', 'temp', 't', 'celsius', 'suhu_ruang'));
    const rawKelembaban = parseNum(getVal('kelembaban', 'kelembapan', 'humidity', 'hum', 'rh', 'h'));
    const rawTekanan = parseNum(getVal('tekanan', 'pressure', 'baro'));

    const res: Partial<InfusionTelemetry> = {};

    if (rawTpm !== undefined) res.tpm = Math.max(0, Math.round(rawTpm));
    if (rawBerat !== undefined) res.berat = Number(rawBerat.toFixed(1));
    
    if (rawVolume !== undefined) {
      res.volume = Math.max(0, Math.round(rawVolume));
    } else if (rawBerat !== undefined) {
      res.volume = Math.max(0, Math.round(rawBerat * 0.98));
    }

    if (rawSuhu !== undefined) res.suhu = Number(rawSuhu.toFixed(1));
    if (rawKelembaban !== undefined) res.kelembaban = Number(rawKelembaban.toFixed(1));
    if (rawTekanan !== undefined) res.tekanan = Number(rawTekanan.toFixed(1));

    const statusVal = getVal('status_infus', 'statusInfus', 'status');
    if (typeof statusVal === 'string' && statusVal.trim().length > 0) {
      res.status = statusVal.trim();
    } else if (res.tpm !== undefined || res.berat !== undefined) {
      const curTpm = res.tpm ?? 0;
      const curBerat = res.berat ?? 184.2;
      if (curTpm === 0) res.status = 'Stagnant';
      else if (curBerat < 50) res.status = 'Low Volume';
      else res.status = 'Normal';
    }

    const espStatusVal = getVal('status_koneksi', 'statusKoneksi', 'esp_status', 'espStatus', 'connection', 'status_esp');
    if (typeof espStatusVal === 'string') {
      res.esp_status = espStatusVal;
    }

    const latencyVal = parseNum(getVal('latency', 'ping'));
    if (latencyVal !== undefined) res.latency = latencyVal;

    const rssiVal = parseNum(getVal('rssi'));
    if (rssiVal !== undefined) res.rssi = rssiVal;

    const batteryVal = parseNum(getVal('battery', 'baterai', 'batt'));
    if (batteryVal !== undefined) res.battery = batteryVal;

    const lastUpdatedVal = getVal('last_updated', 'lastUpdated', 'timestamp');
    if (typeof lastUpdatedVal === 'number') {
      res.lastUpdated = lastUpdatedVal;
    } else {
      res.lastUpdated = Date.now();
    }

    return res;
  }

  /**
   * Send test payload directly to Firebase RTDB path
   */
  public async sendTestPayload(payload: Partial<InfusionTelemetry>): Promise<{ success: boolean; message?: string }> {
    if (!this.db || !this.app) {
      return { success: false, message: 'Database belum terhubung. Harap simpan kredensial valid.' };
    }

    try {
      const config = this.getSavedConfig();
      const targetPath = (config.path || '/infus').replace(/^\/?/, '/');
      const dataRef = ref(this.db, targetPath);
      await set(dataRef, {
        tpm: payload.tpm ?? 0,
        berat_gram: payload.berat ?? 184.2,
        suhu: payload.suhu ?? 21.4,
        kelembapan: payload.kelembaban ?? 48.2,
        status_koneksi: 'Terhubung',
        status_infus: payload.status ?? (payload.tpm === 0 ? 'Macet / Habis' : 'Lancar'),
        last_updated: Date.now()
      });
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim data ke Firebase RTDB';
      return { success: false, message: msg };
    }
  }
}

export const firebaseRtdb = new FirebaseRealtimeService();
