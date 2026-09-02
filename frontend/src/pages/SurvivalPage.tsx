import React, { useState, useEffect } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { BackButton } from '../components/common/BackButton';
import * as api from '../services/api';
import type { SplitMethod } from '../types';
import {
  Activity,
  Sliders,
  Play,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { AlertBanner } from '../components/common/AlertBanner';
import { StatCard } from '../components/common/StatCard';
import { SurvivalKMPlot } from '../charts/SurvivalKMPlot';

export const SurvivalPage: React.FC = () => {
  const {
    dataset,
    degResults,
    survivalResults,
    setSurvivalResults,
    selectedSurvivalGene,
    setSelectedSurvivalGene,
    setActiveStep,
    loadingState,
    setLoading,
    errorState,
    setError,
    clearErrors,
    isBackendConnected,
  } = useAnalysis();

  const [splitMethod, setSplitMethod] = useState<SplitMethod>('median');
  const [customCutoffInput, setCustomCutoffInput] = useState<string>('');

  // Default to top significant DEG if available, or first gene in dataset
  useEffect(() => {
    if (!selectedSurvivalGene) {
      if (degResults && degResults.results.length > 0) {
        const topSig = degResults.results.find((d) => d.status !== 'NOT_SIG') || degResults.results[0];
        setSelectedSurvivalGene(topSig.gene_id);
      } else if (dataset && dataset.genes_preview.length > 0) {
        setSelectedSurvivalGene(dataset.genes_preview[0]);
      }
    }
  }, [dataset, degResults, selectedSurvivalGene]);

  const executeSurvival = async () => {
    if (!dataset || !selectedSurvivalGene) return;
    clearErrors();
    setLoading('survival', true);

    const customVal =
      splitMethod === 'custom' && customCutoffInput
        ? parseFloat(customCutoffInput)
        : undefined;

    try {
      const response = await api.runSurvival(dataset.dataset_id, {
        gene_id: selectedSurvivalGene,
        split_method: splitMethod,
        custom_cutoff: customVal,
      });
      setSurvivalResults(response);
    } catch (err: any) {
      setError('survival', err.detail || err.message || 'Failed to compute survival analysis.');
    } finally {
      setLoading('survival', false);
    }
  };

  useEffect(() => {
    if (dataset && dataset.has_survival && !survivalResults && selectedSurvivalGene) {
      executeSurvival();
    }
  }, [dataset, selectedSurvivalGene]);

  if (!dataset) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <div className="flex justify-start">
          <BackButton />
        </div>
        <AlertBanner
          type="info"
          title="No Active Dataset"
          message="Please upload a dataset or load the demo dataset before running Survival Analysis."
        />
        <button
          onClick={() => setActiveStep('upload')}
          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
        >
          Go to Step 01: Upload
        </button>
      </div>
    );
  }

  if (!dataset.has_survival) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <div className="flex justify-start">
          <BackButton />
        </div>
        <AlertBanner
          type="warning"
          title="Clinical Survival Metadata Missing"
          message="This dataset does not include clinical survival time and event columns. Survival analysis and Kaplan-Meier curves are only enabled for datasets with clinical follow-up metadata."
        />
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 text-xs text-slate-300 leading-relaxed">
          <h3 className="font-semibold text-sm text-slate-200">How to Enable Survival Analysis:</h3>
          <p>
            When uploading your dataset in Step 01, provide an optional <code className="text-cyan-300">survival.csv</code> or <code className="text-cyan-300">survival.txt</code> file containing:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400 font-mono text-[11px]">
            <li><code>sample_id</code>: matching expression matrix sample column names</li>
            <li><code>time</code>: numeric follow-up duration (e.g. months or days)</li>
            <li><code>event</code>: 0 (censored/alive) or 1 (event/deceased)</li>
          </ul>
          <p className="text-slate-400">
            Alternatively, you can load the <strong>Synthetic Benchmark Demo Dataset</strong> from the Dashboard or Upload page to explore the full survival pipeline.
          </p>
        </div>
        <button
          onClick={() => setActiveStep('results')}
          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          Proceed to Results & Report
        </button>
      </div>
    );
  }

  const isLoading = loadingState['survival'];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                STEP 06
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                Kaplan-Meier Survival Analysis
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Evaluate prognostic biomarker associations, Kaplan-Meier survival curves, Log-rank test, and Cox Proportional Hazards ratio.
            </p>
          </div>
        </div>

        {survivalResults && (
          <button
            onClick={() => setActiveStep('results')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all shrink-0"
          >
            <span>Proceed to Results & Report</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error Alert */}
      {errorState['survival'] && (
        <AlertBanner
          type="error"
          title="Survival Analysis Error"
          message={errorState['survival']}
          onClose={() => setError('survival', null)}
        />
      )}

      {/* Controls Card */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Biomarker Target & Stratification Parameters
          </h3>
          <span className="text-xs text-slate-500">Lifelines Statistics Engine</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Target Gene Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Target Gene Symbol</label>
            <input
              type="text"
              value={selectedSurvivalGene}
              onChange={(e) => setSelectedSurvivalGene(e.target.value.toUpperCase())}
              placeholder="e.g. TP53, EGFR, MYC..."
              className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            {degResults && (
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[10px] text-slate-500">Top DEGs:</span>
                {degResults.results
                  .filter((d) => d.status !== 'NOT_SIG')
                  .slice(0, 5)
                  .map((d) => (
                    <button
                      key={d.gene_id}
                      type="button"
                      onClick={() => setSelectedSurvivalGene(d.gene_id)}
                      className="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono border border-slate-700"
                    >
                      {d.gene_id}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Split Method Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Expression Stratification Cutoff</label>
            <select
              value={splitMethod}
              onChange={(e) => setSplitMethod(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="median">Median Expression (50% High vs 50% Low)</option>
              <option value="tertile">Upper Tertile (Top 33%) vs Lower Tertile (Bottom 33%)</option>
              <option value="custom">Custom Numerical Cutoff</option>
            </select>
          </div>

          {/* Custom Cutoff Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Custom Cutoff Value (log2-CPM)</label>
            <input
              type="number"
              step="0.1"
              value={customCutoffInput}
              onChange={(e) => setCustomCutoffInput(e.target.value)}
              disabled={splitMethod !== 'custom'}
              placeholder="e.g. 5.5"
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-40"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800/80">
          <button
            onClick={executeSurvival}
            disabled={isLoading || !isBackendConnected || !selectedSurvivalGene}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Computing Survival Curves...' : 'Fit Kaplan-Meier & Cox Model'}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {survivalResults && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Log-Rank P-Value"
            value={
              survivalResults.log_rank_p_value < 0.0001
                ? survivalResults.log_rank_p_value.toExponential(3)
                : survivalResults.log_rank_p_value.toFixed(4)
            }
            subtitle={survivalResults.log_rank_p_value < 0.05 ? 'Statistically Significant (p < 0.05)' : 'Not Significant'}
            color={survivalResults.log_rank_p_value < 0.05 ? 'rose' : 'sky'}
            badge={survivalResults.log_rank_p_value < 0.05 ? 'SIGNIFICANT' : 'p ≥ 0.05'}
          />
          <StatCard
            title="Hazard Ratio (HR)"
            value={survivalResults.hazard_ratio.toFixed(2)}
            subtitle={`95% CI: [${survivalResults.hr_ci_lower.toFixed(2)} - ${survivalResults.hr_ci_upper.toFixed(2)}]`}
            color="purple"
            badge="COX PH MODEL"
          />
          <StatCard
            title="Median Survival (High)"
            value={
              survivalResults.high_group.median_survival_time !== null
                ? `${survivalResults.high_group.median_survival_time} mo`
                : 'Not Reached'
            }
            subtitle={`${survivalResults.high_group.sample_count} patients (${survivalResults.high_group.event_count} events)`}
            color="rose"
          />
          <StatCard
            title="Median Survival (Low)"
            value={
              survivalResults.low_group.median_survival_time !== null
                ? `${survivalResults.low_group.median_survival_time} mo`
                : 'Not Reached'
            }
            subtitle={`${survivalResults.low_group.sample_count} patients (${survivalResults.low_group.event_count} events)`}
            color="emerald"
          />
        </div>
      )}

      {/* Kaplan-Meier Plot & Number at Risk */}
      {survivalResults && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Kaplan-Meier Survival Curves & Stratification
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Stratified by expression cutoff ({survivalResults.cutoff_value.toFixed(2)} log2-CPM). Shaded ribbons indicate 95% Hall-Wellner confidence intervals.
              </p>
            </div>
          </div>

          <SurvivalKMPlot data={survivalResults} />

          {/* Number at Risk Table */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Number at Risk Timeline Table
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-center text-xs">
                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left">Timeline (Months)</th>
                    {survivalResults.risk_table.map((row) => (
                      <th key={row.time} className="px-3 py-2 font-mono">
                        {row.time} mo
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  <tr>
                    <td className="px-3 py-2 text-left font-bold text-rose-400">
                      High Expression ({survivalResults.high_group.sample_count})
                    </td>
                    {survivalResults.risk_table.map((row) => (
                      <td key={row.time} className="px-3 py-2 text-slate-200">
                        {row.high_at_risk}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-left font-bold text-sky-400">
                      Low Expression ({survivalResults.low_group.sample_count})
                    </td>
                    {survivalResults.risk_table.map((row) => (
                      <td key={row.time} className="px-3 py-2 text-slate-200">
                        {row.low_at_risk}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Association Disclaimer */}
      {survivalResults && (
        <AlertBanner
          type="info"
          title="Clinical Association & Non-Causality Principle"
          message={survivalResults.association_disclaimer}
        />
      )}
    </div>
  );
};
