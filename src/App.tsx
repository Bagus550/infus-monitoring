/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SubHeader } from './components/SubHeader';
import { AlertBanner } from './components/AlertBanner';
import { TelemetryCards } from './components/TelemetryCards';
import { EngineeringBlueprint } from './components/EngineeringBlueprint';
import { Footer } from './components/Footer';
import { FirebaseModal } from './components/FirebaseModal';
import { firebaseRtdb } from './services/firebaseRealtime';
import { audioAlert } from './services/audioAlert';
import { InfusionTelemetry, ConnectionState, FirebaseRtdbConfig } from './types/infusion';

export default function App() {
  // Baseline initial state
  const [telemetry, setTelemetry] = useState<InfusionTelemetry>({
    tpm: 0,
    berat: 184.2,
    volume: 180,
    suhu: 21.4,
    kelembaban: 48.2,
    tekanan: 1013.2,
    status: 'Stagnant',
    esp_status: 'Connected',
    latency: 14,
    rssi: -64,
    qos: 99.8,
    firmware: 'FW v2.4.1',
    uptime: '18h 42m',
    battery: 98,
    tareInitial: 512.0,
    delivered: 327.8,
    targetTpm: 20
  });

  const [simulatorMode, setSimulatorMode] = useState<'alert' | 'normal'>('alert');
  const [firebaseModalOpen, setFirebaseModalOpen] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('unconfigured');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseRtdbConfig>(() => firebaseRtdb.getSavedConfig());

  // Connection subscription
  useEffect(() => {
    const unsubConn = firebaseRtdb.subscribeConnectionState((state, err) => {
      setConnectionState(state);
      setConnectionError(err);
    });

    const unsubData = firebaseRtdb.subscribeData((incoming) => {
      setTelemetry((prev) => {
        const nextTpm = incoming.tpm !== undefined ? incoming.tpm : prev.tpm;
        const nextStatus = incoming.status || (nextTpm === 0 ? 'Stagnant' : 'Normal');

        // Automatically align simulator mode with incoming data
        if (nextTpm === 0 || nextStatus.toLowerCase().includes('stagnant') || nextStatus.toLowerCase().includes('occlusion')) {
          setSimulatorMode('alert');
        } else {
          setSimulatorMode('normal');
        }

        return {
          ...prev,
          ...incoming,
          tpm: nextTpm,
          status: nextStatus,
          latency: incoming.latency ?? prev.latency,
        };
      });
    });

    // Auto-connect if URL was saved in localStorage previously
    const saved = firebaseRtdb.getSavedConfig();
    if (saved.databaseURL && saved.databaseURL.trim().length > 0) {
      firebaseRtdb.connect(saved);
    }

    return () => {
      unsubConn();
      unsubData();
    };
  }, []);

  // Alarm loop trigger
  useEffect(() => {
    const isAlert = simulatorMode === 'alert' || telemetry.tpm === 0 || telemetry.status?.toLowerCase().includes('stagnant');
    if (isAlert) {
      audioAlert.startAlarmLoop();
    } else {
      audioAlert.stopAlarmLoop();
    }
  }, [simulatorMode, telemetry.tpm, telemetry.status]);

  // Handle simulator mode toggles from the top toolbar
  const handleSimulatorModeChange = (mode: 'alert' | 'normal') => {
    setSimulatorMode(mode);
    if (mode === 'alert') {
      setTelemetry((prev) => ({
        ...prev,
        tpm: 0,
        status: 'Stagnant',
        delivered: 327.8,
        berat: 184.2,
        volume: 180,
      }));
      audioAlert.unmute();
      audioAlert.startAlarmLoop();
    } else {
      setTelemetry((prev) => ({
        ...prev,
        tpm: 20,
        status: 'Normal',
        delivered: 330.5,
        berat: 181.5,
        volume: 178,
      }));
      audioAlert.stopAlarmLoop();
    }
  };

  const handleSaveFirebaseConfig = (cfg: FirebaseRtdbConfig) => {
    setFirebaseConfig(cfg);
    firebaseRtdb.saveConfig(cfg);
    firebaseRtdb.connect(cfg);
  };

  const handlePushTestFromBlueprint = useCallback(async (payload: Partial<InfusionTelemetry>): Promise<boolean> => {
    // If Firebase RTDB is configured, push there
    if (connectionState === 'connected') {
      const res = await firebaseRtdb.sendTestPayload(payload);
      return res.success;
    }
    // Otherwise update locally in memory
    setTelemetry((prev) => ({ ...prev, ...payload }));
    return true;
  }, [connectionState]);

  const handlePushTestDataFromModal = useCallback(async () => {
    return firebaseRtdb.sendTestPayload({
      tpm: simulatorMode === 'alert' ? 0 : 20,
      berat: telemetry.berat,
      volume: telemetry.volume,
      suhu: telemetry.suhu,
      kelembaban: telemetry.kelembaban,
      tekanan: telemetry.tekanan,
      status: telemetry.status,
    });
  }, [simulatorMode, telemetry]);

  const isAlertState = simulatorMode === 'alert' || telemetry.tpm === 0;

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#0f172a] flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* 1. Top Clinical Station Header */}
      <Header
        connectionState={connectionState}
        latency={telemetry.latency}
        onOpenFirebaseConfig={() => setFirebaseModalOpen(true)}
        isFirebaseConfigured={!!firebaseConfig.databaseURL}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 lg:px-8 py-2">
        {/* 2. Sub-Header: Title + Stream Channel + State Simulator Controls */}
        <SubHeader
          channelId="#04A-IV-MAIN"
          simulatorMode={simulatorMode}
          onSimulatorModeChange={handleSimulatorModeChange}
        />

        {/* 3. Critical Alert Banner (Shown in Alert state or when TPM is stagnant) */}
        {isAlertState && (
          <AlertBanner
            bedId="Bed 04A"
            sensorId="ESP32-INF-09"
            stagnantSeconds={48}
            onSilence={() => audioAlert.silence()}
            onAcknowledge={() => audioAlert.acknowledgeAndMute(5)}
          />
        )}

        {/* 4. Primary Telemetry Cards */}
        <TelemetryCards
          telemetry={telemetry}
          isAlertState={isAlertState}
        />

        {/* 6. Clinical Engineering Blueprint & IoT Firmware Logic (Expandable) */}
        <EngineeringBlueprint
          currentTelemetry={telemetry}
          onSendCustomPayload={handlePushTestFromBlueprint}
        />
      </main>

      {/* 7. Bottom Status & System Footer */}
      <Footer />

      {/* Firebase Realtime Database Configuration Modal */}
      <FirebaseModal
        isOpen={firebaseModalOpen}
        onClose={() => setFirebaseModalOpen(false)}
        config={firebaseConfig}
        onSaveConfig={handleSaveFirebaseConfig}
        connectionState={connectionState}
        connectionError={connectionError}
        onPushTestData={handlePushTestDataFromModal}
      />
    </div>
  );
}
