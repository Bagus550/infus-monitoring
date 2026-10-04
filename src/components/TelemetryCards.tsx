import React from 'react';
import { 
  AlertCircle, 
  Hourglass, 
  Thermometer, 
  Droplet,
  Radio
} from 'lucide-react';
import { InfusionTelemetry } from '../types/infusion';

interface TelemetryCardsProps {
  telemetry: InfusionTelemetry;
  isAlertState: boolean;
}

export const TelemetryCards: React.FC<TelemetryCardsProps> = ({
  telemetry,
  isAlertState
}) => {
  // Calculations
  const tpm = telemetry.tpm;
  const berat = telemetry.berat;
  const suhu = telemetry.suhu;
  const kelembaban = telemetry.kelembaban;

  // Flow rate: 1 drop = 1/20 mL -> mL/h = tpm * 3
  const flowRate = (tpm * 3).toFixed(1);
  const flowRateNum = tpm * 3;
  const targetTpm = telemetry.targetTpm ?? 20;
  const rawCompliance = targetTpm > 0 ? Math.round((tpm / targetTpm) * 100) : 0;

  // Drop Interval in seconds: (60 seconds / tpm)
  const dropIntervalSec = tpm > 0 ? (60 / tpm).toFixed(1) : '0.0';
  
  // VTBI percentage calculation & initial / delivered weights
  const initialWeight = telemetry.tareInitial ?? 512.0;
  const deliveredWeight = Math.max(0, Number((initialWeight - berat).toFixed(1)));
  const vtbiPercent = Math.max(0, Math.min(100, Math.round((berat / initialWeight) * 100)));
  const volumeMl = telemetry.volume ?? Math.max(0, Math.round(berat * 0.98));

  // Dynamic ETA Calculation (Hours & Minutes remaining)
  let etaText = '';
  let etaColorClass = 'text-slate-800';

  if (tpm === 0 || flowRateNum === 0) {
    etaText = 'Stopped (Flow Stagnant)';
    etaColorClass = 'text-[#b91c1c] font-bold';
  } else {
    const remainingHours = volumeMl / flowRateNum;
    const hours = Math.floor(remainingHours);
    const mins = Math.round((remainingHours - hours) * 60);
    
    // Label status dependent on flow compliance
    const statusNote = rawCompliance >= 90 && rawCompliance <= 110 
      ? 'Nominal' 
      : rawCompliance < 90 
        ? 'Low Rate' 
        : 'High Rate';
        
    etaText = `${hours}h ${mins}m (${statusNote})`;
    etaColorClass = isAlertState ? 'text-[#b91c1c]' : 'text-slate-800';
  }

  // Climate status badges
  const getTempBadge = (temp: number) => {
    if (temp < 18.0) return { label: 'COLD (<18°C)', class: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (temp > 24.0) return { label: 'WARM (>24°C)', class: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'NORMAL (20-22°C)', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const getHumBadge = (hum: number) => {
    if (hum < 40.0) return { label: 'DRY (<40%)', class: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (hum > 60.0) return { label: 'HUMID (>60%)', class: 'bg-blue-50 text-blue-700 border-blue-200' };
    return { label: 'OPTIMAL (40-60%)', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const tempStatus = getTempBadge(suhu);
  const humStatus = getHumBadge(kelembaban);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
      {/* ---------------- CARD 1: DROP RATE (TPM) ---------------- */}
      <div className={`bg-white rounded-2xl border p-5 shadow-xs transition-all relative flex flex-col justify-between ${
        isAlertState || tpm === 0 
          ? 'border-rose-200 ring-2 ring-rose-400/20' 
          : 'border-slate-200'
      }`}>
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="block text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">
                OPTICAL SENSOR TELEMETRY
              </span>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-1.5 font-sans">
                Drop Rate (TPM)
                <Radio className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              </h3>
            </div>

            {/* Dynamic Status Badge */}
            {isAlertState || tpm === 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-[#fde8e8] text-[#c51c1c] border border-rose-300">
                <AlertCircle className="w-3 h-3 text-[#c51c1c]" />
                {telemetry.status && telemetry.status.toLowerCase() !== 'normal' 
                  ? telemetry.status.toUpperCase() 
                  : 'STAGNANT FLOW'}
              </span>
            ) : tpm < targetTpm - 5 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                SLOW FLOW ({tpm} TPM)
              </span>
            ) : tpm > targetTpm + 5 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                HIGH FLOW ({tpm} TPM)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                NORMAL FLOW
              </span>
            )}
          </div>

          {/* Large Readout + Visual Drip Chamber */}
          <div className="flex items-center justify-between mt-3 mb-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-extrabold font-mono tracking-tight tabular-nums ${
                  tpm === 0 ? 'text-[#b91c1c]' : 'text-slate-900'
                }`}>
                  {tpm}
                </span>
                <span className="text-xs font-mono font-bold uppercase text-slate-400">
                  TPM
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 -mt-1 block">
                drops/min
              </span>
            </div>

            {/* Visual Drip Chamber Graphic */}
            <div className="relative w-16 h-20 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-between p-1.5 shadow-2xs overflow-hidden">
              {/* Top spike & cannula */}
              <div className="w-1.5 h-2 bg-slate-300 rounded-xs" />
              
              {/* Dropper tip */}
              <div className="w-3 h-1.5 bg-slate-400 rounded-xs" />

              {/* Droplet area */}
              <div className="relative w-full h-8 flex items-center justify-center">
                {tpm > 0 ? (
                  <Droplet className="w-4 h-4 text-blue-500 fill-blue-400 animate-drip drop-shadow-xs" />
                ) : (
                  <Droplet className="w-3.5 h-3.5 text-rose-400/60" />
                )}
              </div>

              {/* Bottom fluid level */}
              <div className="w-full h-4 bg-blue-100 border-t border-blue-200 rounded-b-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/20" />
              </div>

              {/* Stagnant overlay if 0 TPM */}
              {(isAlertState || tpm === 0) && (
                <div className="absolute bottom-1 inset-x-1 bg-[#c51c1c] text-white text-[9px] font-mono font-bold text-center py-0.5 rounded shadow-xs uppercase tracking-tighter">
                  STAGNANT
                </div>
              )}
            </div>
          </div>

          {/* Sub Metrics */}
          <div className="space-y-1.5 text-xs font-mono pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Calculated Flow Rate</span>
              <span className="font-bold text-slate-800">{flowRate} mL/h</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Prescription Compliance</span>
              <span className={`font-bold ${
                tpm === 0 
                  ? 'text-[#b91c1c]' 
                  : rawCompliance >= 90 && rawCompliance <= 110 
                    ? 'text-emerald-700' 
                    : 'text-amber-600'
              }`}>
                {tpm === 0 
                  ? `0% (No Flow)` 
                  : `${rawCompliance}% (Target: ${targetTpm} ± 2)`}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Drop Interval Rhythm</span>
              <span className={`font-bold ${tpm === 0 ? 'text-[#b91c1c]' : 'text-emerald-700'}`}>
                {tpm === 0 ? 'Flatline Detected' : `Regular (${dropIntervalSec}s / drop)`}
              </span>
            </div>
          </div>
        </div>

        {/* Sparkline Visual (Flatline or wave) */}
        <div className="mt-3 pt-2">
          <div className="h-8 w-full">
            <svg className="w-full h-full" viewBox="0 0 240 32" preserveAspectRatio="none">
              {tpm === 0 ? (
                // Flatline graph matching state
                <>
                  <path
                    d="M 0 10 L 40 10 L 60 14 L 80 18 L 100 24 L 140 24 L 235 24"
                    fill="none"
                    stroke="#b91c1c"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="235" cy="24" r="3.5" fill="#b91c1c" />
                </>
              ) : (
                // Normal rhythmic wave
                <>
                  <path
                    d="M 0 16 Q 15 6, 30 16 T 60 16 T 90 16 T 120 16 T 150 16 T 180 16 T 210 16 L 235 16"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="235" cy="16" r="3.5" fill="#10b981" />
                </>
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* ---------------- CARD 2: FLUID WEIGHT & VOLUME ---------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="block text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">
                PRECISION STRAIN GAUGE
              </span>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-1.5 font-sans">
                Fluid Weight &amp; Volume
                <Hourglass className="w-3.5 h-3.5 text-blue-500" />
              </h3>
            </div>

            {/* Dynamic VTBI Pill */}
            <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border ${
              vtbiPercent <= 10
                ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                : vtbiPercent <= 25
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              {vtbiPercent <= 10 
                ? `CRITICAL (${vtbiPercent}%)` 
                : vtbiPercent <= 25 
                  ? `LOW VTBI (${vtbiPercent}%)` 
                  : `${vtbiPercent}% VTBI`}
            </span>
          </div>

          <span className="block text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400 mt-2">
            WEIGHT REMAINING
          </span>

          {/* Large Readout + Visual IV Bag */}
          <div className="flex items-center justify-between mt-1 mb-4">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-extrabold font-mono tracking-tight text-slate-900 tabular-nums">
                  {berat.toFixed(1)}
                </span>
                <span className="text-sm font-mono font-bold text-slate-500">
                  g
                </span>
              </div>
              <span className="text-xs font-mono text-slate-500 mt-0.5 block">
                &asymp; {volumeMl} mL of 500 mL IV Bag
              </span>
            </div>

            {/* Precision IV Bag Graphic */}
            <div className="relative w-14 h-24 bg-slate-50 border-2 border-slate-300 rounded-xl flex flex-col items-center justify-between p-1 shadow-2xs overflow-hidden">
              {/* Eyelet top hanger */}
              <div className="w-3 h-1.5 border border-slate-400 rounded-full bg-white mb-0.5" />

              {/* Graduation markings */}
              <div className="absolute right-1 top-4 flex flex-col items-end text-[7px] font-mono text-slate-400 space-y-1.5 select-none pointer-events-none z-10">
                <span>- 500</span>
                <span>- 250</span>
                <span>- 100</span>
              </div>

              {/* Blue fluid fill dynamic level */}
              <div 
                className={`w-full rounded-b-lg transition-all duration-700 relative overflow-hidden ${
                  vtbiPercent <= 15 ? 'bg-gradient-to-t from-rose-600 to-rose-400' : 'bg-gradient-to-t from-blue-600 to-blue-400'
                }`}
                style={{ height: `${Math.max(12, Math.min(85, vtbiPercent))}%` }}
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-white/40" />
                <span className="absolute bottom-1 left-1 text-[8px] font-mono font-bold text-white/90">
                  {volumeMl}
                </span>
              </div>

              {/* Bottom IV port */}
              <div className="w-2 h-1.5 bg-slate-400 rounded-xs mt-0.5" />
            </div>
          </div>
        </div>

        {/* Bottom Details */}
        <div className="pt-2 border-t border-slate-100 text-xs font-mono">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-500 flex items-center gap-1">
              <Hourglass className="w-3 h-3 text-emerald-600" />
              Est. Completion
            </span>
            <span className={`font-bold ${etaColorClass}`}>
              {etaText}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-500 text-[11px]">
            <span>Tare Initial: {initialWeight.toFixed(1)}g</span>
            <span>Delivered: {deliveredWeight.toFixed(1)}g</span>
          </div>
        </div>
      </div>

      {/* ---------------- CARD 3: ROOM CLIMATE ---------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="block text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">
                ICU AMBIENT POD
              </span>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-1.5 font-sans">
                Room Climate
                <Thermometer className="w-3.5 h-3.5 text-blue-500" />
              </h3>
            </div>
          </div>

          {/* Temperature Section */}
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-500">Temperature</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${tempStatus.class}`}>
                {tempStatus.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 tabular-nums">
                {suhu.toFixed(1)}
              </span>
              <span className="text-sm font-mono text-slate-500 font-bold">&deg;C</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Ideal ICU: 20.0-22.0&deg;C
            </span>
          </div>

          {/* Relative Humidity Section */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-500">Relative Humidity</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${humStatus.class}`}>
                {humStatus.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 tabular-nums">
                {kelembaban.toFixed(1)}
              </span>
              <span className="text-sm font-mono text-slate-500 font-bold">% RH</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Target sterile: 40-60%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};



