import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Code, 
  Cpu, 
  FileJson, 
  Layers, 
  Check, 
  Copy, 
  Send, 
  Sparkles,
  Zap,
  Terminal
} from 'lucide-react';
import { InfusionTelemetry } from '../types/infusion';

interface EngineeringBlueprintProps {
  currentTelemetry: InfusionTelemetry;
  onSendCustomPayload: (payload: Partial<InfusionTelemetry>) => Promise<boolean>;
}

export const EngineeringBlueprint: React.FC<EngineeringBlueprintProps> = ({
  currentTelemetry,
  onSendCustomPayload
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'firmware' | 'schema' | 'pinout' | 'protocol'>('firmware');
  const [copied, setCopied] = useState(false);
  const [testPayloadJson, setTestPayloadJson] = useState(() => JSON.stringify({
    tpm: 20,
    berat: 245.5,
    volume: 240,
    suhu: 21.8,
    kelembaban: 49.0,
    tekanan: 1013.2,
    status: "Normal",
    esp_status: "Online",
    rssi: -62,
    battery: 99
  }, null, 2));
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePushTest = async () => {
    try {
      const parsed = JSON.parse(testPayloadJson);
      setPushStatus('Mengirim ke /infus...');
      const success = await onSendCustomPayload(parsed);
      if (success) {
        setPushStatus('Berhasil dikirim ke /infus!');
      } else {
        setPushStatus('Gagal kirim. Cek konfigurasi Firebase RTDB.');
      }
    } catch {
      setPushStatus('Error: JSON tidak valid');
    }
    setTimeout(() => setPushStatus(null), 3000);
  };

  const esp32ArduinoSketch = `/*
 * Med-Monitor ESP32 Bedside Infusion Telemetry Firmware
 * Library: Firebase ESP Client by Mobizt (v4.x)
 * Target: ESP32 Dev Module (WROOM-32)
 * Path Firebase RTDB: /infus
 */

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include "HX711.h"
#include "DHT.h"

// 1. Kredensial WiFi
#define WIFI_SSID "NAMA_WIFI_RUMAH_SAKIT"
#define WIFI_PASSWORD "PASSWORD_WIFI"

// 2. Kredensial Firebase Realtime Database
#define API_KEY "MASUKKAN_FIREBASE_API_KEY_ANDA"
#define DATABASE_URL "https://YOUR-PROJECT-NAME-default-rtdb.firebaseio.com"

// 3. Pinout Hardware
#define IR_SENSOR_PIN 4      // Sensor Optik Tetesan (Interrupt)
#define LOADCELL_DOUT_PIN 16 // HX711 DT
#define LOADCELL_SCK_PIN 17  // HX711 SCK
#define DHTPIN 18            // DHT22 Suhu & Kelembaban
#define DHTTYPE DHT22
#define BUZZER_PIN 19        // Alarm lokal buzzer

// Objek Firebase & Sensor
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
HX711 scale;
DHT dht(DHTPIN, DHTTYPE);

// Variabel Telemetri
volatile unsigned long dropCount = 0;
volatile unsigned long lastDropTime = 0;
unsigned long lastPublishTime = 0;
float currentWeight = 500.0;
float currentTemp = 21.4;
float currentHum = 48.2;

// Interrupt Service Routine (ISR) untuk sensor tetesan
void IRAM_ATTR onDropDetected() {
  unsigned long now = millis();
  if (now - lastDropTime > 80) { // Debounce optik 80ms
    dropCount++;
    lastDropTime = now;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(IR_SENSOR_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  attachInterrupt(digitalPinToInterrupt(IR_SENSOR_PIN), onDropDetected, FALLING);

  // Inisialisasi Strain Gauge (HX711)
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(420.5); // Nilai kalibrasi load cell
  scale.tare();

  dht.begin();

  // Koneksi WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Menghubungkan WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected!");

  // Inisialisasi Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  unsigned long currentMillis = millis();

  // Kirim data setiap 3 detik ke path "/infus"
  if (currentMillis - lastPublishTime >= 3000) {
    lastPublishTime = currentMillis;

    // Hitung TPM (Tetesan Per Menit)
    float tpm = (dropCount * 60000.0) / 3000.0;
    dropCount = 0;

    // Baca sensor berat & lingkungan
    if (scale.is_ready()) {
      currentWeight = scale.get_units(5);
      if (currentWeight < 0) currentWeight = 0;
    }
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    if (!isnan(h)) currentHum = h;
    if (!isnan(t)) currentTemp = t;

    // Deteksi Stagnasi (Occlusion) jika > 45 detik tanpa tetesan
    bool isStagnant = (millis() - lastDropTime > 45000);
    String statusStr = isStagnant ? "Stagnant" : "Normal";

    // Siapkan Payload JSON untuk dikirim ke Firebase RTDB "/infus"
    FirebaseJson json;
    json.set("tpm", (int)round(tpm));
    json.set("berat", currentWeight);
    json.set("volume", (int)round(currentWeight * 0.98));
    json.set("suhu", currentTemp);
    json.set("kelembaban", currentHum);
    json.set("tekanan", 1013.2);
    json.set("status", statusStr);
    json.set("esp_status", "Online");
    json.set("rssi", WiFi.RSSI());
    json.set("battery", 98);
    json.set("last_updated", (int)(millis() / 1000));

    // Kirim langsung ke Firebase Realtime Database
    if (Firebase.RTDB.setJSON(&fbdo, "/infus", &json)) {
      Serial.println("Data telemetri berhasil terkirim ke /infus");
    } else {
      Serial.println(fbdo.errorReason());
    }
  }
}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all mb-8">
      {/* Accordion header matching the reference screenshot */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <span className="font-serif font-bold text-lg">Å</span>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-base font-sans tracking-tight">
              Clinical Engineering Blueprint &amp; IoT Firmware Logic
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Sensor ingestion architecture, optical trigger pipelines, and bedside alert state protocol
            </p>
          </div>
        </div>

        <button 
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
        >
          <span>{isExpanded ? 'Collapse Blueprint' : 'Expand Blueprint'}</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </div>

      {/* Expanded Blueprint Details */}
      {isExpanded && (
        <div className="border-t border-slate-200 p-5 bg-[#fafbfc]">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveTab('firmware')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'firmware'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>ESP32 Arduino Firmware</span>
            </button>

            <button
              onClick={() => setActiveTab('schema')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'schema'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>JSON Schema &amp; Live Test Dispatcher</span>
            </button>

            <button
              onClick={() => setActiveTab('pinout')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'pinout'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Hardware Wiring &amp; Pinout</span>
            </button>

            <button
              onClick={() => setActiveTab('protocol')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'protocol'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Clinical Safety &amp; Alert Protocol</span>
            </button>
          </div>

          {/* TAB 1: FIRMWARE */}
          {activeTab === 'firmware' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-600">
                  Sketch C++ siap flash menggunakan Arduino IDE / PlatformIO
                </span>
                <button
                  onClick={() => copyCode(esp32ArduinoSketch)}
                  className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin' : 'Salin Kode C++'}</span>
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#0f172a] shadow-inner">
                <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto max-h-96 leading-relaxed">
                  {esp32ArduinoSketch}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: SCHEMA & TEST DISPATCHER */}
          {activeTab === 'schema' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-mono font-bold uppercase text-slate-700 mb-2">
                  Payload Aktif di Path &quot;/infus&quot; Saat Ini
                </h4>
                <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300 max-h-72 overflow-y-auto">
                  <pre>{JSON.stringify(currentTelemetry, null, 2)}</pre>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-mono font-bold uppercase text-slate-700">
                    Kirim Simulasi Custom ke Path &quot;/infus&quot;
                  </h4>
                  {pushStatus && (
                    <span className="text-[11px] font-mono text-blue-600 font-semibold">
                      {pushStatus}
                    </span>
                  )}
                </div>
                <textarea
                  value={testPayloadJson}
                  onChange={(e) => setTestPayloadJson(e.target.value)}
                  className="w-full h-44 p-3 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  spellCheck={false}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Format: JSON key bahasa Indonesia atau Inggris
                  </span>
                  <button
                    onClick={handlePushTest}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch Payload</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HARDWARE PINOUT */}
          {activeTab === 'pinout' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                    <th className="py-2.5 px-3">Komponen / Sensor</th>
                    <th className="py-2.5 px-3">Pin ESP32</th>
                    <th className="py-2.5 px-3">Tipe Sinyal</th>
                    <th className="py-2.5 px-3">Fungsi Medis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">Sensor Optik IR (LM393)</td>
                    <td className="py-2.5 px-3 font-semibold text-blue-600">GPIO 4</td>
                    <td className="py-2.5 px-3">Digital Interrupt (FALLING)</td>
                    <td className="py-2.5 px-3">Menghitung tetesan cairan per menit (TPM) pada drip bulb</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">Load Cell + HX711 (DT)</td>
                    <td className="py-2.5 px-3 font-semibold text-blue-600">GPIO 16</td>
                    <td className="py-2.5 px-3">Serial Data (24-bit ADC)</td>
                    <td className="py-2.5 px-3">Mengukur berat sisa kantong infus secara presisi (0.1g)</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">Load Cell + HX711 (SCK)</td>
                    <td className="py-2.5 px-3 font-semibold text-blue-600">GPIO 17</td>
                    <td className="py-2.5 px-3">Clock Pulse</td>
                    <td className="py-2.5 px-3">Sinkronisasi pembacaan strain gauge</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">DHT22 / BME280</td>
                    <td className="py-2.5 px-3 font-semibold text-blue-600">GPIO 18</td>
                    <td className="py-2.5 px-3">Single-wire 1-Wire / I2C</td>
                    <td className="py-2.5 px-3">Monitoring suhu &amp; kelembaban steril ruangan ICU</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">Piezo Buzzer Alarm</td>
                    <td className="py-2.5 px-3 font-semibold text-blue-600">GPIO 19</td>
                    <td className="py-2.5 px-3">Digital Out / PWM</td>
                    <td className="py-2.5 px-3">Bunyi peringatan lokal jika tetesan macet &gt; 45 detik</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: CLINICAL PROTOCOL */}
          {activeTab === 'protocol' && (
            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="font-bold text-rose-800 block text-sm font-sans mb-1">
                  1. Critical Occlusion &amp; Stagnation Protocol
                </span>
                <p>
                  Jika sensor optik tidak merekam tetesan selama lebih dari <strong>45 detik berturut-turut</strong> pada jalur aktif, sistem beralih ke state <span className="font-mono font-bold text-rose-700">CRITICAL ALERT</span>. Alarm audio IEC 60601-1-8 aktif dan banner merah dikirim ke central station perawat.
                </p>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="font-bold text-amber-900 block text-sm font-sans mb-1">
                  2. Low VTBI Remaining Protocol
                </span>
                <p>
                  Ketika berat kantong cairan tersisa mencapai <strong>&lt; 50 gram (&asymp; 50 mL)</strong>, sistem mengeluarkan pra-peringatan kepada perawat untuk mempersiapkan kantong infus pengganti sebelum jalur kering.
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="font-bold text-emerald-900 block text-sm font-sans mb-1">
                  3. Rate Deviation Filter
                </span>
                <p>
                  Toleransi deviasi tetesan adalah <strong>&plusmn; 2 TPM</strong> dari resep dokter (Target: 20 TPM). Algoritma menghitung rata-rata bergerak (moving average) 15 menit untuk membedakan gerakan pasien dari oklusi sebenarnya.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
