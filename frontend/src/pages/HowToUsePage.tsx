import React, { useState } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { BackButton } from '../components/common/BackButton';
import * as api from '../services/api';
import {
  Sparkles,
  UploadCloud,
  Microscope,
  Scale,
  Grid3X3,
  Network,
  Activity,
  FileSpreadsheet,
  Database,
  ArrowRight,
  HelpCircle,
  AlertCircle,
  Copy,
  Check,
  CheckCircle2,
  FileText,
  Layers,
  Download,
  Compass,
} from 'lucide-react';

export const HowToUsePage: React.FC = () => {
  const { setActiveStep, setDataset, setLoading, loadingState, setError, clearErrors, isBackendConnected } = useAnalysis();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [exprTab, setExprTab] = useState<'csv' | 'txt'>('csv');

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleLoadDemo = async () => {
    clearErrors();
    setLoading('howToUseDemo', true);
    try {
      const demoData = await api.loadDemoDataset();
      setDataset(demoData);
      setActiveStep('upload');
    } catch (err: any) {
      setError('upload', err.message || 'Failed to load demo dataset');
    } finally {
      setLoading('howToUseDemo', false);
    }
  };

  const exprCsvExample = `gene_id,Control_1,Control_2,Control_3,Treatment_1,Treatment_2,Treatment_3
TP53,105,112,98,25,30,22
EGFR,45,52,48,210,195,205
MYC,12,15,10,340,310,325
CDKN1A,88,94,82,18,24,19
BRCA1,75,80,72,16,19,14`;

  const exprTsvExample = `gene_id\tControl_1\tControl_2\tControl_3\tTreatment_1\tTreatment_2\tTreatment_3
TP53\t105\t112\t98\t25\t30\t22
EGFR\t45\t52\t48\t210\t195\t205
MYC\t12\t15\t10\t340\t310\t325
CDKN1A\t88\t94\t82\t18\t24\t19
BRCA1\t75\t80\t72\t16\t19\t14`;

  const metaExample = `sample_id,condition,batch
Control_1,Control,Batch_1
Control_2,Control,Batch_1
Control_3,Control,Batch_2
Treatment_1,Treatment,Batch_1
Treatment_2,Treatment,Batch_2
Treatment_3,Treatment,Batch_2`;

  const survExample = `sample_id,time,event
Control_1,48.5,0
Control_2,52.1,0
Control_3,39.4,1
Treatment_1,14.2,1
Treatment_2,18.6,1
Treatment_3,22.0,0`;

  const workflowCards = [
    {
      step: '01',
      title: 'Data Ingestion & Validation',
      icon: UploadCloud,
      color: 'sky',
      route: 'upload',
      whatToClick: 'Select your Expression matrix (.csv or .txt), Metadata file, and optional Survival table, then click "Validate & Ingest Dataset". Or click "Load Synthetic Demo Dataset" to start instantly.',
      whatToExpect: 'Real-time structural integrity checks verify matching sample IDs, non-negative integer counts, absence of duplicate genes, and condition group definitions. A summary dashboard previews the first 10 rows and dataset metrics.',
    },
    {
      step: '02',
      title: 'Quality Control & PCA Analysis',
      icon: Microscope,
      color: 'sky',
      route: 'qc',
      whatToClick: 'Inspect the automatically computed sequencing library size distributions, boxplots, sample-to-sample correlation heatmap, and 2D/3D PCA projection plots.',
      whatToExpect: 'Counts are normalized using Counts Per Million (log2 CPM + 1). Verify sample grouping clusters clearly by condition on PC1/PC2 before proceeding to statistical comparisons.',
    },
    {
      step: '03',
      title: 'Differential Gene Expression (DEG)',
      icon: Scale,
      color: 'emerald',
      route: 'differential',
      whatToClick: 'Choose your Control and Treatment condition groups from dropdowns, adjust log2FC (e.g. 1.0) and FDR threshold (e.g. 0.05) if desired, and click "Run Differential Expression".',
      whatToExpect: 'Interactive Volcano plot and MA plot render immediately with UP-regulated (red) and DOWN-regulated (blue) genes highlighted. Use "Use Significant DEGs for Clustering" or "Use Significant DEGs for Enrichment" to carry results forward automatically.',
    },
    {
      step: '04',
      title: 'Hierarchical Clustering & Heatmap',
      icon: Grid3X3,
      color: 'purple',
      route: 'clustering',
      whatToClick: 'Select how many top DEGs to cluster (e.g. Top 30, Top 50, or All DEGs), pick distance metric (Euclidean, Pearson) and linkage (Average, Complete, Ward), then click "Re-compute Heatmap".',
      whatToExpect: 'An interactive dual-dendrogram clustered heatmap displaying row-standardized Z-scores across all samples with synchronized condition metadata color bars.',
    },
    {
      step: '05',
      title: 'Biological Pathway Enrichment',
      icon: Network,
      color: 'amber',
      route: 'enrichment',
      whatToClick: 'Select your target database (GO Biological Process, GO Molecular Function, KEGG, Reactome, BioPlanet) and gene subset (All DEGs, UP-regulated only, or DOWN-regulated only), then click "Run Pathway Enrichment".',
      whatToExpect: 'Real-time over-representation analysis queries live Enrichr / GSEAPy endpoints. Results display in interactive horizontal bar charts, enrichment bubble dot plots, and sortable tables with p-values and combined scores.',
    },
    {
      step: '06',
      title: 'Clinical Survival & Prognostic Modeling',
      icon: Activity,
      color: 'rose',
      route: 'survival',
      whatToClick: 'Select any biomarker gene of interest (or pick from top DEGs), select group splitting method (Median expression, Tertile, or Custom threshold), and click "Run Survival Analysis".',
      whatToExpect: 'Kaplan-Meier survival probability curves with 95% confidence intervals, log-rank p-value, Cox proportional hazard ratio (HR), Wald test, and a synchronized Number-at-Risk timeline table.',
    },
    {
      step: '07',
      title: 'Results Dashboard & Standalone Report',
      icon: FileSpreadsheet,
      color: 'indigo',
      route: 'results',
      whatToClick: 'Review aggregated cross-module findings, filterable master data tables, search individual gene markers, and export publication-ready CSVs or click "Generate HTML Report".',
      whatToExpect: 'Immediate download of clean CSV datasets or a self-contained, interactive HTML scientific report ready for distribution, publication appendices, or thesis submissions.',
    },
  ];

  const troubleshootingItems = [
    {
      problem: 'Backend Connection Delay / "Backend Waking Up" Notice',
      cause: 'If the backend is deployed on a free or serverless cloud tier (e.g. Render Free Tier, Railway, Fly.io), the server spins down to sleep during inactivity. The first health check can take 20 to 60+ seconds to spin up from idle ("cold start").',
      solution: 'This is expected cloud infrastructure behavior. TranscriptoX automatically polls the backend every 3 seconds up to 60 seconds with live progress feedback. Once awake, the connection is cached for the rest of your session. You can also click the "Check Now" or "Retry Connection" button in the status pill at any time.',
    },
    {
      problem: 'Mobile & Tablet Touch Gestures / Screen Navigation',
      cause: 'Navigating complex bioinformatics dashboards and large interactive matrix heatmaps on smartphones or tablets.',
      solution: 'On mobile screens (< 768px), use the top-left hamburger menu to open the full step drawer with progress checkmarks. All data tables support smooth horizontal finger swiping within their containers. Plotly charts are optimized for touch panning, and pinch-to-zoom is available through the chart modebar.',
    },
    {
      problem: 'Backend Disconnected / Offline Banner',
      cause: 'The Python FastAPI backend service is not running or unreachable at the configured API URL.',
      solution: 'If running locally, open a terminal and run: cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000 (Windows: .venv\\Scripts\\activate ; uvicorn app.main:app --reload --port 8000). Once started, click the "Retry Connection" button in the header.',
    },
    {
      problem: 'Sample IDs in metadata do not match expression matrix',
      cause: 'Column headers in the expression matrix file do not match the values listed in the sample_id column of your metadata file.',
      solution: 'Ensure sample identifiers have identical spelling and capitalization across both files. Avoid trailing whitespace in sample names or header commas.',
    },
    {
      problem: 'Survival Analysis Module is disabled / greyed out',
      cause: 'Survival analysis requires clinical follow-up time and event binary status for samples, which is optional during upload.',
      solution: 'Upload a 3rd file (survival.csv or survival.txt) with columns: sample_id, time (follow-up duration in months/days), and event (0 = alive/censored, 1 = deceased/event).',
    },
    {
      problem: 'No statistically significant DEGs found at current thresholds',
      cause: 'Your log2 Fold Change or FDR threshold may be too strict for the statistical effect size of your dataset.',
      solution: 'Navigate to Step 03 (Differential Expression), relax the FDR threshold (e.g. from 0.01 to 0.05 or 0.10) and lower the |log2FC| cutoff (e.g. from 2.0 to 0.585 for a 1.5-fold change), then re-run.',
    },
    {
      problem: 'Could not parse file as gene expression matrix / Delimiter Error',
      cause: 'The file contains irregular formatting, missing row labels, or unreadable encoding.',
      solution: 'TranscriptoX supports both .csv (comma) and .txt (tab or whitespace) delimited files. Ensure the top-left cell is gene_id, row 1 contains sample names, and all remaining cells contain non-negative numeric counts encoded in UTF-8 or ASCII.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                USER GUIDE
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                How to Use TranscriptoX
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Step-by-step instructions, file format guidelines, and troubleshooting for first-time researchers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveStep('docs')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-all"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Theory & Docs</span>
          </button>
          <button
            onClick={handleLoadDemo}
            disabled={loadingState['howToUseDemo'] || !isBackendConnected}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            <Database className="w-4 h-4" />
            <span>{loadingState['howToUseDemo'] ? 'Loading Demo...' : 'Try Demo Dataset'}</span>
          </button>
        </div>
      </div>

      {/* 1. Overview */}
      <section className="p-6 sm:p-8 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-950 to-cyan-950/30 space-y-4 shadow-xl">
        <div className="flex items-center gap-2.5 text-cyan-400 text-sm font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>1. Pipeline Overview</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
          End-to-End Transcriptomic Profiling in One Continuous Workspace
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
          <strong>TranscriptoX</strong> is a standalone, web-based bioinformatics pipeline designed to analyze bulk RNA-seq and gene expression datasets. 
          The pipeline guides you seamlessly through seven integrated modules: 
          <strong> Upload & Validation</strong> → <strong>Quality Control & PCA</strong> → <strong>Differential Gene Expression (DEG)</strong> → <strong>Hierarchical Clustering</strong> → <strong>Biological Pathway Enrichment</strong> → <strong>Clinical Survival Prognosis</strong> → <strong>Interactive Results & HTML Report Generation</strong>. 
          Results automatically feed forward between stages, eliminating manual gene list reformatting and third-party data conversion.
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          {['01 Ingestion', '02 QC & PCA', '03 DEG Analysis', '04 Clustering', '05 Enrichment', '06 Survival', '07 HTML Report'].map((stepName, i) => (
            <React.Fragment key={stepName}>
              <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300 font-semibold shadow-inner">
                {stepName}
              </span>
              {i < 6 && <ArrowRight className="w-3.5 h-3.5 text-slate-600 hidden sm:inline" />}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* 2. Getting Started */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span>2. Getting Started (Two Quick Paths)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Path A */}
          <div className="p-6 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 backdrop-blur-md space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Path A — Instant Benchmark (Recommended)</span>
              </div>
              <h3 className="text-base font-bold text-slate-100">Try TranscriptoX with Demo Data</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Click <strong>"Load Synthetic Demo Dataset"</strong> from either the Dashboard or the Upload page. TranscriptoX will immediately load a pre-validated dataset containing 600 genes across 16 samples (Control vs. Treatment) with simulated survival timeline metrics.
              </p>
            </div>
            <button
              onClick={handleLoadDemo}
              disabled={loadingState['howToUseDemo'] || !isBackendConnected}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>{loadingState['howToUseDemo'] ? 'Loading Synthetic Demo...' : 'Load Demo Dataset Now'}</span>
            </button>
          </div>

          {/* Path B */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold">
                <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>Path B — Analyze Your Own Data</span>
              </div>
              <h3 className="text-base font-bold text-slate-100">Upload Your Experimental Data</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Prepare your expression count matrix file (accepted as <strong>.csv</strong> or <strong>.txt</strong>) and sample metadata file. Optionally add a survival timeline table to enable clinical prognostic analysis.
              </p>
            </div>
            <button
              onClick={() => setActiveStep('upload')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold text-xs transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-emerald-400" />
              <span>Go to Step 01: Upload</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Required File Formats */}
      <section className="p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/40 space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>3. Required File Formats & Input Specifications</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-100">
            Clean, Standard Delimited Formats (.CSV and .TXT Supported)
          </h2>
          <p className="text-xs text-slate-400">
            The expression matrix accepts both Comma-Separated Values (<code>.csv</code>) and Tab/Whitespace-Delimited text files (<code>.txt</code>). Delimiters are automatically detected by the backend.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Format 1: Expression Matrix */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  1. Expression Matrix (.csv or .txt)
                </h4>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setExprTab('csv')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      exprTab === 'csv'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    .CSV
                  </button>
                  <button
                    onClick={() => setExprTab('txt')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      exprTab === 'txt'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    .TXT (Tab)
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                First column must be <code className="text-cyan-300">gene_id</code> (e.g. HGNC symbols). Remaining columns represent samples with non-negative raw count values.
              </p>
            </div>

            <div className="relative">
              <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre">
                {exprTab === 'csv' ? exprCsvExample : exprTsvExample}
              </pre>
              <button
                onClick={() => handleCopy('expr', exprTab === 'csv' ? exprCsvExample : exprTsvExample)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title={`Copy example ${exprTab.toUpperCase()}`}
              >
                {copiedSection === 'expr' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-[10px] text-slate-500 italic">
              Tip: Delimiters (comma, tab, whitespace) are automatically detected on upload.
            </p>
          </div>

          {/* Format 2: Sample Metadata */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  2. Sample Metadata (.csv or .txt)
                </h4>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Required
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Must contain <code className="text-emerald-300">sample_id</code> (matching expression column headers) and <code className="text-emerald-300">condition</code> defining phenotypic contrast groups.
              </p>
            </div>

            <div className="relative">
              <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                {metaExample}
              </pre>
              <button
                onClick={() => handleCopy('meta', metaExample)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy example Metadata"
              >
                {copiedSection === 'meta' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-[10px] text-slate-500 italic">
              At least 2 distinct condition groups (e.g. Control vs. Treatment) are required for DEG testing.
            </p>
          </div>

          {/* Format 3: Survival Timeline */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-rose-400" />
                  3. Survival Timeline (.csv or .txt)
                </h4>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  Optional
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Contains <code className="text-rose-300">sample_id</code>, <code className="text-rose-300">time</code> (months or days), and <code className="text-rose-300">event</code> (0 = alive/censored, 1 = event/deceased).
              </p>
            </div>

            <div className="relative">
              <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                {survExample}
              </pre>
              <button
                onClick={() => handleCopy('surv', survExample)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy example Survival"
              >
                {copiedSection === 'surv' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-[10px] text-slate-500 italic">
              Optional file. If omitted, modules 01–05 and 07 operate normally; module 06 is disabled.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Step-by-Step Walkthrough */}
      <section className="space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>4. Step-by-Step Module Walkthrough</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-100">
            How to Navigate the 7 Analysis Stages
          </h2>
          <p className="text-xs text-slate-400">
            Each module provides interactive controls and immediate visual feedback.
          </p>
        </div>

        <div className="space-y-4">
          {workflowCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.step}
                className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      STEP {card.step}
                    </span>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <Icon className="w-4 h-4 text-cyan-400" />
                      {card.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveStep(card.route as any)}
                    className="self-start sm:self-auto text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>Open Module</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed pt-1">
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/70 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      What to Click / Adjust
                    </span>
                    <p>{card.whatToClick}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/70 space-y-1">
                    <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                      What to Expect & Next Actions
                    </span>
                    <p>{card.whatToExpect}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Downloading Results */}
      <section className="p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
          <Download className="w-4 h-4 text-indigo-400" />
          <span>5. Exporting Results & Publication Deliverables</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-100">
          Where to Find & Download Outputs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-200 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              1. Filtered CSV Spreadsheets
            </h4>
            <p className="text-slate-400 leading-relaxed">
              On the <strong>Differential Expression</strong> and <strong>Results</strong> pages, click <strong>"Export CSV"</strong> to download full DEG statistical tables (log2FC, p-values, FDR).
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-200 flex items-center gap-2">
              <Download className="w-4 h-4 text-cyan-400" />
              2. High-Res Plot Images
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Hover over any interactive Plotly figure (Volcano, PCA, Heatmap, KM curve) and click the camera icon in the top-right toolbar to download a publication-ready PNG/SVG.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              3. Standalone HTML Report
            </h4>
            <p className="text-slate-400 leading-relaxed">
              On Step 07 (Results & Report), select which modules to include and click <strong>"Generate HTML Report"</strong>. This produces a standalone file containing methodology notes and interactive charts.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Troubleshooting */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>6. Troubleshooting & Frequently Encountered Issues</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-100">
          Quick Fixes for Common Workflow Problems
        </h2>

        <div className="space-y-3">
          {troubleshootingItems.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2"
            >
              <div className="flex items-start gap-2.5">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0 mt-0.5">
                  Issue {idx + 1}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">{item.problem}</h4>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono text-[11px]">
                    <strong>Cause:</strong> {item.cause}
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 mt-2">
                <strong className="text-emerald-400">Solution:</strong> {item.solution}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <div className="p-6 sm:p-8 rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 to-blue-950/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-100">Ready to start analyzing?</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Load the synthetic demo dataset or upload your own files to begin Stage 01.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveStep('upload')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Go to Upload</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
