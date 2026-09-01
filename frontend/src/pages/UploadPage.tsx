import React, { useState, useRef } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { BackButton } from '../components/common/BackButton';
import * as api from '../services/api';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Database,
  ArrowRight,
  Trash2,
  Layers,
  Activity,
  Info,
} from 'lucide-react';
import { AlertBanner } from '../components/common/AlertBanner';
import { StatCard } from '../components/common/StatCard';

export const UploadPage: React.FC = () => {
  const {
    dataset,
    setDataset,
    setActiveStep,
    loadingState,
    setLoading,
    errorState,
    setError,
    clearErrors,
    isBackendConnected,
  } = useAnalysis();

  const [expressionFile, setExpressionFile] = useState<File | null>(null);
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const [survivalFile, setSurvivalFile] = useState<File | null>(null);

  const exprInputRef = useRef<HTMLInputElement>(null);
  const metaInputRef = useRef<HTMLInputElement>(null);
  const survInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (!expressionFile) {
      setError('upload', 'Please select an Expression Matrix (.csv or .txt) file.');
      return;
    }
    if (!metadataFile) {
      setError('upload', 'Please select a Sample Metadata (.csv or .txt) file.');
      return;
    }

    setLoading('upload', true);
    try {
      const response = await api.uploadDataset(expressionFile, metadataFile, survivalFile);
      setDataset(response);
    } catch (err: any) {
      setError('upload', err.detail || err.message || 'Failed to upload and parse dataset.');
    } finally {
      setLoading('upload', false);
    }
  };

  const handleLoadDemo = async () => {
    clearErrors();
    setLoading('demo', true);
    try {
      const response = await api.loadDemoDataset();
      setDataset(response);
      setExpressionFile(null);
      setMetadataFile(null);
      setSurvivalFile(null);
    } catch (err: any) {
      setError('upload', err.detail || err.message || 'Failed to load demo dataset.');
    } finally {
      setLoading('demo', false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header with BackButton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                STEP 01
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                Data Ingestion & Validation
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Upload your RNA-seq count matrix and sample metadata, or load our pre-configured synthetic demo dataset.
            </p>
          </div>
        </div>

        <button
          onClick={handleLoadDemo}
          disabled={loadingState['demo'] || !isBackendConnected}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-semibold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
        >
          <Database className="w-4 h-4 text-cyan-400" />
          <span>{loadingState['demo'] ? 'Loading Synthetic Demo...' : 'Load Synthetic Demo Dataset'}</span>
        </button>
      </div>

      {/* Error / Offline Alert */}
      {errorState['upload'] && (
        <AlertBanner
          type="error"
          title="Dataset Validation Error"
          message={errorState['upload']}
          onClose={() => setError('upload', null)}
        />
      )}

      {!isBackendConnected && (
        <AlertBanner
          type="warning"
          title="Backend Service Unreachable"
          message="FastAPI backend is currently offline. Please ensure the backend server is running on http://localhost:8000."
        />
      )}

      {/* Main Upload Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expression Matrix Dropzone */}
        <div
          className={`p-6 rounded-2xl border transition-all ${
            expressionFile
              ? 'bg-cyan-950/20 border-cyan-500/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              1. Expression Matrix
            </h3>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Required
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-2 leading-relaxed">
            Gene expression count matrix with gene IDs as rows and sample IDs as columns. Values should be non-negative counts.
          </p>
          <div className="inline-block mb-3 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/80 text-[11px] font-mono text-cyan-300">
            Accepted formats: .csv, .txt
          </div>

          <input
            type="file"
            ref={exprInputRef}
            accept=".csv,.txt,text/plain,text/csv"
            onChange={(e) => setExpressionFile(e.target.files?.[0] || null)}
            className="hidden"
          />

          {expressionFile ? (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-cyan-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-xs font-mono text-slate-200 truncate">{expressionFile.name}</span>
              </div>
              <button
                onClick={() => setExpressionFile(null)}
                className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => exprInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl bg-slate-950/40 flex flex-col items-center justify-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              <UploadCloud className="w-6 h-6 text-slate-500" />
              <span>Select expression file (.csv or .txt)</span>
              <span className="text-[10px] text-slate-600">Delimited format (genes x samples)</span>
            </button>
          )}
        </div>

        {/* Sample Metadata Dropzone */}
        <div
          className={`p-6 rounded-2xl border transition-all ${
            metadataFile
              ? 'bg-cyan-950/20 border-cyan-500/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              2. Sample Metadata
            </h3>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              Required
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-2 leading-relaxed">
            Table containing <code className="text-slate-300">sample_id</code> and <code className="text-slate-300">condition</code> columns matching expression column names.
          </p>
          <div className="inline-block mb-3 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/80 text-[11px] font-mono text-emerald-300">
            Accepted formats: .csv, .txt
          </div>

          <input
            type="file"
            ref={metaInputRef}
            accept=".csv,.txt,text/plain,text/csv"
            onChange={(e) => setMetadataFile(e.target.files?.[0] || null)}
            className="hidden"
          />

          {metadataFile ? (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-mono text-slate-200 truncate">{metadataFile.name}</span>
              </div>
              <button
                onClick={() => setMetadataFile(null)}
                className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => metaInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl bg-slate-950/40 flex flex-col items-center justify-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              <UploadCloud className="w-6 h-6 text-slate-500" />
              <span>Select metadata file (.csv or .txt)</span>
              <span className="text-[10px] text-slate-600">Format (sample_id, condition)</span>
            </button>
          )}
        </div>

        {/* Survival Timeline Dropzone (Optional) */}
        <div
          className={`p-6 rounded-2xl border transition-all ${
            survivalFile
              ? 'bg-cyan-950/20 border-cyan-500/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              3. Survival Timeline
            </h3>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Optional
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-2 leading-relaxed">
            Table containing <code className="text-slate-300">sample_id</code>, <code className="text-slate-300">time</code> (months/days), and <code className="text-slate-300">event</code> (0=censored, 1=event).
          </p>
          <div className="inline-block mb-3 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/80 text-[11px] font-mono text-rose-300">
            Accepted formats: .csv, .txt
          </div>

          <input
            type="file"
            ref={survInputRef}
            accept=".csv,.txt,text/plain,text/csv"
            onChange={(e) => setSurvivalFile(e.target.files?.[0] || null)}
            className="hidden"
          />

          {survivalFile ? (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-rose-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate">
                <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-xs font-mono text-slate-200 truncate">{survivalFile.name}</span>
              </div>
              <button
                onClick={() => setSurvivalFile(null)}
                className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => survInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-slate-700 hover:border-rose-500/50 rounded-xl bg-slate-950/40 flex flex-col items-center justify-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              <UploadCloud className="w-6 h-6 text-slate-500" />
              <span>Select survival file (.csv or .txt)</span>
              <span className="text-[10px] text-slate-600">Format (sample_id, time, event)</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload Action Button */}
      {(expressionFile || metadataFile) && (
        <div className="flex justify-end">
          <button
            onClick={handleFileUpload}
            disabled={loadingState['upload'] || !isBackendConnected}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            <span>{loadingState['upload'] ? 'Validating Dataset...' : 'Validate & Ingest Dataset'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Dataset Inspection & Validation Summary */}
      {dataset && (
        <div className="space-y-6 pt-4 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-bold text-slate-100">Dataset Validation Succeeded</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Data structure validated with 0 integrity errors. Ready for Quality Control & Normalization.
              </p>
            </div>

            <button
              onClick={() => setActiveStep('qc')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              <span>Proceed to Step 02: QC & PCA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Genes"
              value={dataset.gene_count.toLocaleString()}
              subtitle="Distinct Gene Identifiers"
              color="sky"
            />
            <StatCard
              title="Total Samples"
              value={dataset.sample_count}
              subtitle="Validated RNA Samples"
              color="emerald"
            />
            <StatCard
              title="Phenotype Conditions"
              value={dataset.conditions.length}
              subtitle={dataset.conditions.join(' vs ')}
              color="purple"
            />
            <StatCard
              title="Survival Timeline"
              value={dataset.has_survival ? 'Available ✓' : 'Not Provided'}
              subtitle={dataset.has_survival ? 'Kaplan-Meier ready' : 'Module 06 disabled'}
              color={dataset.has_survival ? 'rose' : 'amber'}
            />
          </div>

          {/* Condition Breakdown */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center gap-4 text-xs">
            <span className="font-semibold text-slate-300">Sample Breakdown:</span>
            {Object.entries(dataset.condition_counts).map(([cond, count]) => (
              <span
                key={cond}
                className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-medium"
              >
                {cond}: <strong className="text-cyan-400">{count}</strong> samples
              </span>
            ))}
            {dataset.is_demo && (
              <span className="ml-auto px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-mono">
                SYNTHETIC BENCHMARK DATASET
              </span>
            )}
          </div>

          {/* Preview Tabs */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              Dataset Preview (First 10 Rows)
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Metadata Preview Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Sample Metadata ({dataset.sample_count} samples)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2">Sample ID</th>
                        <th className="px-3 py-2">Condition</th>
                        <th className="px-3 py-2">Batch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {dataset.metadata_preview.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-900/50">
                          <td className="px-3 py-2 text-cyan-300">{row.sample_id}</td>
                          <td className="px-3 py-2 text-slate-300">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">
                              {row.condition}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-400">{row.batch || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Gene IDs & Survival Preview */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Gene Identifier Samples ({dataset.gene_count} total)
                  </h4>
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-300 max-h-32 overflow-y-auto">
                    {dataset.genes_preview.map((gene, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-300 text-[11px]"
                      >
                        {gene}
                      </span>
                    ))}
                  </div>
                </div>

                {dataset.survival_preview && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Clinical Survival Timeline
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                          <tr>
                            <th className="px-3 py-2">Sample ID</th>
                            <th className="px-3 py-2">Time (Months)</th>
                            <th className="px-3 py-2">Event</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                          {dataset.survival_preview.slice(0, 5).map((row, i) => (
                            <tr key={i} className="hover:bg-slate-900/50">
                              <td className="px-3 py-2 text-cyan-300">{row.sample_id}</td>
                              <td className="px-3 py-2 text-slate-300">{row.time}</td>
                              <td className="px-3 py-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    row.event === 1
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {row.event === 1 ? '1 (Event)' : '0 (Censored)'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
