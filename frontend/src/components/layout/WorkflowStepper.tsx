import React from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import type { AnalysisStep } from '../../types';
import {
  UploadCloud,
  Microscope,
  Scale,
  Grid3X3,
  Network,
  Activity,
  Check,
} from 'lucide-react';

export const WorkflowStepper: React.FC = () => {
  const context = useAnalysis();
  const { activeStep, setActiveStep, dataset, qcResults, degResults, clusteringResults, enrichmentResults, survivalResults } = context;

  const steps: { id: AnalysisStep; label: string; num: string; icon: React.ElementType; isUnlocked: boolean; isDone: boolean }[] = [
    {
      id: 'upload',
      label: 'Upload',
      num: '1',
      icon: UploadCloud,
      isUnlocked: true,
      isDone: !!dataset,
    },
    {
      id: 'qc',
      label: 'QC & PCA',
      num: '2',
      icon: Microscope,
      isUnlocked: !!dataset,
      isDone: !!qcResults,
    },
    {
      id: 'differential',
      label: 'Differential',
      num: '3',
      icon: Scale,
      isUnlocked: !!dataset,
      isDone: !!degResults,
    },
    {
      id: 'clustering',
      label: 'Clustering',
      num: '4',
      icon: Grid3X3,
      isUnlocked: !!degResults,
      isDone: !!clusteringResults,
    },
    {
      id: 'enrichment',
      label: 'Enrichment',
      num: '5',
      icon: Network,
      isUnlocked: !!degResults,
      isDone: !!enrichmentResults,
    },
    {
      id: 'survival',
      label: 'Survival',
      num: '6',
      icon: Activity,
      isUnlocked: !!dataset && dataset.has_survival,
      isDone: !!survivalResults,
    },
  ];

  return (
    <div className="w-full bg-slate-900/60 border-b border-slate-800/80 px-4 py-3 overflow-x-auto">
      <div className="flex items-center justify-between max-w-5xl mx-auto min-w-[640px]">
        {steps.map((step, index) => {
          const isActive = activeStep === step.id;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => step.isUnlocked && setActiveStep(step.id)}
                disabled={!step.isUnlocked}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : step.isDone
                    ? 'text-emerald-400 hover:bg-slate-800/60'
                    : step.isUnlocked
                    ? 'text-slate-300 hover:bg-slate-800/60'
                    : 'text-slate-600 cursor-not-allowed opacity-50'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : step.isDone
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : step.isUnlocked
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-slate-900 text-slate-600'
                  }`}
                >
                  {step.isDone ? <Check className="w-3 h-3 text-emerald-400" /> : step.num}
                </div>
                <span>{step.label}</span>
              </button>

              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 ${
                    steps[index].isDone ? 'bg-emerald-500/30' : 'bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
