import { initializeApp, getApps, deleteApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, type Database, type Unsubscribe } from 'firebase/database';
import { FirebaseRtdbConfig, InfusionTelemetry, ConnectionState } from '../types/infusion';

const CONFIG_STORAGE_KEY = 'med_monitor_firebase_rtdb_config';

export const DEFAULT_FIREBASE_CONFIG: FirebaseRtdbConfig = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
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
    const tpm = Number(raw.tpm ?? raw.tpm_count ?? raw.dropRate ?? raw.tetesan ?? 0);
    const berat = Number(raw.berat ?? raw.weight ?? raw.gram ?? 0);
    const volume = Number(raw.volume ?? raw.vol ?? Math.round(berat * 0.98));
    const suhu = Number(raw.suhu ?? raw.temperature ?? raw.temp ?? 21.4);
    const kelembaban = Number(raw.kelembaban ?? raw.humidity ?? raw.hum ?? 48.2);
    const tekanan = Number(raw.tekanan ?? raw.pressure ?? raw.baro ?? 1013.2);
    
    let status = typeof raw.status === 'string' ? raw.status : undefined;
    if (!status) {
      if (tpm === 0) status = 'Stagnant';
      else if (berat < 50) status = 'Low Volume';
      else status = 'Normal';
    }

    const esp_status = typeof raw.esp_status === 'string' ? raw.esp_status : (typeof raw.connection === 'string' ? raw.connection : 'Connected');
    const latency = Number(raw.latency ?? raw.ping ?? 14);
    const rssi = Number(raw.rssi ?? -64);
    const battery = Number(raw.battery ?? raw.baterai ?? raw.batt ?? 98);

    return {
      tpm: isNaN(tpm) ? 0 : tpm,
      berat: isNaN(berat) ? 184.2 : Number(berat.toFixed(1)),
      volume: isNaN(volume) ? 180 : Math.round(volume),
      suhu: isNaN(suhu) ? 21.4 : Number(suhu.toFixed(1)),
      kelembaban: isNaN(kelembaban) ? 48.2 : Number(kelembaban.toFixed(1)),
      tekanan: isNaN(tekanan) ? 1013.2 : Number(tekanan.toFixed(1)),
      status,
      esp_status,
      latency,
      rssi,
      battery,
      lastUpdated: typeof raw.last_updated === 'number' ? raw.last_updated : Date.now(),
    };
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
        berat: payload.berat ?? 184.2,
        volume: payload.volume ?? 180,
        suhu: payload.suhu ?? 21.4,
        kelembaban: payload.kelembaban ?? 48.2,
        tekanan: payload.tekanan ?? 1013.2,
        status: payload.status ?? (payload.tpm === 0 ? 'Stagnant' : 'Normal'),
        esp_status: 'Connected',
        latency: 14,
        rssi: -64,
        battery: 98,
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
