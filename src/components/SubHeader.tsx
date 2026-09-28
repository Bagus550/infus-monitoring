import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SubHeaderProps {
  channelId?: string;
  simulatorMode: 'alert' | 'normal';
  onSimulatorModeChange: (mode: 'alert' | 'normal') => void;
}

export const SubHeader: React.FC<SubHeaderProps> = ({
  channelId = '#04A-IV-MAIN',
  simulatorMode,
  onSimulatorModeChange
}) => {
  return (
    <div className="pt-5 pb-3">
      <h1 className="text-xl lg:text-2xl font-bold font-sans text-emerald-800 tracking-tight mb-2">
        Live Infusion Monitor
      </h1>

      <div className="flex flex-wrap items-center justify-between gap-4 py-1 border-b border-slate-200/80">
        {/* Left: Stream channel badge */}
        <div className="flex items-center gap-2 text-xs font-mono font-medium text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
          <span className="tracking-wider uppercase text-slate-600 font-semibold">
            REAL-TIME BEDSIDE TELEMETRY STREAM
          </span>
          <span className="text-slate-400">Channel ID:</span>
          <span className="text-slate-900 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            {channelId}
          </span>
        </div>

        {/* Right: State Simulator buttons */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium font-sans">State Simulator:</span>
          <div className="inline-flex rounded-lg p-0.5 bg-slate-200/80 border border-slate-300">
            <button
              onClick={() => onSimulatorModeChange('alert')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                simulatorMode === 'alert'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Alert State</span>
            </button>
            <button
              onClick={() => onSimulatorModeChange('normal')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                simulatorMode === 'normal'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Normal Flow</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
