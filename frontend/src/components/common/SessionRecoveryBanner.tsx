import React, { useState } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { RefreshCw, Upload } from 'lucide-react';
import * as api from '../../services/api';

interface SessionRecoveryBannerProps {
  error: string | null;
  onClearError?: () => void;
}

export const SessionRecoveryBanner: React.FC<SessionRecoveryBannerProps> = ({
  error,
  onClearError,
}) => {
  const { setActiveStep, setDataset, setSelectedControl, setSelectedTreatment } = useAnalysis();
  const [isReloading, setIsReloading] = useState<boolean>(false);

  if (!error) return null;

  const isSessionError =
    error.toLowerCase().includes('not found') ||
    error.toLowerCase().includes('upload or reload') ||
    error.toLowerCase().includes('expired');

  if (!isSessionError) return null;

  const handleReloadDemo = async () => {
    setIsReloading(true);
    try {
      const resp = await api.loadDemoDataset();
      setDataset(resp);
      if (resp.conditions && resp.conditions.length >= 2) {
        setSelectedControl(resp.conditions[0]);
        setSelectedTreatment(resp.conditions[1]);
      }
      if (onClearError) onClearError();
    } catch {
      setActiveStep('upload');
    } finally {
      setIsReloading(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isReloading ? 'animate-spin' : ''}`} />
          Dataset Session Unavailable
        </h4>
        <p className="text-xs text-slate-300 opacity-90">
          The server session for this dataset is missing or expired. You can reload the dataset in 1 click or re-upload your files:
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
        <button
          onClick={handleReloadDemo}
          disabled={isReloading}
          className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <RefreshCw className={`w-3 h-3 ${isReloading ? 'animate-spin' : ''}`} />
          <span>{isReloading ? 'Reloading...' : 'Reload Demo Dataset'}</span>
        </button>
        <button
          onClick={() => setActiveStep('upload')}
          className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Upload className="w-3 h-3 text-cyan-400" />
          <span>Go to Upload (Step 01)</span>
        </button>
      </div>
    </div>
  );
};
