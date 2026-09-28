import React from 'react';
import { User, Target, Pill, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface PatientStripProps {
  name?: string;
  age?: number;
  gender?: string;
  mrn?: string;
  attendingDoc?: string;
  targetTpm?: number;
  medication?: string;
  isAlert?: boolean;
}

export const PatientStrip: React.FC<PatientStripProps> = ({
  name = 'Eleanor Vance',
  age = 58,
  gender = 'F',
  mrn = '#492-0192',
  attendingDoc = 'Dr. K. Holtz',
  targetTpm = 20,
  medication = 'Normal Saline 0.9% (500 mL Bag)',
  isAlert = true
}) => {
  // 20 TPM with standard 20 drops/mL IV tubing equals (20 / 20) * 60 = 60 mL/h
  const flowRateMlH = (targetTpm * 3).toFixed(1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 lg:px-6 lg:py-4 shadow-xs mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Patient Profile */}
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-teal-700" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base lg:text-lg font-sans">
                {name}
              </span>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {age} yrs · {gender}
              </span>
            </div>

            <div className="text-xs font-mono text-slate-500 mt-0.5">
              MRN: <span className="text-slate-800 font-semibold">{mrn}</span> · Attending:{' '}
              <span className="text-slate-800 font-semibold">{attendingDoc}</span>
            </div>

            {/* Target Prescribed Rate */}
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-600">
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">
                TARGET PRESCRIBED RATE
              </span>
              <span className="font-mono font-bold text-slate-900 ml-1">
                {targetTpm} TPM <span className="text-slate-500 font-normal">(&asymp; {flowRateMlH} mL/h)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Center: Active Prescription */}
        <div className="border-t lg:border-t-0 lg:border-l border-slate-200 pt-3 lg:pt-0 lg:pl-6">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <Pill className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <span className="block text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">
                ACTIVE PRESCRIPTION
              </span>
              <span className="font-bold text-slate-900 text-sm font-sans">
                {medication}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Protocol Status */}
        <div className="border-t lg:border-t-0 lg:border-l border-slate-200 pt-3 lg:pt-0 lg:pl-6 flex items-center justify-between lg:justify-end gap-3">
          <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">
            PROTOCOL STATUS
          </span>

          {isAlert ? (
            <div className="flex items-center gap-2 bg-[#fde8e8] border border-rose-300 text-[#b91c1c] px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wide animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#b91c1c]" />
              <span>CRITICAL CHECK REQUIRED</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>NOMINAL FLOW CONFIRMED</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
