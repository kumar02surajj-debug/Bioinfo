import React, { useState, useEffect } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { BackButton } from '../components/common/BackButton';
import * as api from '../services/api';
import {
  Grid3X3,
  Sliders,
  Play,
  ArrowRight,
  Download,
  Search,
} from 'lucide-react';
import { AlertBanner } from '../components/common/AlertBanner';
import { StatCard } from '../components/common/StatCard';
import { ClusterHeatmap } from '../charts/ClusterHeatmap';

export const ClusteringPage: React.FC = () => {
  const {
    dataset,
    degResults,
    clusteringResults,
    setClusteringResults,
    setActiveStep,
    loadingState,
    setLoading,
    errorState,
    setError,
    clearErrors,
    isBackendConnected,
  } = useAnalysis();

  const [topNSelection, setTopNSelection] = useState<string>('50');
  const [distanceMetric, setDistanceMetric] = useState<string>('euclidean');
  const [linkageMethod, setLinkageMethod] = useState<string>('average');
  const [customGeneInput, setCustomGeneInput] = useState<string>('');
  const [geneSearch, setGeneSearch] = useState<string>('');

  const executeClustering = async () => {
    if (!dataset) return;
    clearErrors();
    setLoading('clustering', true);

    const degTopN = topNSelection === 'all' ? 'all' : parseInt(topNSelection, 10);
    const customList =
      topNSelection === 'custom'
        ? customGeneInput
            .split(/[\s,;\n]+/)
            .map((g) => g.trim())
            .filter(Boolean)
        : [];

    try {
      const response = await api.runClustering(dataset.dataset_id, {
        deg_top_n: degTopN,
        distance_metric: distanceMetric,
        linkage_method: linkageMethod,
        custom_genes: customList,
      });
      setClusteringResults(response);
    } catch (err: any) {
      setError('clustering', err.detail || err.message || 'Failed to compute clustering.');
    } finally {
      setLoading('clustering', false);
    }
  };

  useEffect(() => {
    if (dataset && !clusteringResults) {
      executeClustering();
    }
  }, [dataset, degResults]);

  if (!dataset) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <div className="flex justify-start">
          <BackButton />
        </div>
        <AlertBanner
          type="info"
          title="No Active Dataset"
          message="Please upload a dataset or load the demo dataset before running Hierarchical Clustering."
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

  const isLoading = loadingState['clustering'];

  const exportHeatmapMatrixCSV = () => {
    if (!clusteringResults) return;
    const header = ['Gene_ID', ...clusteringResults.sample_ids].join(',');
    const rows = clusteringResults.gene_ids.map((gene, rIdx) => {
      const vals = clusteringResults.z_scores[rIdx].join(',');
      return `"${gene}",${vals}`;
    });
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transcriptox_heatmap_matrix_${clusteringResults.gene_ids.length}_genes.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                STEP 04
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                Hierarchical Clustering & Heatmap
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Standardize gene expression across samples to Z-scores and cluster co-expressed gene modules and phenotype groups.
            </p>
          </div>
        </div>

        {clusteringResults && (
          <button
            onClick={() => setActiveStep('enrichment')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all shrink-0"
          >
            <span>Proceed to Step 05: Pathway Enrichment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error Banner */}
      {errorState['clustering'] && (
        <AlertBanner
          type="error"
          title="Clustering Error"
          message={errorState['clustering']}
          onClose={() => setError('clustering', null)}
        />
      )}

      {/* Parameter Controls */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Clustering Parameters & Gene Selection
          </h3>
          <span className="text-xs text-slate-500">
            {degResults ? `Auto-consuming from ${degResults.up_regulated_count + degResults.down_regulated_count} significant DEGs` : 'Using top variable genes'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Gene Set Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Gene Subset</label>
            <select
              value={topNSelection}
              onChange={(e) => setTopNSelection(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="20">Top 20 DEGs</option>
              <option value="50">Top 50 DEGs (Default)</option>
              <option value="100">Top 100 DEGs</option>
              <option value="all">All Significant DEGs</option>
              <option value="custom">Custom Gene Identifier List</option>
            </select>
          </div>

          {/* Distance Metric */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Distance Metric</label>
            <select
              value={distanceMetric}
              onChange={(e) => setDistanceMetric(e.target.value)}
              disabled={linkageMethod === 'ward'}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            >
              <option value="euclidean">Euclidean Distance</option>
              <option value="correlation">Correlation Distance (1 - r)</option>
              <option value="cosine">Cosine Distance</option>
            </select>
          </div>

          {/* Linkage Method */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Linkage Method</label>
            <select
              value={linkageMethod}
              onChange={(e) => {
                setLinkageMethod(e.target.value);
                if (e.target.value === 'ward') setDistanceMetric('euclidean');
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="average">Average Linkage (UPGMA)</option>
              <option value="complete">Complete Linkage (Maximum)</option>
              <option value="ward">Ward (Minimum Variance)</option>
              <option value="single">Single Linkage (Minimum)</option>
            </select>
          </div>

          {/* Search Gene within Heatmap */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Highlight Gene in Plot</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={geneSearch}
                onChange={(e) => setGeneSearch(e.target.value.toUpperCase())}
                placeholder="e.g. TP53, EGFR..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Custom Genes Input if selected */}
        {topNSelection === 'custom' && (
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <label className="text-xs font-semibold text-slate-300">
              Enter Gene Symbols (comma, space, or newline separated)
            </label>
            <textarea
              rows={2}
              value={customGeneInput}
              onChange={(e) => setCustomGeneInput(e.target.value)}
              placeholder="TP53, EGFR, MYC, VEGFA, TNF, IL6, STAT1, CDK1, BRCA1..."
              className="w-full p-3 text-xs font-mono rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-800/80">
          <button
            onClick={executeClustering}
            disabled={isLoading || !isBackendConnected}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Recomputing Dendrograms...' : 'Re-cluster & Update Heatmap'}</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      {clusteringResults && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Clustered Genes"
            value={clusteringResults.gene_ids.length}
            subtitle="Rows in Heatmap"
            color="purple"
          />
          <StatCard
            title="Clustered Samples"
            value={clusteringResults.sample_ids.length}
            subtitle="Columns in Heatmap"
            color="sky"
          />
          <StatCard
            title="Distance Metric"
            value={clusteringResults.distance_metric.toUpperCase()}
            subtitle={`Linkage: ${clusteringResults.linkage_method}`}
            color="emerald"
          />
          <StatCard
            title="Z-Score Range"
            value="[-2.5, +2.5]"
            subtitle="Standardized Row Expression"
            color="amber"
          />
        </div>
      )}

      {/* Heatmap & Annotation Bar Section */}
      {clusteringResults && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Grid3X3 className="w-4 h-4 text-cyan-400" />
                Dendrogram-Ordered Heatmap Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Genes and samples are ordered by hierarchical tree linkage leaves.
              </p>
            </div>

            <button
              onClick={exportHeatmapMatrixCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Z-Score Matrix (CSV)</span>
            </button>
          </div>

          {/* Sample Condition Annotation Bar */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
              Sample Condition Ordering (Columns Left to Right):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {clusteringResults.sample_ids.map((s, idx) => {
                const cond = clusteringResults.sample_conditions[idx];
                const isCtrl = cond.toLowerCase().includes('ctrl') || cond.toLowerCase().includes('control');
                return (
                  <div
                    key={s}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono border ${
                      isCtrl
                        ? 'bg-sky-950/60 text-sky-300 border-sky-500/30'
                        : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    <span className="font-bold">{s}</span>
                    <span className="opacity-70">({cond})</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Plot */}
          <ClusterHeatmap
            data={clusteringResults}
            highlightGene={geneSearch}
          />
        </div>
      )}
    </div>
  );
};
