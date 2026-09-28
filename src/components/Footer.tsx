import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200/90 bg-[#edeef0] text-slate-500 py-3.5 px-4 lg:px-8 text-xs font-mono">
      <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span>&copy; 2026 Med-Monitor Acute Care Systems</span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="text-slate-600 font-semibold">
            Station Telemetry ID: ESP-W3-04A-NODE
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            Telemetry Bus Nominal
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="text-slate-600">
            HL7 / FHIR Gateway Active
          </span>
        </div>
      </div>
    </footer>
  );
};
