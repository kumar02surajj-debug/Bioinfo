import React, { useRef, useState } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { StatusBadge } from '../common/StatusBadge';
import { MobileDrawer } from './MobileDrawer';
import {
  Dna,
  RefreshCw,
  RotateCcw,
  BookOpen,
  Layers,
  Save,
  Upload,
  Check,
  AlertCircle,
  Menu,
  HelpCircle,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    isCheckingHealth,
    connectionStatus,
    connectionMessage,
    checkBackendConnection,
    dataset,
    resetSession,
    setActiveStep,
    activeStep,
    exportSessionJSON,
    importSessionJSON,
  } = useAnalysis();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveSession = () => {
    try {
      exportSessionJSON();
      showToast('success', 'Session state exported successfully!');
    } catch (e: any) {
      showToast('error', 'Failed to export session: ' + e.message);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await importSessionJSON(file);
    if (ok) {
      showToast('success', 'Session restored successfully!');
    } else {
      showToast('error', 'Failed to import session JSON.');
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-3 sm:px-6 lg:px-8">
          {/* Left: Mobile Drawer Trigger + Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label="Open Navigation Menu"
              className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand & Logo */}
            <div
              className="flex items-center gap-2.5 cursor-pointer group select-none"
              onClick={() => setActiveStep('dashboard')}
            >
              <div className="flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-600 shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <Dna className="h-5 sm:h-6 w-5 sm:w-6 text-slate-950 font-bold animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-base sm:text-lg font-bold tracking-tight text-white">
                    Transcripto<span className="text-cyan-400">X</span>
                  </span>
                  <span className="rounded-md bg-cyan-950/80 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                    v1.0
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium hidden lg:block">Integrated Transcriptomic Analysis Pipeline</p>
              </div>
            </div>
          </div>

          {/* Center / Current Dataset Info (Desktop/Tablet) */}
          <div className="hidden md:flex items-center gap-2">
            {dataset ? (
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 shadow-inner">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-semibold text-slate-100 max-w-[140px] truncate">{dataset.dataset_name}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300 font-mono">{dataset.gene_count.toLocaleString()} genes</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300 font-mono">{dataset.sample_count} samples</span>
                {dataset.is_demo && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-mono font-bold">
                    DEMO
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">No dataset currently active</div>
            )}
          </div>

          {/* Right Actions & Live Connection Status */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Session Save & Load (Desktop) */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={handleSaveSession}
                disabled={!dataset}
                title="Save current workspace & results to JSON session file"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/30 hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden lg:inline">Save Session</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                title="Load saved .transcriptox.json session file"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/30 hover:bg-slate-800 transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden lg:inline">Load Session</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.transcriptox.json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* How-to-Use Guide Button (Desktop/Tablet) */}
            <button
              onClick={() => setActiveStep('howtouse')}
              title="How to Use Guide & Tutorials"
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                activeStep === 'howtouse'
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline">How to Use</span>
            </button>

            {/* Documentation Button (Desktop) */}
            <button
              onClick={() => setActiveStep('docs')}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                activeStep === 'docs'
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Docs & Theory</span>
            </button>

            {/* Reset Session (Desktop) */}
            {dataset && (
              <button
                onClick={resetSession}
                title="Reset current session and upload new data"
                className="hidden xl:flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-rose-300 hover:border-rose-500/30 hover:bg-rose-950/20 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            {/* Live Backend Connection Indicator */}
            <div className="flex items-center gap-1.5 pl-1 sm:pl-2 border-l border-slate-800">
              {connectionStatus === 'connected' ? (
                <StatusBadge status="connected" text="Backend Connected ✓" size="sm" />
              ) : connectionStatus === 'connecting' ? (
                <StatusBadge status="connecting" text="Connecting..." size="sm" />
              ) : connectionStatus === 'retrying' ? (
                <div className="flex items-center gap-1">
                  <StatusBadge status="retrying" text="Waking up..." size="sm" />
                  <button
                    onClick={() => checkBackendConnection(true)}
                    disabled={isCheckingHealth}
                    title={connectionMessage || 'Backend waking up... click to re-check'}
                    className="p-1 rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <StatusBadge status="offline" text="Backend Offline" size="sm" />
                  <button
                    onClick={() => checkBackendConnection(true)}
                    disabled={isCheckingHealth}
                    title="Retry connection to backend server"
                    className="p-1.5 rounded-md bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold backdrop-blur-xl ${
                toastMessage.type === 'success'
                  ? 'bg-slate-900/90 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10'
                  : 'bg-slate-900/90 border-rose-500/40 text-rose-300 shadow-rose-500/10'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}
      </header>

      {/* Slide-over Mobile Drawer */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
      />
    </>
  );
};
