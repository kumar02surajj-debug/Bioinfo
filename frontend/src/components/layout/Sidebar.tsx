import React from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import type { AnalysisStep } from '../../types';
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
  CheckCircle2,
  Lock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface StepNavItem {
  id: AnalysisStep;
  label: string;
  shortLabel: string;
  stepNum?: string;
  icon: React.ElementType;
  isUnlocked: (context: any) => boolean;
  isCompleted: (context: any) => boolean;
}

export const Sidebar: React.FC = () => {
  const context = useAnalysis();
  const { activeStep, setActiveStep, dataset, qcResults, degResults, clusteringResults, enrichmentResults, survivalResults } = context;

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
      id: 'docs',
      label: 'Documentation & Theory',
      shortLabel: 'Documentation',
      icon: BookOpen,
      isUnlocked: () => true,
      isCompleted: () => false,
    },
  ];

  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col border-r border-slate-800/80 bg-slate-950/60 p-4 justify-between h-[calc(100vh-4rem)] sticky top-16">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Analysis Pipeline
          </p>
          <nav className="space-y-1">
            {navItems.slice(0, 7).map((item) => {
              const Icon = item.icon;
              const isActive = activeStep === item.id;
              const unlocked = item.isUnlocked(context);
              const completed = item.isCompleted(context);

              return (
                <button
                  key={item.id}
                  onClick={() => unlocked && setActiveStep(item.id)}
                  disabled={!unlocked}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : unlocked
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                      : 'text-slate-600 cursor-not-allowed border border-transparent opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.stepNum ? (
                      <span
                        className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
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
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-cyan-400' : completed ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.shortLabel}</span>
                  </div>

                  {completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                  ) : !unlocked ? (
                    <Lock className="w-3 h-3 text-slate-700 shrink-0 ml-1" />
                  ) : isActive ? (
                    <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Output & Reference
          </p>
          <nav className="space-y-1">
            {navItems.slice(7).map((item) => {
              const Icon = item.icon;
              const isActive = activeStep === item.id;
              const unlocked = item.isUnlocked(context);

              return (
                <button
                  key={item.id}
                  onClick={() => unlocked && setActiveStep(item.id)}
                  disabled={!unlocked}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : unlocked
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                      : 'text-slate-600 cursor-not-allowed border border-transparent opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.shortLabel}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Disclaimer Box */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-[11px] text-slate-400 leading-normal">
        <p className="font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3 h-3 text-cyan-400" /> Research & Education
        </p>
        <p className="text-[10px] text-slate-500">
          Independent validation required before clinical, diagnostic, or therapeutic use.
        </p>
      </div>
    </aside>
  );
};
