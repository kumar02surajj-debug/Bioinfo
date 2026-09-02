import React, { useState, useEffect } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { BackButton } from '../components/common/BackButton';
import * as api from '../services/api';
import type { PathwayItem, RegulationFilter } from '../types';
import {
  Network,
  Sliders,
  Play,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { AlertBanner } from '../components/common/AlertBanner';
import { SessionRecoveryBanner } from '../components/common/SessionRecoveryBanner';
import { StatCard } from '../components/common/StatCard';
import { EnrichmentDotPlot } from '../charts/EnrichmentDotPlot';
import { EnrichmentBarChart } from '../charts/EnrichmentBarChart';
import { DataTable, type ColumnDef } from '../components/common/DataTable';

export const EnrichmentPage: React.FC = () => {
  const {
    dataset,
    degResults,
    enrichmentResults,
    setEnrichmentResults,
    setActiveStep,
    loadingState,
    setLoading,
    errorState,
    setError,
    clearErrors,
    isBackendConnected,
  } = useAnalysis();

  const [database, setDatabase] = useState<string>('GO_Biological_Process');
  const [organism, setOrganism] = useState<string>('Human');
  const [regulationFilter, setRegulationFilter] = useState<RegulationFilter>('ALL');
  const [plotType, setPlotType] = useState<'dot' | 'bar'>('dot');

  const executeEnrichment = async () => {
    if (!dataset) return;
    clearErrors();
    setLoading('enrichment', true);
    try {
      const response = await api.runEnrichment(dataset.dataset_id, {
        database: database,
        organism: organism,
        regulation_filter: regulationFilter,
      });
      setEnrichmentResults(response);
      if (response.service_status === 'error') {
        setError('enrichment', response.service_message || 'Enrichment service error.');
      }
    } catch (err: any) {
      setError('enrichment', err.detail || err.message || 'Failed to compute pathway enrichment.');
    } finally {
      setLoading('enrichment', false);
    }
  };

  useEffect(() => {
    if (dataset && !enrichmentResults) {
      executeEnrichment();
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
          message="Please upload a dataset or load the demo dataset before running Pathway Enrichment."
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

  const isLoading = loadingState['enrichment'];

  const columns: ColumnDef<PathwayItem>[] = [
    {
      key: 'term',
      header: 'Pathway / GO Term',
      sortable: true,
      render: (row) => (
        <div className="max-w-md">
          <span className="font-semibold text-slate-200">{row.term}</span>
        </div>
      ),
    },
    {
      key: 'overlap',
      header: 'Overlap (k/K)',
      sortable: true,
      align: 'center',
      render: (row) => (
        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 text-[11px] font-mono">
          {row.overlap}
        </span>
      ),
    },
    {
      key: 'gene_ratio',
      header: 'Gene Ratio',
      sortable: true,
      align: 'right',
      render: (row) => `${(row.gene_ratio * 100).toFixed(1)}%`,
    },
    {
      key: 'adj_p_value',
      header: 'FDR (adj. p)',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className={row.adj_p_value < 0.05 ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
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
      key: 'combined_score',
      header: 'Combined Score',
      sortable: true,
      align: 'right',
      render: (row) => (row.combined_score ? row.combined_score.toFixed(1) : 'N/A'),
    },
    {
      key: 'genes',
      header: 'Overlapping Genes',
      sortable: false,
      render: (row) => (
        <div className="flex flex-wrap gap-1 max-w-sm">
          {row.genes.slice(0, 5).map((g) => (
            <span key={g} className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 text-[10px] font-mono">
              {g}
            </span>
          ))}
          {row.genes.length > 5 && (
            <span className="text-[10px] text-slate-500 font-mono">+{row.genes.length - 5} more</span>
          )}
        </div>
      ),
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
                STEP 05
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                Functional Pathway Enrichment
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Over-representation analysis against Gene Ontology (BP, MF, CC), KEGG, and Reactome knowledgebases.
            </p>
          </div>
        </div>

        {dataset.has_survival ? (
          <button
            onClick={() => setActiveStep('survival')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all shrink-0"
          >
            <span>Proceed to Step 06: Survival Analysis</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setActiveStep('results')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all shrink-0"
          >
            <span>Proceed to Results & Report</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Loading Progress Banner */}
      {isLoading && (
        <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 backdrop-blur-md flex items-center gap-3 shadow-lg">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-cyan-300">Computing Functional Pathway Enrichment...</span>
            <span className="opacity-80 block text-[11px] mt-0.5">
              Querying Gene Ontology, KEGG, and Reactome database annotations for significant DEGs. This may take 5-15 seconds.
            </span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorState['enrichment'] && (
        <div className="space-y-3">
          <AlertBanner
            type="error"
            title="Enrichment Error"
            message={errorState['enrichment']}
            onClose={() => setError('enrichment', null)}
          />
          <SessionRecoveryBanner
            error={errorState['enrichment']}
            onClearError={() => setError('enrichment', null)}
          />
        </div>
      )}

      {enrichmentResults?.service_message && enrichmentResults.service_status === 'partial' && (
        <AlertBanner
          type="warning"
          title="Input Notice"
          message={enrichmentResults.service_message}
        />
      )}

      {/* Controls Card */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Database & Gene Set Parameters
          </h3>
          <span className="text-xs text-slate-500">Live GSEAPy Enrichr Engine</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Database Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Gene Set Knowledgebase</label>
            <select
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="GO_Biological_Process">Gene Ontology: Biological Process (GO-BP)</option>
              <option value="GO_Molecular_Function">Gene Ontology: Molecular Function (GO-MF)</option>
              <option value="GO_Cellular_Component">Gene Ontology: Cellular Component (GO-CC)</option>
              <option value="KEGG_Pathways">KEGG Pathway Database</option>
              <option value="Reactome_Pathways">Reactome Pathway Knowledgebase</option>
            </select>
          </div>

          {/* Organism Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Target Organism</label>
            <select
              value={organism}
              onChange={(e) => setOrganism(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="Human">Homo sapiens (Human)</option>
              <option value="Mouse">Mus musculus (Mouse)</option>
              <option value="Rat">Rattus norvegicus (Rat)</option>
            </select>
          </div>

          {/* Regulation Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Input DEG Direction</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setRegulationFilter('ALL')}
                className={`py-1.5 text-xs rounded-lg font-medium border transition-all ${
                  regulationFilter === 'ALL'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                All DEGs
              </button>
              <button
                type="button"
                onClick={() => setRegulationFilter('UP')}
                className={`py-1.5 text-xs rounded-lg font-medium border transition-all flex items-center justify-center gap-1 ${
                  regulationFilter === 'UP'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-3 h-3" /> UP
              </button>
              <button
                type="button"
                onClick={() => setRegulationFilter('DOWN')}
                className={`py-1.5 text-xs rounded-lg font-medium border transition-all flex items-center justify-center gap-1 ${
                  regulationFilter === 'DOWN'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <TrendingDown className="w-3 h-3" /> DOWN
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800/80">
          <button
            onClick={executeEnrichment}
            disabled={isLoading || !isBackendConnected}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Querying Knowledgebase...' : 'Execute Pathway Enrichment'}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {enrichmentResults && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Input Genes"
            value={enrichmentResults.input_gene_count}
            subtitle={`Regulation: ${enrichmentResults.regulation_filter}`}
            color="sky"
          />
          <StatCard
            title="Significant Terms"
            value={enrichmentResults.significant_pathways_count}
            subtitle="FDR (adj. p) < 0.05"
            color="rose"
            badge="FDR < 0.05"
          />
          <StatCard
            title="Total Pathways Scored"
            value={enrichmentResults.results.length}
            subtitle={enrichmentResults.database}
            color="purple"
          />
          <StatCard
            title="Target Organism"
            value={enrichmentResults.organism}
            subtitle="Gene Annotation Mapping"
            color="emerald"
          />
        </div>
      )}

      {/* Visualizations Section */}
      {enrichmentResults && enrichmentResults.results.length > 0 && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Network className="w-4 h-4 text-cyan-400" />
              Pathway Over-Representation Visualizations
            </h3>
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                onClick={() => setPlotType('dot')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  plotType === 'dot'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dot Plot
              </button>
              <button
                onClick={() => setPlotType('bar')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  plotType === 'bar'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Bar Chart
              </button>
            </div>
          </div>

          <div className="min-h-[480px]">
            {plotType === 'dot' ? (
              <EnrichmentDotPlot data={enrichmentResults.results} topN={15} />
            ) : (
              <EnrichmentBarChart data={enrichmentResults.results} topN={15} />
            )}
          </div>
        </div>
      )}

      {/* Detailed Pathway Table */}
      {enrichmentResults && enrichmentResults.results.length > 0 && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Enriched Pathways & Terms Detailed Table
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Over-representation results ranked by Benjamini-Hochberg FDR adjusted p-value ascending.
              </p>
            </div>
          </div>

          <DataTable
            data={enrichmentResults.results}
            columns={columns}
            searchPlaceholder="Search pathway or biological process..."
            searchKey="term"
            filename={`transcriptox_enrichment_${enrichmentResults.database}.csv`}
            pageSize={12}
          />
        </div>
      )}
    </div>
  );
};
