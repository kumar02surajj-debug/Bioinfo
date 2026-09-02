import React, { useState, useEffect } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { BackButton } from '../components/common/BackButton';
import * as api from '../services/api';
import {
  BarChart3,
  GitCommit,
  Network,
  ArrowRight,
  RefreshCw,
  Layers,
  Sparkles,
  Table as TableIcon,
} from 'lucide-react';
import { AlertBanner } from '../components/common/AlertBanner';
import { StatCard } from '../components/common/StatCard';
import { LibrarySizeChart } from '../charts/LibrarySizeChart';
import { ExpressionDistributionChart } from '../charts/ExpressionDistributionChart';
import { CorrelationHeatmapChart } from '../charts/CorrelationHeatmapChart';
import { PCAPlot } from '../charts/PCAPlot';

export const QCPage: React.FC = () => {
  const {
    dataset,
    qcResults,
    setQcResults,
    pcaResults,
    setPcaResults,
    setActiveStep,
    loadingState,
    setLoading,
    errorState,
    setError,
    clearErrors,
    isBackendConnected,
  } = useAnalysis();

  const [activeTab, setActiveTab] = useState<'pca' | 'library' | 'distribution' | 'correlation' | 'matrix'>('pca');

  const executeQCAndPCA = async () => {
    if (!dataset) return;
    clearErrors();
    setLoading('qc', true);
    try {
      const [qcRes, pcaRes] = await Promise.all([
        api.runQC(dataset.dataset_id),
        api.runPCA(dataset.dataset_id, { n_components: 3 }),
      ]);
      setQcResults(qcRes);
      setPcaResults(pcaRes);
    } catch (err: any) {
      setError('qc', err.detail || err.message || 'Failed to compute QC and PCA.');
    } finally {
      setLoading('qc', false);
    }
  };

  useEffect(() => {
    if (dataset && (!qcResults || !pcaResults)) {
      executeQCAndPCA();
    }
  }, [dataset]);

  if (!dataset) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <div className="flex justify-start">
          <BackButton />
        </div>
        <AlertBanner
          type="info"
          title="No Active Dataset"
          message="Please upload a dataset or load the demo dataset before running Quality Control & PCA."
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

  const isLoading = loadingState['qc'];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                STEP 02
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                Quality Control & PCA
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Evaluate sequencing depth, zero-count proportions, sample correlations, and dimensional reduction on normalized log2(CPM + 1) counts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={executeQCAndPCA}
            disabled={isLoading || !isBackendConnected}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Re-compute QC</span>
          </button>

          <button
            onClick={() => setActiveStep('differential')}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
          >
            <span>Proceed to Step 03: Differential Expression</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Errors / Loading Alerts */}
      {errorState['qc'] && (
        <AlertBanner
          type="error"
          title="QC Calculation Error"
          message={errorState['qc']}
          onClose={() => setError('qc', null)}
        />
      )}

      {/* Summary Stat Cards */}
      {qcResults && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Genes Evaluated"
            value={qcResults.summary.total_genes.toLocaleString()}
            subtitle="Analyzed Features"
            color="sky"
          />
          <StatCard
            title="Mean Library Size"
            value={Math.round(qcResults.summary.mean_library_size).toLocaleString()}
            subtitle={`Median: ${Math.round(qcResults.summary.median_library_size).toLocaleString()} reads`}
            color="emerald"
          />
          <StatCard
            title="Zero-Count Fraction"
            value={`${(qcResults.summary.zero_fraction_total * 100).toFixed(1)}%`}
            subtitle={`${qcResults.summary.genes_with_zero_counts} genes with 0 reads across all`}
            color="amber"
          />
          <StatCard
            title="Applied Normalization"
            value="log2(CPM + 1)"
            subtitle="Counts Per Million with prior count 1"
            color="purple"
          />
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto scrollbar-none pb-0.5" style={{ WebkitOverflowScrolling: 'touch' }}>
          {[
            { id: 'pca', label: 'PCA Dimensionality Reduction', icon: GitCommit },
            { id: 'library', label: 'Library Size & Sequencing Depth', icon: BarChart3 },
            { id: 'distribution', label: 'Expression Distributions', icon: Layers },
            { id: 'correlation', label: 'Sample Correlation Matrix', icon: Network },
            { id: 'matrix', label: 'Normalized Matrix Table', icon: TableIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all shrink-0 ${
                  isActive
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm font-medium">Computing quality metrics, correlation matrices, and PCA decomposition...</p>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            {activeTab === 'pca' && pcaResults && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <GitCommit className="w-4 h-4 text-cyan-400" />
                      Principal Component Analysis (PCA) Projection
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {pcaResults.normalization_note}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* PCA Plot */}
                  <div className="lg:col-span-2 min-h-[420px]">
                    <PCAPlot data={pcaResults} />
                  </div>

                  {/* Top Loadings Cards */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        Top Gene Loadings for PC1
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-3">
                        Genes driving the largest variance along PC1:
                      </p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {pcaResults.top_loadings_pc1.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono"
                          >
                            <span className="text-cyan-300">{item.gene_id}</span>
                            <span className="text-slate-400">{item.loading.toFixed(4)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        Top Gene Loadings for PC2
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-3">
                        Genes driving secondary variance along PC2:
                      </p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {pcaResults.top_loadings_pc2.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono"
                          >
                            <span className="text-emerald-300">{item.gene_id}</span>
                            <span className="text-slate-400">{item.loading.toFixed(4)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'library' && qcResults && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                      Sequencing Depth & Read Count Distribution
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Check for sample outliers with unusually low or high library sizes.
                    </p>
                  </div>
                </div>
                <div className="min-h-[420px]">
                  <LibrarySizeChart data={qcResults.library_sizes} />
                </div>
              </div>
            )}

            {activeTab === 'distribution' && qcResults && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      Normalized Expression Distributions Across Samples
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Box plots showing quartiles and median expression values post log2(CPM+1) normalization.
                    </p>
                  </div>
                </div>
                <div className="min-h-[420px]">
                  <ExpressionDistributionChart data={qcResults.expression_distributions} />
                </div>
              </div>
            )}

            {activeTab === 'correlation' && qcResults && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Network className="w-4 h-4 text-purple-400" />
                      Sample-to-Sample Correlation Heatmap
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Pairwise Pearson correlation coefficients (r) evaluated on normalized expression profiles.
                    </p>
                  </div>
                </div>
                <div className="min-h-[480px]">
                  <CorrelationHeatmapChart data={qcResults.correlation} />
                </div>
              </div>
            )}

            {activeTab === 'matrix' && qcResults && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <TableIcon className="w-4 h-4 text-cyan-400" />
                      Normalized Count Matrix Preview (log2(CPM + 1))
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Preview of the transformed expression matrix passed down to Differential Expression and Clustering.
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 font-mono">
                      <tr>
                        <th className="px-3 py-2 text-cyan-300">Gene ID</th>
                        {qcResults.transformed_matrix_preview.samples.map((s) => (
                          <th key={s} className="px-3 py-2 text-slate-300">
                            {s}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {qcResults.transformed_matrix_preview.genes.map((gene, rowIdx) => (
                        <tr key={gene} className="hover:bg-slate-900/50">
                          <td className="px-3 py-2 text-cyan-300 font-semibold">{gene}</td>
                          {qcResults.transformed_matrix_preview.values[rowIdx].map((val, colIdx) => (
                            <td key={colIdx} className="px-3 py-2 text-slate-300">
                              {val.toFixed(2)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
