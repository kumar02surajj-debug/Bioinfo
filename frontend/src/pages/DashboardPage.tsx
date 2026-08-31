import React from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import * as api from '../services/api';
import {
  UploadCloud,
  Microscope,
  Scale,
  Grid3X3,
  Network,
  Activity,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Database,
  CheckCircle2,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { AlertBanner } from '../components/common/AlertBanner';

export const DashboardPage: React.FC = () => {
  const {
    setActiveStep,
    isBackendConnected,
    setDataset,
    dataset,
    setLoading,
    loadingState,
    setError,
    errorState,
  } = useAnalysis();

  const handleLoadDemo = async () => {
    setLoading('loadDemo', true);
    setError('loadDemo', null);
    try {
      const demoData = await api.loadDemoDataset();
      setDataset(demoData);
      setActiveStep('upload');
    } catch (err: any) {
      setError('loadDemo', err.message || 'Failed to load demo dataset');
    } finally {
      setLoading('loadDemo', false);
    }
  };

  const workflowSteps = [
    {
      num: '01',
      title: 'QC & PCA',
      desc: 'Library sizes, zero-count filtering, sample correlation & 2D/3D PCA on normalized log-CPM counts.',
      icon: Microscope,
      step: 'qc',
      color: 'sky',
    },
    {
      num: '02',
      title: 'Differential Expression',
      desc: 'Log2FC estimation, Welch t-test & Benjamini-Hochberg FDR correction. Interactive Volcano & MA plots.',
      icon: Scale,
      step: 'differential',
      color: 'emerald',
    },
    {
      num: '03',
      title: 'Clustering & Heatmap',
      desc: 'Automatic DEG filtering, Z-score scaling & hierarchical clustering with annotated sample metadata bars.',
      icon: Grid3X3,
      step: 'clustering',
      color: 'purple',
    },
    {
      num: '04',
      title: 'Pathway Enrichment',
      desc: 'Real GO (BP, MF, CC), KEGG & Reactome over-representation analysis with interactive dot & bar plots.',
      icon: Network,
      step: 'enrichment',
      color: 'amber',
    },
    {
      num: '05',
      title: 'Survival Analysis',
      desc: 'Kaplan-Meier survival curves, Log-rank test, Cox Proportional Hazards ratio & Number-at-Risk table.',
      icon: Activity,
      step: 'survival',
      color: 'rose',
    },
    {
      num: '06',
      title: 'Results & Report',
      desc: 'Interactive results dashboard, publication-ready data tables, CSV exports & standalone HTML report generator.',
      icon: FileSpreadsheet,
      step: 'results',
      color: 'indigo',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Standalone Transcriptomic Analysis Pipeline</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Transcripto<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400">X</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            A seamless, integrated bioinformatics workspace for RNA-seq and transcriptomic profiling.
            Go from raw expression counts to quality control, differential expression, hierarchical clustering,
            pathway enrichment, and survival prognosis in one continuous workflow.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => setActiveStep('upload')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Your Data</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleLoadDemo}
              disabled={loadingState['loadDemo'] || !isBackendConnected}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm transition-all hover:border-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Database className="w-4 h-4 text-cyan-400" />
              <span>{loadingState['loadDemo'] ? 'Loading Synthetic Demo...' : 'Load Synthetic Demo Dataset'}</span>
            </button>

            <button
              onClick={() => setActiveStep('docs')}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Pipeline Documentation</span>
            </button>
          </div>

          {/* Backend Status Notice */}
          {!isBackendConnected && (
            <div className="pt-2">
              <AlertBanner
                type="warning"
                title="Backend Engine Offline"
                message="The Python FastAPI analysis backend is currently not detected at http://localhost:8000. Please start the backend service to run statistical computations."
              />
            </div>
          )}

          {errorState['loadDemo'] && (
            <div className="pt-2">
              <AlertBanner
                type="error"
                title="Demo Loading Error"
                message={errorState['loadDemo']}
              />
            </div>
          )}
        </div>
      </div>

      {/* Dataset Status Banner if loaded */}
      {dataset && (
        <div className="p-6 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Active Dataset: <span className="text-cyan-400 font-mono">{dataset.dataset_name}</span>
                {dataset.is_demo && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs">
                    SYNTHETIC DEMO
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {dataset.gene_count.toLocaleString()} genes across {dataset.sample_count} samples ({dataset.conditions.join(' vs ')}).
                {dataset.has_survival ? ' Includes clinical survival timeline.' : ' No survival metadata provided.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveStep('qc')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shrink-0 transition-all"
          >
            <span>Proceed to Step 02: QC & PCA</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Workflow Diagram & Steps */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Automated Pipeline Workflow</h2>
            <p className="text-xs text-slate-400">Results flow automatically from one stage into the next.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workflowSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                onClick={() => dataset && setActiveStep(step.step as any)}
                className={`p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md transition-all duration-300 ${
                  dataset
                    ? 'hover:border-cyan-500/40 hover:bg-slate-900/90 cursor-pointer hover:shadow-xl hover:shadow-cyan-950/20 hover:-translate-y-1'
                    : 'opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                    STEP {step.num}
                  </span>
                  <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-100 mb-2">{step.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scientific Transparency & Integrity Box */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-3">
        <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Bioinformatics Integrity & Scientific Principles
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <h5 className="font-semibold text-slate-300 mb-1">Zero Synthetic Hallucinations</h5>
            <p>Every p-value, FDR, fold-change, and hazard ratio is computed directly on your data using rigorous statistical libraries.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <h5 className="font-semibold text-slate-300 mb-1">Methodology Transparency</h5>
            <p>Differential expression uses log2-transformed counts and Welch's t-test with Benjamini-Hochberg FDR correction as a fast, robust statistical approximation.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <h5 className="font-semibold text-slate-300 mb-1">Live Enrichr Knowledgebases</h5>
            <p>Pathway enrichment queries official Gene Ontology (GO), KEGG, and Reactome endpoints via GSEAPy without hardcoded or fabricated pathways.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
