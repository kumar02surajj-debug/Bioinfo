import React, { useRef, useEffect } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import type { AnalysisStep } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  LayoutDashboard,
  UploadCloud,
  Microscope,
  Scale,
  Grid3X3,
  Network,
  Activity,
  FileSpreadsheet,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  Lock,
  ChevronRight,
  Sparkles,
  X,
  Dna,
  Save,
  Upload,
  RotateCcw,
  RefreshCw,
  Layers,
} from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StepNavItem {
  id: AnalysisStep;
  label: string;
  shortLabel: string;
  stepNum?: string;
  icon: React.ElementType;
  isUnlocked: (context: any) => boolean;
  isCompleted: (context: any) => boolean;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const context = useAnalysis();
  const {
    activeStep,
    setActiveStep,
    dataset,
    qcResults,
    degResults,
    clusteringResults,
    enrichmentResults,
    survivalResults,
    connectionStatus,
    connectionMessage,
    checkBackendConnection,
    isCheckingHealth,
    resetSession,
    exportSessionJSON,
    importSessionJSON,
  } = context;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const navItems: StepNavItem[] = [
    {
      id: 'dashboard',
      label: 'Pipeline Overview',
      shortLabel: 'Overview',
      icon: LayoutDashboard,
      isUnlocked: () => true,
      isCompleted: () => !!dataset,
    },
    {
      id: 'upload',
      label: 'Data Upload & Validation',
      shortLabel: 'Upload',
      stepNum: '01',
      icon: UploadCloud,
      isUnlocked: () => true,
      isCompleted: () => !!dataset,
    },
    {
      id: 'qc',
      label: 'QC & PCA Analysis',
      shortLabel: 'QC + PCA',
      stepNum: '02',
      icon: Microscope,
      isUnlocked: () => !!dataset,
      isCompleted: () => !!qcResults,
    },
    {
      id: 'differential',
      label: 'Differential Expression',
      shortLabel: 'DEG Analysis',
      stepNum: '03',
      icon: Scale,
      isUnlocked: () => !!dataset,
      isCompleted: () => !!degResults,
    },
    {
      id: 'clustering',
      label: 'Clustering & Heatmap',
      shortLabel: 'Clustering',
      stepNum: '04',
      icon: Grid3X3,
      isUnlocked: () => !!degResults,
      isCompleted: () => !!clusteringResults,
    },
    {
      id: 'enrichment',
      label: 'Pathway Enrichment',
      shortLabel: 'Enrichment',
      stepNum: '05',
      icon: Network,
      isUnlocked: () => !!degResults,
      isCompleted: () => !!enrichmentResults,
    },
    {
      id: 'survival',
      label: 'Survival Analysis',
      shortLabel: 'Survival',
      stepNum: '06',
      icon: Activity,
      isUnlocked: () => !!dataset && dataset.has_survival,
      isCompleted: () => !!survivalResults,
    },
    {
      id: 'results',
      label: 'Results & HTML Report',
      shortLabel: 'Results & Report',
      icon: FileSpreadsheet,
      isUnlocked: () => !!dataset,
      isCompleted: () => false,
    },
    {
      id: 'howtouse',
      label: 'How to Use Guide',
      shortLabel: 'How to Use',
      icon: HelpCircle,
      isUnlocked: () => true,
      isCompleted: () => false,
    },
    {
      id: 'docs',
      label: 'Documentation & Theory',
      shortLabel: 'Documentation',
      icon: BookOpen,
      isUnlocked: () => true,
      isCompleted: () => false,
    },
  ];

  const handleStepClick = (stepId: AnalysisStep) => {
    setActiveStep(stepId);
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importSessionJSON(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Menu Content */}
      <div className="relative flex flex-col w-5/6 max-w-sm bg-slate-950 border-r border-slate-800 shadow-2xl z-10 h-full overflow-y-auto p-4 space-y-5">
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-md">
              <Dna className="h-5 w-5 text-slate-950 font-bold animate-pulse" />
            </div>
            <div>
              <span className="text-base font-bold text-white">Transcripto<span className="text-cyan-400">X</span></span>
              <span className="ml-1.5 rounded-md bg-cyan-950/80 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-300 border border-cyan-500/30">
                v1.0
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Backend Connection Status Banner */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Backend Status:</span>
            <StatusBadge status={connectionStatus} text={connectionStatus === 'connected' ? 'Connected ✓' : undefined} />
          </div>
          {connectionMessage && connectionStatus !== 'connected' && (
            <p className="text-[11px] text-slate-400 leading-snug">
              {connectionMessage}
            </p>
          )}
          {connectionStatus !== 'connected' && (
            <button
              onClick={() => checkBackendConnection(true)}
              disabled={isCheckingHealth}
              className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-semibold text-xs transition-all disabled:opacity-50 min-h-[40px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
              <span>{isCheckingHealth ? 'Connecting...' : 'Retry Connection'}</span>
            </button>
          )}
        </div>

        {/* Active Dataset Overview */}
        {dataset && (
          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold truncate">
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{dataset.dataset_name}</span>
              </div>
              <button
                onClick={() => {
                  resetSession();
                  onClose();
                }}
                title="Reset session"
                className="p-1 text-slate-400 hover:text-rose-400"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              {dataset.gene_count.toLocaleString()} genes • {dataset.sample_count} samples ({dataset.conditions.join(' vs ')})
            </p>
          </div>
        )}

        {/* Pipeline Steps Navigation */}
        <div className="space-y-4">
          <div>
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Analysis Pipeline
            </p>
            <nav className="space-y-1">
              {navItems.slice(0, 8).map((item) => {
                const Icon = item.icon;
                const isActive = activeStep === item.id;
                const unlocked = item.isUnlocked(context);
                const completed = item.isCompleted(context);

                return (
                  <button
                    key={item.id}
                    onClick={() => unlocked && handleStepClick(item.id)}
                    disabled={!unlocked}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-medium transition-all min-h-[44px] ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : unlocked
                        ? 'text-slate-300 hover:bg-slate-900 border border-transparent'
                        : 'text-slate-600 cursor-not-allowed border border-transparent opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.stepNum ? (
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            isActive
                              ? 'bg-cyan-500/30 text-cyan-200'
                              : completed
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {item.stepNum}
                        </span>
                      ) : null}
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-cyan-400' : completed ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />
                    ) : !unlocked ? (
                      <Lock className="w-3.5 h-3.5 text-slate-700 shrink-0 ml-1" />
                    ) : isActive ? (
                      <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          <div>
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Reference & Guides
            </p>
            <nav className="space-y-1">
              {navItems.slice(8).map((item) => {
                const Icon = item.icon;
                const isActive = activeStep === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleStepClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-medium transition-all min-h-[44px] ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-300 hover:bg-slate-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Session Actions */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                exportSessionJSON();
                onClose();
              }}
              disabled={!dataset}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-semibold rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-cyan-300 disabled:opacity-40 min-h-[44px]"
            >
              <Save className="w-3.5 h-3.5 text-cyan-400" />
              <span>Save Session</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-semibold rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-cyan-300 min-h-[44px]"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>Load Session</span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.transcriptox.json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Disclaimer */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[10px] text-slate-500 leading-normal">
          <p className="font-semibold text-slate-400 flex items-center gap-1 mb-0.5">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Research & Education
          </p>
          Independent experimental validation required before clinical or diagnostic use.
        </div>
      </div>
    </div>
  );
};
