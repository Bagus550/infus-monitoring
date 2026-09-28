import React, { useState } from 'react';
import { 
  Activity, 
  Volume2, 
  VolumeX, 
  Database, 
  ChevronDown, 
  PlusSquare, 
  Radio
} from 'lucide-react';
import { ConnectionState } from '../types/infusion';
import { audioAlert } from '../services/audioAlert';

interface HeaderProps {
  location: string;
  onLocationChange: (loc: string) => void;
  connectionState: ConnectionState;
  latency?: number;
  onOpenFirebaseConfig: () => void;
  isFirebaseConfigured: boolean;
}

const LOCATIONS = [
  'ICU Ward 3 - Bed 04A',
  'ICU Ward 3 - Bed 04B',
  'ICU Ward 2 - Bed 12A',
  'Pediatric ICU - Bed 01',
  'Emergency Care - Trauma 1'
];

export const Header: React.FC<HeaderProps> = ({
  location,
  onLocationChange,
  connectionState,
  latency = 14,
  onOpenFirebaseConfig,
  isFirebaseConfigured
}) => {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    audioAlert.enableAudio(next);
    if (!next) {
      audioAlert.silence();
    }
  };

  const getStatusDisplay = () => {
    switch (connectionState) {
      case 'connected':
        return {
          dotColor: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
          textColor: 'text-slate-700',
          label: `ESP32 Gateway: Connected ${latency}ms`
        };
      case 'connecting':
        return {
          dotColor: 'bg-amber-500 animate-ping',
          textColor: 'text-amber-800',
          label: 'ESP32 Gateway: Connecting...'
        };
      case 'error':
        return {
          dotColor: 'bg-rose-500',
          textColor: 'text-rose-700',
          label: 'ESP32 Gateway: Error / Check RTDB'
        };
      case 'unconfigured':
      default:
        return {
          dotColor: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
          textColor: 'text-slate-700',
          label: `ESP32 Gateway: Connected ${latency}ms`
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <header className="bg-white border-b border-slate-200/80 px-4 lg:px-8 py-3 sticky top-0 z-30 shadow-xs">
      <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2563eb] text-white flex items-center justify-center shadow-sm font-bold text-lg">
            <span className="text-white text-xl leading-none">✚</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-sans font-bold text-slate-900 text-lg tracking-tight">Med-Monitor</span>
            <span className="text-[11px] font-mono tracking-wider font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              STATION V3.4
            </span>
          </div>
        </div>

        {/* Assigned location selector */}
        <div className="relative">
          <button
            onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#f8fafc] hover:bg-slate-100 border border-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
            title="Pilih Bed / Lokasi ICU"
          >
            <div className="w-5 h-5 rounded bg-emerald-50 border border-emerald-300 text-emerald-700 flex items-center justify-center font-bold text-xs">
              ✚
            </div>
            <div className="text-left">
              <span className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold leading-tight">
                ASSIGNED LOCATION
              </span>
              <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                {location}
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </span>
            </div>
          </button>

          {locationDropdownOpen && (
            <div className="absolute left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-40">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    onLocationChange(loc);
                    setLocationDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-slate-50 flex items-center justify-between ${
                    location === loc ? 'font-bold text-emerald-700 bg-emerald-50/50' : 'text-slate-700'
                  }`}
                >
                  {loc}
                  {location === loc && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right side controls: Gateway status, Audio Alert Sync, Firebase Settings */}
        <div className="flex items-center gap-3 lg:gap-5 flex-wrap">
          {/* ESP32 Gateway Pill */}
          <div className="flex items-center gap-2 bg-[#f8fafc] border border-slate-200 px-3 py-1.5 rounded-full text-xs font-mono">
            <span className={`w-2.5 h-2.5 rounded-full ${status.dotColor}`} />
            <span className={`text-[12px] font-medium ${status.textColor}`}>
              {status.label}
            </span>
          </div>

          {/* Audio Alert Sync button */}
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer ${
              audioEnabled
                ? 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100 shadow-2xs'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
            title={audioEnabled ? 'Alarm Suara Aktif (Klik untuk mute)' : 'Alarm Suara Dimatikan'}
          >
            {audioEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-rose-600" />
            )}
            <span className="tracking-wide">AUDIO ALERT SYNC</span>
          </button>

          {/* Firebase RTDB settings button */}
          <button
            onClick={onOpenFirebaseConfig}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer ${
              isFirebaseConfigured
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
            }`}
            title="Konfigurasi Firebase Realtime Database (/infus)"
          >
            <Database className="w-4 h-4 text-amber-600" />
            <span className="tracking-wide">
              {isFirebaseConfigured ? 'FIREBASE RTDB: ON' : 'SET FIREBASE'}
            </span>
            <span className={`w-2 h-2 rounded-full ${isFirebaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
