import React, { useState } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Database 
} from 'lucide-react';
import { ConnectionState } from '../types/infusion';
import { audioAlert } from '../services/audioAlert';

interface HeaderProps {
  connectionState?: ConnectionState;
  latency?: number;
  onOpenFirebaseConfig: () => void;
  isFirebaseConfigured: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenFirebaseConfig,
  isFirebaseConfigured
}) => {
  const [audioEnabled, setAudioEnabled] = useState(true);

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    audioAlert.enableAudio(next);
    if (!next) {
      audioAlert.silence();
    }
  };

  return (
    <header className="bg-white border-b border-slate-200/80 px-4 lg:px-8 py-3 sticky top-0 z-30 shadow-xs">
      <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2563eb] text-white flex items-center justify-center shadow-sm font-bold text-lg">
            <span className="text-white text-xl leading-none">✚</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-sans font-bold text-slate-900 text-lg tracking-tight">Med.Intermedia</span>
            <span className="text-[11px] font-mono tracking-wider font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              STATION V3.4
            </span>
          </div>
        </div>

        {/* Right side controls: Audio Alert Sync, Firebase Settings */}
        <div className="flex items-center gap-3 lg:gap-5 flex-wrap">
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

