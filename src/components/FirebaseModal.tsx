import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Check, 
  AlertCircle, 
  Copy, 
  RefreshCw, 
  Send, 
  ExternalLink,
  ClipboardPaste,
  ShieldCheck
} from 'lucide-react';
import { FirebaseRtdbConfig, ConnectionState } from '../types/infusion';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FirebaseRtdbConfig;
  onSaveConfig: (cfg: FirebaseRtdbConfig) => void;
  connectionState: ConnectionState;
  connectionError: string | null;
  onPushTestData: () => Promise<{ success: boolean; message?: string }>;
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  connectionState,
  connectionError,
  onPushTestData
}) => {
  const [formData, setFormData] = useState<FirebaseRtdbConfig>(config);
  const [pasteSnippet, setPasteSnippet] = useState('');
  const [showQuickPaste, setShowQuickPaste] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [isPushing, setIsPushing] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof FirebaseRtdbConfig, val: string) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const parseSnippet = () => {
    try {
      const text = pasteSnippet;
      const getVal = (regex: RegExp) => {
        const match = text.match(regex);
        return match ? match[1].trim() : '';
      };

      const extracted: Partial<FirebaseRtdbConfig> = {};
      const dbUrlMatch = getVal(/databaseURL\s*:\s*["'`]([^"'`]+)["'`]/i);
      const apiKeyMatch = getVal(/apiKey\s*:\s*["'`]([^"'`]+)["'`]/i);
      const authDomainMatch = getVal(/authDomain\s*:\s*["'`]([^"'`]+)["'`]/i);
      const projectIdMatch = getVal(/projectId\s*:\s*["'`]([^"'`]+)["'`]/i);
      const storageBucketMatch = getVal(/storageBucket\s*:\s*["'`]([^"'`]+)["'`]/i);
      const senderIdMatch = getVal(/messagingSenderId\s*:\s*["'`]([^"'`]+)["'`]/i);
      const appIdMatch = getVal(/appId\s*:\s*["'`]([^"'`]+)["'`]/i);

      if (dbUrlMatch) extracted.databaseURL = dbUrlMatch;
      if (apiKeyMatch) extracted.apiKey = apiKeyMatch;
      if (authDomainMatch) extracted.authDomain = authDomainMatch;
      if (projectIdMatch) extracted.projectId = projectIdMatch;
      if (storageBucketMatch) extracted.storageBucket = storageBucketMatch;
      if (senderIdMatch) extracted.messagingSenderId = senderIdMatch;
      if (appIdMatch) extracted.appId = appIdMatch;

      setFormData((prev) => ({
        ...prev,
        ...extracted,
        path: prev.path || '/infus'
      }));
      setShowQuickPaste(false);
      setPasteSnippet('');
    } catch {
      alert('Gagal mengekstrak konfigurasi Firebase. Pastikan format teks benar.');
    }
  };

  const handleSave = () => {
    onSaveConfig(formData);
  };

  const handleSendTest = async () => {
    setIsPushing(true);
    setPushResult(null);
    const res = await onPushTestData();
    setIsPushing(false);
    setPushResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#f8fafc] border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base font-sans">
                Konfigurasi Firebase Realtime Database
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                SDK v10 Modular listener pada path: <span className="text-emerald-700 font-bold">{formData.path || '/infus'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
          {/* Connection status banner */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            connectionState === 'connected'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : connectionState === 'connecting'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : connectionState === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                connectionState === 'connected'
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]'
                  : connectionState === 'connecting'
                  ? 'bg-amber-500 animate-ping'
                  : connectionState === 'error'
                  ? 'bg-rose-500'
                  : 'bg-slate-400'
              }`} />
              <span className="font-bold font-mono">
                Status:{' '}
                {connectionState === 'connected'
                  ? 'TERHUBUNG (Mendengarkan realtime /infus)'
                  : connectionState === 'connecting'
                  ? 'Menghubungkan...'
                  : connectionState === 'error'
                  ? `Error: ${connectionError}`
                  : 'Belum Terhubung'}
              </span>
            </div>

            {connectionState === 'connected' && (
              <span className="text-[11px] font-mono text-emerald-700 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded">
                Live onValue() Active
              </span>
            )}
          </div>

          {/* Quick paste toggle button */}
          <div className="flex justify-between items-center">
            <span className="text-slate-500">
              Masukkan kredensial project Firebase Anda di bawah ini:
            </span>
            <button
              type="button"
              onClick={() => setShowQuickPaste(!showQuickPaste)}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>{showQuickPaste ? 'Tutup Quick Paste' : 'Tempel Snippet Firebase'}</span>
            </button>
          </div>

          {showQuickPaste && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
              <span className="text-[11px] font-mono text-blue-800 block">
                Salin seluruh block <code>const firebaseConfig = &#123; ... &#125;;</code> dari Firebase Console:
              </span>
              <textarea
                value={pasteSnippet}
                onChange={(e) => setPasteSnippet(e.target.value)}
                placeholder="const firebaseConfig = { apiKey: '...', databaseURL: '...', ... };"
                rows={3}
                className="w-full p-2 bg-white border border-blue-200 rounded-lg font-mono text-xs text-slate-800"
              />
              <button
                type="button"
                onClick={parseSnippet}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Ekstrak Kredensial Otomatis
              </button>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Database URL (Critical) */}
            <div className="md:col-span-2">
              <label className="block text-[11px] uppercase font-mono font-bold text-slate-700 mb-1">
                Database URL <span className="text-rose-500">* (Wajib untuk Realtime Database)</span>
              </label>
              <input
                type="text"
                value={formData.databaseURL}
                onChange={(e) => handleInputChange('databaseURL', e.target.value)}
                placeholder="https://YOUR-PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                Contoh: https://med-monitor-99-default-rtdb.firebaseio.com
              </span>
            </div>

            {/* Path */}
            <div>
              <label className="block text-[11px] uppercase font-mono font-bold text-slate-700 mb-1">
                Database Path <span className="text-emerald-600 font-semibold">(Default: /infus)</span>
              </label>
              <input
                type="text"
                value={formData.path}
                onChange={(e) => handleInputChange('path', e.target.value)}
                placeholder="/infus"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="block text-[11px] uppercase font-mono font-bold text-slate-700 mb-1">
                API Key
              </label>
              <input
                type="text"
                value={formData.apiKey}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                placeholder="AIzaSyA..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            {/* Project ID */}
            <div>
              <label className="block text-[11px] uppercase font-mono font-bold text-slate-700 mb-1">
                Project ID
              </label>
              <input
                type="text"
                value={formData.projectId}
                onChange={(e) => handleInputChange('projectId', e.target.value)}
                placeholder="med-monitor-station"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            {/* Auth Domain */}
            <div>
              <label className="block text-[11px] uppercase font-mono font-bold text-slate-700 mb-1">
                Auth Domain (Opsional)
              </label>
              <input
                type="text"
                value={formData.authDomain}
                onChange={(e) => handleInputChange('authDomain', e.target.value)}
                placeholder="your-project.firebaseapp.com"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            {/* Storage Bucket */}
            <div>
              <label className="block text-[11px] uppercase font-mono font-bold text-slate-700 mb-1">
                Storage Bucket (Opsional)
              </label>
              <input
                type="text"
                value={formData.storageBucket}
                onChange={(e) => handleInputChange('storageBucket', e.target.value)}
                placeholder="your-project.appspot.com"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            {/* App ID */}
            <div>
              <label className="block text-[11px] uppercase font-mono font-bold text-slate-700 mb-1">
                App ID (Opsional)
              </label>
              <input
                type="text"
                value={formData.appId}
                onChange={(e) => handleInputChange('appId', e.target.value)}
                placeholder="1:123456789:web:abcdef"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Test Write to Firebase */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-800 block text-xs">
                  Uji Tulis Data ke Realtime Database
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Menulis payload contoh langsung ke {formData.path || '/infus'} untuk menguji koneksi.
                </span>
              </div>

              <button
                type="button"
                onClick={handleSendTest}
                disabled={isPushing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-blue-600" />
                <span>{isPushing ? 'Mengirim...' : 'Kirim Test Data ke /infus'}</span>
              </button>
            </div>

            {pushResult && (
              <div className={`mt-2 p-2 rounded text-xs font-mono ${
                pushResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
              }`}>
                {pushResult.success
                  ? '✓ Berhasil mengirim sampel ke Firebase RTDB! Data akan langsung termutakhirkan.'
                  : `✕ ${pushResult.message}`}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-[#f8fafc] border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Simpan &amp; Hubungkan Firebase</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
