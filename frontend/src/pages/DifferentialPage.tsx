import React, { useState, useEffect, useMemo } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { BackButton } from '../components/common/BackButton';
import * as api from '../services/api';
import type { DEGItem, RegulationStatus } from '../types';
import {
  Scale,
  Play,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { AlertBanner } from '../components/common/AlertBanner';
import { StatCard } from '../components/common/StatCard';
import { VolcanoPlot } from '../charts/VolcanoPlot';
import { MAPlot } from '../charts/MAPlot';
import { DataTable, type ColumnDef } from '../components/common/DataTable';

export const DifferentialPage: React.FC = () => {
  const {
    dataset,
    degResults,
    setDegResults,
    setActiveStep,
    selectedControl,
    setSelectedControl,
    selectedTreatment,
    setSelectedTreatment,
    log2fcCutoff,
    setLog2fcCutoff,
    fdrCutoff,
    setFdrCutoff,
    loadingState,
    setLoading,
    errorState,
    setError,
    clearErrors,
    isBackendConnected,
  } = useAnalysis();

  const [plotType, setPlotType] = useState<'volcano' | 'ma'>('volcano');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RegulationStatus>('ALL');

  const executeDEG = async () => {
    if (!dataset || !selectedControl || !selectedTreatment) return;
    clearErrors();
    setLoading('deg', true);
    try {
      const response = await api.runDifferentialExpression(dataset.dataset_id, {
        control_group: selectedControl,
        treatment_group: selectedTreatment,
        log2fc_threshold: log2fcCutoff,
        fdr_threshold: fdrCutoff,
      });
      setDegResults(response);
    } catch (err: any) {
      setError('deg', err.detail || err.message || 'Failed to compute differential expression.');
    } finally {
      setLoading('deg', false);
    }
  };

  useEffect(() => {
    if (dataset && !degResults && selectedControl && selectedTreatment) {
      executeDEG();
    }
  }, [dataset, selectedControl, selectedTreatment]);

  if (!dataset) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <div className="flex justify-start">
          <BackButton />
        </div>
        <AlertBanner
          type="info"
          title="No Active Dataset"
          message="Please upload a dataset or load the demo dataset before running Differential Expression."
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

  const isLoading = loadingState['deg'];

  // Filter table data by status
  const filteredTableData = useMemo(() => {
    if (!degResults) return [];
    if (statusFilter === 'ALL') return degResults.results;
    return degResults.results.filter((d) => d.status === statusFilter);
  }, [degResults, statusFilter]);

  const columns: ColumnDef<DEGItem>[] = [
    {
      key: 'gene_id',
      header: 'Gene ID',
      sortable: true,
      render: (row) => <span className="font-semibold text-cyan-300">{row.gene_id}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => {
        if (row.status === 'UP') {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-semibold">
              <TrendingUp className="w-3 h-3" /> UP
            </span>
          );
        }
        if (row.status === 'DOWN') {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-semibold">
              <TrendingDown className="w-3 h-3" /> DOWN
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px]">
            <Minus className="w-3 h-3" /> NOT SIG
          </span>
        );
      },
    },
    {
      key: 'log2fc',
      header: 'log2FC',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span
          className={`font-semibold ${
            row.status === 'UP'
              ? 'text-rose-400'
              : row.status === 'DOWN'
              ? 'text-sky-400'
              : 'text-slate-300'
          }`}
        >
          {row.log2fc > 0 ? `+${row.log2fc.toFixed(3)}` : row.log2fc.toFixed(3)}
        </span>
      ),
    },
    {
      key: 'adj_p_value',
      header: 'FDR (adj. p)',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className={row.adj_p_value < fdrCutoff ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
          {row.adj_p_value < 0.0001 ? row.adj_p_value.toExponential(3) : row.adj_p_value.toFixed(4)}
        </span>
      ),
    },
    {
      key: 'p_value',
      header: 'p-value',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="text-slate-400">
          {row.p_value < 0.0001 ? row.p_value.toExponential(3) : row.p_value.toFixed(4)}
        </span>
      ),
    },
    {
      key: 'base_mean',
      header: 'Mean Expr',
      sortable: true,
      align: 'right',
      render: (row) => row.base_mean.toFixed(2),
    },
    {
      key: 'mean_control',
      header: `Mean (${degResults?.control_group || 'Ctrl'})`,
      sortable: true,
      align: 'right',
      render: (row) => row.mean_control.toFixed(2),
    },
    {
      key: 'mean_treatment',
      header: `Mean (${degResults?.treatment_group || 'Trt'})`,
      sortable: true,
      align: 'right',
      render: (row) => row.mean_treatment.toFixed(2),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                STEP 03
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                Differential Gene Expression
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Detect significantly up- and down-regulated genes with Welch's t-test and Benjamini-Hochberg FDR correction.
            </p>
          </div>
        </div>

        {degResults && (
          <button
            onClick={() => setActiveStep('clustering')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all shrink-0"
          >
            <span>Proceed to Step 04: Clustering</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error alert */}
      {errorState['deg'] && (
        <AlertBanner
          type="error"
          title="Differential Analysis Error"
          message={errorState['deg']}
          onClose={() => setError('deg', null)}
        />
      )}

      {/* Contrast & Threshold Controls Card */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Comparison Contrast & Significance Thresholds
          </h3>
          <span className="text-xs text-slate-500">
            {dataset.sample_count} samples across {dataset.conditions.length} condition groups
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Control Group Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Baseline / Control Group</label>
            <select
              value={selectedControl}
              onChange={(e) => setSelectedControl(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {dataset.conditions.map((cond) => (
                <option key={cond} value={cond}>
                  {cond} ({dataset.condition_counts[cond] || 0} samples)
                </option>
              ))}
            </select>
          </div>

          {/* Treatment Group Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Comparison / Treatment Group</label>
            <select
              value={selectedTreatment}
              onChange={(e) => setSelectedTreatment(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {dataset.conditions.map((cond) => (
                <option key={cond} value={cond} disabled={cond === selectedControl}>
                  {cond} ({dataset.condition_counts[cond] || 0} samples)
                </option>
              ))}
            </select>
          </div>

          {/* Log2FC Threshold Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-300">|log2FC| Cutoff</label>
              <span className="font-mono text-cyan-400 font-bold">{log2fcCutoff.toFixed(2)} ({(Math.pow(2, log2fcCutoff)).toFixed(1)}x)</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="3.0"
              step="0.25"
              value={log2fcCutoff}
              onChange={(e) => setLog2fcCutoff(parseFloat(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          {/* FDR Cutoff Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-300">FDR (q-value) Cutoff</label>
              <span className="font-mono text-cyan-400 font-bold">{fdrCutoff}</span>
            </div>
            <input
              type="range"
              min="0.001"
              max="0.1"
              step="0.005"
              value={fdrCutoff}
              onChange={(e) => setFdrCutoff(parseFloat(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800/80">
          <button
            onClick={executeDEG}
            disabled={isLoading || !isBackendConnected || selectedControl === selectedTreatment}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Recalculating DEGs...' : 'Apply Thresholds & Calculate DEGs'}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {degResults && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Tested Genes"
            value={degResults.total_tested_genes.toLocaleString()}
            subtitle={`${degResults.treatment_group} vs ${degResults.control_group}`}
            color="sky"
          />
          <StatCard
            title="Up-regulated DEGs"
            value={degResults.up_regulated_count}
            subtitle={`log2FC ≥ +${degResults.log2fc_threshold} & FDR ≤ ${degResults.fdr_threshold}`}
            color="rose"
            badge="UP-REGULATED"
          />
          <StatCard
            title="Down-regulated DEGs"
            value={degResults.down_regulated_count}
            subtitle={`log2FC ≤ -${degResults.log2fc_threshold} & FDR ≤ ${degResults.fdr_threshold}`}
            color="sky"
            badge="DOWN-REGULATED"
          />
          <StatCard
            title="Total Significant DEGs"
            value={degResults.up_regulated_count + degResults.down_regulated_count}
            subtitle={`${degResults.not_sig_count} not significant`}
            color="emerald"
            badge="TOTAL DEGs"
          />
        </div>
      )}

      {/* Visual Volcano & MA Plot Section */}
      {degResults && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400" />
              Differential Expression Visualizations
            </h3>
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                onClick={() => setPlotType('volcano')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  plotType === 'volcano'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Volcano Plot
              </button>
              <button
                onClick={() => setPlotType('ma')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  plotType === 'ma'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                MA Plot
              </button>
            </div>
          </div>

          <div className="min-h-[440px]">
            {plotType === 'volcano' ? (
              <VolcanoPlot
                data={degResults.results}
                log2fcCutoff={degResults.log2fc_threshold}
                fdrCutoff={degResults.fdr_threshold}
              />
            ) : (
              <MAPlot
                data={degResults.results}
                log2fcCutoff={degResults.log2fc_threshold}
              />
            )}
          </div>
        </div>
      )}

      {/* Interactive Searchable DEG Table */}
      {degResults && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Differentially Expressed Genes Master Table
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Sorted by FDR adjusted p-value ascending. Use search or filter by regulation state.
              </p>
            </div>
          </div>

          <DataTable
            data={filteredTableData}
            columns={columns}
            searchPlaceholder="Search gene identifier (e.g. TP53, EGFR)..."
            searchKey="gene_id"
            filename={`transcriptox_deg_${degResults.treatment_group}_vs_${degResults.control_group}.csv`}
            pageSize={12}
            extraFilter={
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px]">Filter:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-2 py-1 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-300 focus:outline-none"
                >
                  <option value="ALL">All Genes ({degResults.results.length})</option>
                  <option value="UP">Up-regulated ({degResults.up_regulated_count})</option>
                  <option value="DOWN">Down-regulated ({degResults.down_regulated_count})</option>
                  <option value="NOT_SIG">Not Significant ({degResults.not_sig_count})</option>
                </select>
              </div>
            }
          />
        </div>
      )}

      {/* Methodology Alert */}
      {degResults && (
        <AlertBanner
          type="info"
          title="Methodological Transparency & Approximation Notice"
          message={degResults.methodology_note}
        />
      )}
    </div>
  );
};
