import React, { useState, useEffect } from 'react';
import { AlertCircle, VolumeX, BellOff, ShieldAlert } from 'lucide-react';
import { audioAlert } from '../services/audioAlert';

interface AlertBannerProps {
  bedId?: string;
  sensorId?: string;
  stagnantSeconds?: number;
  onSilence?: () => void;
  onAcknowledge?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  bedId = 'Bed 04A',
  sensorId = 'ESP32-INF-09',
  stagnantSeconds = 48,
  onSilence,
  onAcknowledge
}) => {
  const [mutedSecondsRemaining, setMutedSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = audioAlert.getMuteRemainingSeconds();
      setMutedSecondsRemaining(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSilence = () => {
    audioAlert.silence();
    if (onSilence) onSilence();
  };

  const handleAcknowledge = () => {
    audioAlert.acknowledgeAndMute(5);
    setMutedSecondsRemaining(300);
    if (onAcknowledge) onAcknowledge();
  };

  const formatCountdown = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="my-4 bg-[#fde8e8] border border-rose-300 rounded-2xl p-4 lg:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all animate-fadeIn">
      {/* Left icon & text */}
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-[#c51c1c] text-white flex items-center justify-center shrink-0 shadow-sm">
          <ShieldAlert className="w-7 h-7 text-white" />
        </div>

        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base lg:text-lg font-bold text-[#7f1d1d] font-sans tracking-tight">
              CRITICAL ALERT: Drop Rate Stagnation Detected
            </h2>
            <span className="bg-[#b91c1c] text-white text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              ACTION REQUIRED
            </span>
          </div>

          <p className="text-xs lg:text-sm text-[#991b1b] mt-1 leading-relaxed max-w-3xl">
            Optical sensor on <strong className="underline decoration-rose-400">{bedId}</strong> (Sensor ID: <span className="font-mono">{sensorId}</span>) recorded <strong className="text-black font-semibold">0 droplets for &gt; {stagnantSeconds} seconds</strong>. Infusion line occlusion or empty chamber suspected. Inspect IV clamp, cannula patency, and drip bulb immediately.
          </p>
        </div>
      </div>

      {/* Right action buttons */}
      <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
        <button
          onClick={handleSilence}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          <VolumeX className="w-4 h-4 text-slate-600" />
          <span>Silence Audio</span>
        </button>

        <button
          onClick={handleAcknowledge}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#b91c1c] hover:bg-[#991b1b] active:scale-[0.98] text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <BellOff className="w-4 h-4 text-white" />
          <span>
            {mutedSecondsRemaining > 0 
              ? `Muted (${formatCountdown(mutedSecondsRemaining)})` 
              : 'Acknowledge & Mute (5m)'}
          </span>
        </button>
      </div>
    </div>
  );
};
