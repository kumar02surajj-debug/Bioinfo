import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Edit3,
  Sparkles,
  AlertCircle,
  Plus,
  Search,
  RotateCcw,
  Check,
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

  const [sampleConditions, setSampleConditions] = useState<Record<string, string>>({});
  const [isEditingGroups, setIsEditingGroups] = useState<boolean>(false);
  const [newConditionName, setNewConditionName] = useState<string>('');
  const [sampleSearch, setSampleSearch] = useState<string>('');
  const [bulkCondition, setBulkCondition] = useState<string>('');

  const exprInputRef = useRef<HTMLInputElement>(null);
  const metaInputRef = useRef<HTMLInputElement>(null);
  const survInputRef = useRef<HTMLInputElement>(null);

  // Synchronize sampleConditions when dataset changes
  useEffect(() => {
    if (dataset) {
      if (dataset.requires_group_confirmation) {
        const initial: Record<string, string> = {};
        for (const s of dataset.samples) {
          initial[s] = (dataset.suggested_groups && dataset.suggested_groups[s]) || '';
        }
        setSampleConditions(initial);
        setIsEditingGroups(true);
      } else {
        const initial: Record<string, string> = {};
        for (const m of dataset.metadata_preview) {
          initial[m.sample_id] = m.condition;
        }
        // Ensure all samples are present
        for (const s of dataset.samples) {
          if (!initial[s]) initial[s] = '';
        }
        setSampleConditions(initial);
        setIsEditingGroups(false);
      }
    } else {
      setSampleConditions({});
      setIsEditingGroups(false);
    }
  }, [dataset]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (!expressionFile) {
      setError('upload', 'Please select an Expression Matrix (.csv or .txt) file.');
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
      setIsEditingGroups(false);
    } catch (err: any) {
      setError('upload', err.detail || err.message || 'Failed to load demo dataset.');
    } finally {
      setLoading('demo', false);
    }
  };

  const handleConfirmMetadata = async () => {
    if (!dataset) return;
    clearErrors();

    // Verify all samples have conditions
    const missing = dataset.samples.filter((s) => !sampleConditions[s] || !sampleConditions[s].trim());
    if (missing.length > 0) {
      setError('confirm_metadata', `Please assign a condition to all samples. Missing: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`);
      return;
    }

    const uniqueConds = Array.from(new Set(Object.values(sampleConditions).map((c) => c.trim()).filter(Boolean)));
    if (uniqueConds.length < 2) {
      setError('confirm_metadata', 'At least 2 distinct condition groups (e.g. Control vs Treatment) are required for differential expression.');
      return;
    }

    setLoading('confirm_metadata', true);
    try {
      const response = await api.confirmMetadata(dataset.dataset_id, sampleConditions);
      setDataset(response);
      setIsEditingGroups(false);
    } catch (err: any) {
      setError('confirm_metadata', err.detail || err.message || 'Failed to confirm sample condition assignments.');
    } finally {
      setLoading('confirm_metadata', false);
    }
  };

  const handleAddCondition = () => {
    const trimmed = newConditionName.trim();
    if (!trimmed) return;
    setNewConditionName('');
  };

  const handleResetToDetected = () => {
    if (dataset && dataset.suggested_groups) {
      const resetMap: Record<string, string> = {};
      for (const s of dataset.samples) {
        resetMap[s] = dataset.suggested_groups[s] || '';
      }
      setSampleConditions(resetMap);
    }
  };

  // Derived state for condition analysis
  const currentConditionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let unassigned = 0;
    for (const s of (dataset?.samples || [])) {
      const cond = sampleConditions[s]?.trim();
      if (cond) {
        counts[cond] = (counts[cond] || 0) + 1;
      } else {
        unassigned++;
      }
    }
    return { counts, unassigned };
  }, [dataset, sampleConditions]);

  const knownConditions = useMemo(() => {
    const condSet = new Set<string>();
    if (dataset?.conditions) {
      dataset.conditions.forEach((c) => condSet.add(c));
    }
    if (dataset?.suggested_groups) {
      Object.values(dataset.suggested_groups).forEach((c) => condSet.add(c));
    }
    Object.values(sampleConditions).forEach((c) => {
      if (c.trim()) condSet.add(c.trim());
    });
    return Array.from(condSet);
  }, [dataset, sampleConditions]);

  const filteredSamples = useMemo(() => {
    if (!dataset) return [];
    if (!sampleSearch.trim()) return dataset.samples;
    const query = sampleSearch.toLowerCase();
    return dataset.samples.filter(
      (s) => s.toLowerCase().includes(query) || (sampleConditions[s] || '').toLowerCase().includes(query)
    );
  }, [dataset, sampleSearch, sampleConditions]);

  const allAssigned = dataset ? dataset.samples.every((s) => Boolean(sampleConditions[s]?.trim())) : false;
  const distinctGroupCount = Object.keys(currentConditionCounts.counts).length;
  const isAssignmentValid = allAssigned && distinctGroupCount >= 2;

  const handleBulkAssign = (condToAssign: string) => {
    if (!condToAssign.trim()) return;
    setSampleConditions((prev) => {
      const next = { ...prev };
      for (const s of filteredSamples) {
        next[s] = condToAssign.trim();
      }
      return next;
    });
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
              Upload your RNA-seq count matrix to start. Sample groups are auto-detected from column names, or you can upload an optional metadata CSV.
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
          title="Dataset Ingestion Error"
          message={errorState['upload']}
          onClose={() => setError('upload', null)}
        />
      )}

      {errorState['confirm_metadata'] && (
        <AlertBanner
          type="error"
          title="Condition Assignment Error"
          message={errorState['confirm_metadata']}
          onClose={() => setError('confirm_metadata', null)}
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
        {/* Expression Matrix Dropzone (Required) */}
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
            Gene expression count matrix with gene IDs as rows and sample IDs as columns (e.g. <code className="text-cyan-300">Control_1</code>, <code className="text-cyan-300">SALS_1</code>).
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
              <span>Select expression matrix (.csv or .txt)</span>
              <span className="text-[10px] text-slate-600">Genes x Samples table</span>
            </button>
          )}
        </div>

        {/* Sample Metadata Dropzone (Optional) */}
        <div
          className={`p-6 rounded-2xl border transition-all ${
            metadataFile
              ? 'bg-emerald-950/20 border-emerald-500/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              2. Sample Metadata
            </h3>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Optional
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-2 leading-relaxed">
            Optional separate metadata CSV. If omitted, sample groups will be automatically inferred or assigned interactively below.
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
              <span>Select optional metadata file (.csv or .txt)</span>
              <span className="text-[10px] text-slate-600">Skips interactive group confirmation</span>
            </button>
          )}
        </div>

        {/* Survival Timeline Dropzone (Optional) */}
        <div
          className={`p-6 rounded-2xl border transition-all ${
            survivalFile
              ? 'bg-rose-950/20 border-rose-500/40'
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
            Table containing <code className="text-slate-300">sample_id</code>, <code className="text-slate-300">time</code>, and <code className="text-slate-300">event</code> (0=censored, 1=event).
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
      {expressionFile && (
        <div className="flex justify-end">
          <button
            onClick={handleFileUpload}
            disabled={loadingState['upload'] || !isBackendConnected}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>{loadingState['upload'] ? 'Validating Matrix & Detecting Groups...' : 'Validate & Ingest Dataset'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* INTERACTIVE SAMPLE GROUP CONFIRMATION / MANUAL ASSIGNMENT CARD */}
      {dataset && (dataset.requires_group_confirmation || isEditingGroups) && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border-2 border-cyan-500/40 shadow-xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                {dataset.group_pattern_detected ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Auto-Detected Group Pattern
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    Manual Group Assignment
                  </span>
                )}
                <h2 className="text-xl font-bold text-slate-100">
                  {dataset.group_pattern_detected
                    ? 'Review & Confirm Sample Condition Groups'
                    : 'Assign Biological Conditions to Samples'}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {dataset.group_pattern_detected
                  ? 'We inferred sample groups from your column headers. Please confirm the assignments or adjust individual samples before proceeding.'
                  : 'No automatic group pattern was detected. Please assign each sample to a condition group (minimum 2 distinct groups required).'}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {dataset.suggested_groups && Object.keys(dataset.suggested_groups).length > 0 && (
                <button
                  type="button"
                  onClick={handleResetToDetected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Detected</span>
                </button>
              )}
              {!dataset.requires_group_confirmation && isEditingGroups && (
                <button
                  type="button"
                  onClick={() => setIsEditingGroups(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Condition Tag Manager & Summary */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Current Groups:</span>
                {Object.entries(currentConditionCounts.counts).map(([cond, count]) => (
                  <span
                    key={cond}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-200 text-xs font-medium"
                  >
                    <span>{cond}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                      {count}
                    </span>
                  </span>
                ))}
                {currentConditionCounts.unassigned > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs font-medium">
                    <span>Unassigned</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                      {currentConditionCounts.unassigned}
                    </span>
                  </span>
                )}
              </div>

              {/* Quick Add Custom Condition */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New group name (e.g. Treated)"
                  value={newConditionName}
                  onChange={(e) => setNewConditionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCondition();
                    }
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 w-44"
                />
                <button
                  type="button"
                  onClick={handleAddCondition}
                  disabled={!newConditionName.trim()}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-xs font-semibold disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Tag</span>
                </button>
              </div>
            </div>

            {/* Quick Bulk Assign */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-900 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search sample name..."
                  value={sampleSearch}
                  onChange={(e) => setSampleSearch(e.target.value)}
                  className="px-2 py-0.5 text-xs rounded bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-500 w-40"
                />
                {sampleSearch && (
                  <span className="text-[11px] text-slate-500">
                    Showing {filteredSamples.length} of {dataset.samples.length} samples
                  </span>
                )}
              </div>

              {knownConditions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px]">Set filtered samples to:</span>
                  <select
                    value={bulkCondition}
                    onChange={(e) => {
                      setBulkCondition(e.target.value);
                      if (e.target.value) {
                        handleBulkAssign(e.target.value);
                        setBulkCondition('');
                      }
                    }}
                    className="px-2 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Choose group to apply --</option>
                    {knownConditions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Samples Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 max-h-96 overflow-y-auto">
            <datalist id="conditions-datalist">
              {knownConditions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 w-12 text-slate-500">#</th>
                  <th className="px-3 py-2">Sample ID</th>
                  <th className="px-3 py-2">Assigned Condition Group</th>
                  <th className="px-3 py-2">Quick Assign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredSamples.map((sample, idx) => {
                  const assigned = sampleConditions[sample] || '';
                  const isMissing = !assigned.trim();

                  return (
                    <tr key={sample} className="hover:bg-slate-900/50">
                      <td className="px-3 py-2 text-slate-600 font-sans">{idx + 1}</td>
                      <td className="px-3 py-2 text-cyan-300 font-semibold">{sample}</td>
                      <td className="px-3 py-2 font-sans">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            list="conditions-datalist"
                            placeholder="Enter condition group (e.g. Control, SALS)"
                            value={assigned}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSampleConditions((prev) => ({
                                ...prev,
                                [sample]: val,
                              }));
                            }}
                            className={`w-64 px-3 py-1.5 text-xs rounded-lg bg-slate-900 border text-slate-200 focus:outline-none transition-colors ${
                              isMissing
                                ? 'border-amber-500/50 bg-amber-950/10 focus:border-amber-400'
                                : 'border-slate-700 focus:border-cyan-500'
                            }`}
                          />
                          {isMissing ? (
                            <span className="text-[10px] text-amber-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Required
                            </span>
                          ) : (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-sans">
                        <div className="flex flex-wrap gap-1">
                          {knownConditions.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() =>
                                setSampleConditions((prev) => ({
                                  ...prev,
                                  [sample]: c,
                                }))
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                                assigned === c
                                  ? 'bg-cyan-500 text-slate-950 font-bold'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Validation Feedback & Confirmation Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400 space-y-1">
              {!allAssigned && (
                <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>
                    {currentConditionCounts.unassigned} of {dataset.samples.length} samples still need a condition assignment.
                  </span>
                </div>
              )}
              {allAssigned && distinctGroupCount < 2 && (
                <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>
                    At least 2 distinct condition groups required for differential expression (currently {distinctGroupCount}).
                  </span>
                </div>
              )}
              {isAssignmentValid && (
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    Ready to confirm: {dataset.samples.length} samples assigned across {distinctGroupCount} distinct condition groups.
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleConfirmMetadata}
              disabled={!isAssignmentValid || loadingState['confirm_metadata']}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {loadingState['confirm_metadata']
                  ? 'Applying Condition Metadata...'
                  : 'Confirm & Generate Metadata'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMED DATASET INSPECTION & VALIDATION SUMMARY */}
      {dataset && !dataset.requires_group_confirmation && !isEditingGroups && (
        <div className="space-y-6 pt-4 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-bold text-slate-100">Dataset Validation Succeeded</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Data structure & sample condition metadata validated. Ready for Quality Control & Differential Expression.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsEditingGroups(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Edit Condition Groups</span>
              </button>

              <button
                onClick={() => setActiveStep('qc')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <span>Proceed to Step 02: QC & PCA</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
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

