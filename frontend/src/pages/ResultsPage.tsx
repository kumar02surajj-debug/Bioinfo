import React, { useState } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { BackButton } from '../components/common/BackButton';
import * as api from '../services/api';
import {
  FileSpreadsheet,
  Download,
  FileText,
  ExternalLink,
  Activity,
  Microscope,
  Scale,
  Grid3X3,
  Network,
  RefreshCw,
  Copy,
  Check,
  Code,
  Save,
  BookOpen,
  Archive,
} from 'lucide-react';
import { AlertBanner } from '../components/common/AlertBanner';
import { StatCard } from '../components/common/StatCard';

export const ResultsPage: React.FC = () => {
  const {
    dataset,
    qcResults,
    pcaResults,
    degResults,
    clusteringResults,
    enrichmentResults,
    survivalResults,
    setActiveStep,
    isBackendConnected,
    exportSessionJSON,
  } = useAnalysis();

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleDownloadReport = async () => {
    if (!dataset) return;
    setIsGeneratingReport(true);
    setReportError(null);
    try {
      const blob = await api.generateReport(dataset.dataset_id, {
        include_qc: !!qcResults,
        include_pca: !!pcaResults,
        include_deg: !!degResults,
        include_clustering: !!clusteringResults,
        include_enrichment: !!enrichmentResults,
        include_survival: !!survivalResults,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TranscriptoX_Report_${dataset.dataset_name.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setReportError(err.message || 'Failed to generate HTML report.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportDEG_CSV = () => {
    if (!degResults) return;
    const header = ['Gene_ID', 'Status', 'log2FC', 'P_Value', 'FDR_adj_p', 'Base_Mean', 'Mean_Ctrl', 'Mean_Trt'].join(',');
    const rows = degResults.results.map((d) =>
      `"${d.gene_id}","${d.status}",${d.log2fc},${d.p_value},${d.adj_p_value},${d.base_mean},${d.mean_control},${d.mean_treatment}`
    );
    downloadCSV([header, ...rows].join('\n'), `transcriptox_deg_${degResults.treatment_group}_vs_${degResults.control_group}.csv`);
  };

  const exportQC_CSV = () => {
    if (!qcResults) return;
    const header = ['Sample_ID', 'Condition', 'Library_Size'].join(',');
    const rows = qcResults.library_sizes.map((s) => `"${s.sample_id}","${s.condition}",${s.library_size}`);
    downloadCSV([header, ...rows].join('\n'), 'transcriptox_qc_library_sizes.csv');
  };

  const exportCluster_CSV = () => {
    if (!clusteringResults) return;
    const header = ['Gene_ID', ...clusteringResults.sample_ids].join(',');
    const rows = clusteringResults.gene_ids.map((gene, rIdx) => {
      const vals = clusteringResults.z_scores[rIdx].join(',');
      return `"${gene}",${vals}`;
    });
    downloadCSV([header, ...rows].join('\n'), 'transcriptox_clustered_zscores.csv');
  };

  const exportEnrichment_CSV = () => {
    if (!enrichmentResults) return;
    const header = ['Term', 'Database', 'Overlap', 'Gene_Count', 'Gene_Ratio', 'P_Value', 'FDR_adj_p', 'Genes'].join(',');
    const rows = enrichmentResults.results.map((p) =>
      `"${p.term}","${p.database}","${p.overlap}",${p.gene_count},${p.gene_ratio},${p.p_value},${p.adj_p_value},"${p.genes.join(';')}"`
    );
    downloadCSV([header, ...rows].join('\n'), `transcriptox_enrichment_${enrichmentResults.database}.csv`);
  };

  const exportSurvival_CSV = () => {
    if (!survivalResults) return;
    const header = ['Group', 'Sample_Count', 'Event_Count', 'Median_Survival'].join(',');
    const rows = [
      `"High Expression",${survivalResults.high_group.sample_count},${survivalResults.high_group.event_count},${survivalResults.high_group.median_survival_time ?? 'N/A'}`,
      `"Low Expression",${survivalResults.low_group.sample_count},${survivalResults.low_group.event_count},${survivalResults.low_group.median_survival_time ?? 'N/A'}`,
    ];
    downloadCSV([header, ...rows].join('\n'), `transcriptox_survival_${survivalResults.gene_id}.csv`);
  };

  const exportAllCSVs = () => {
    if (degResults) exportDEG_CSV();
    if (qcResults) exportQC_CSV();
    if (clusteringResults) exportCluster_CSV();
    if (enrichmentResults) exportEnrichment_CSV();
    if (survivalResults) exportSurvival_CSV();
  };

  // Draft Scientific Methods paragraph
  const generatedMethodsText = `Transcriptomic count profiling and quality control were executed using the TranscriptoX pipeline. Raw sequencing counts were normalized to log2(Counts Per Million + 1.0) according to CPM_ij = (Count_ij / LibrarySize_j) * 10^6. Exploratory principal component analysis (PCA) was computed across centered and standardized expression matrices. Differential gene expression was analyzed via Welch's two-sample t-test with multiple testing correction using the Benjamini-Hochberg (BH) False Discovery Rate (FDR) adjustment (thresholds: |log2FC| >= ${degResults?.log2fc_threshold ?? 1.0}, FDR <= ${degResults?.fdr_threshold ?? 0.05}). Hierarchical clustering of significant genes was performed using row-wise Z-score standardization (mu=0, sigma=1) with Euclidean distance and average linkage. Functional pathway enrichment was queried against Enrichr gene set libraries via GSEAPy. Clinical survival analysis was evaluated using Kaplan-Meier product-limit estimation, two-sample Log-rank tests, and Cox Proportional Hazards regression via the Lifelines package.`;

  const bibtexEntries = `@software{TranscriptoX2026,
  title = {TranscriptoX: Integrated Transcriptomic Analysis Pipeline},
  year = {2026},
  url = {https://github.com/bioinfo/transcriptox}
}

@article{gseapy2023,
  title = {GSEAPy: Gene Set Enrichment Analysis in Python},
  author = {Fang, Zhuoqing and others},
  journal = {Bioinformatics},
  year = {2023}
}

@software{lifelines2023,
  title = {lifelines: survival analysis in Python},
  author = {Davidson-Pilon, Cameron},
  journal = {Journal of Open Source Software},
  year = {2019}
}`;

  if (!dataset) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <div className="flex justify-start">
          <BackButton />
        </div>
        <AlertBanner
          type="info"
          title="No Active Dataset"
          message="Please upload a dataset or load the demo dataset before viewing the Results Dashboard."
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

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                RESULTS HUB & EXPORT
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                Pipeline Results & Report Center
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Consolidated summary across QC, PCA, differential expression, clustering, pathway enrichment, and clinical prognosis.
            </p>
          </div>
        </div>

        {/* Generate HTML Report Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportSessionJSON}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold shadow-lg transition-all"
            title="Save entire pipeline session state to JSON"
          >
            <Save className="w-4 h-4 text-cyan-400" />
            <span>Save Session State</span>
          </button>

          <button
            onClick={handleDownloadReport}
            disabled={isGeneratingReport || !isBackendConnected}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 shrink-0"
          >
            {isGeneratingReport ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Compiling Report...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Full HTML Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {reportError && (
        <AlertBanner
          type="error"
          title="Report Generation Error"
          message={reportError}
          onClose={() => setReportError(null)}
        />
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Dataset Dimension"
          value={`${dataset.gene_count.toLocaleString()} x ${dataset.sample_count}`}
          subtitle={`${dataset.conditions.join(' vs ')}`}
          color="sky"
        />
        <StatCard
          title="Significant DEGs"
          value={degResults ? degResults.up_regulated_count + degResults.down_regulated_count : 'Pending'}
          subtitle={degResults ? `${degResults.up_regulated_count} Up / ${degResults.down_regulated_count} Down` : 'Step 03'}
          color="rose"
        />
        <StatCard
          title="Enriched Pathways"
          value={enrichmentResults ? enrichmentResults.significant_pathways_count : 'Pending'}
          subtitle={enrichmentResults ? `${enrichmentResults.database}` : 'Step 05'}
          color="purple"
        />
        <StatCard
          title="Prognostic Target"
          value={survivalResults ? `${survivalResults.gene_id}` : 'Not Evaluated'}
          subtitle={survivalResults ? `HR: ${survivalResults.hazard_ratio.toFixed(2)} (p=${survivalResults.log_rank_p_value < 0.001 ? '<0.001' : survivalResults.log_rank_p_value.toFixed(3)})` : 'Step 06'}
          color="emerald"
        />
      </div>

      {/* Module Stage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* QC & PCA Card */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 backdrop-blur-md flex flex-col justify-between shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">STEP 02</span>
              <Microscope className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Quality Control & PCA</h3>
            <p className="text-xs text-slate-400">
              {qcResults && pcaResults
                ? `Mean library size: ${Math.round(qcResults.summary.mean_library_size).toLocaleString()} reads. PCA PC1+PC2 explains ${((pcaResults.explained_variance_ratio[0] + (pcaResults.explained_variance_ratio[1] || 0)) * 100).toFixed(1)}% of total variance.`
                : 'QC metrics and PCA dimensional reduction have not been computed yet.'}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setActiveStep('qc')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              <span>View QC & PCA</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            {qcResults && (
              <button
                onClick={exportQC_CSV}
                className="text-[11px] text-slate-400 hover:text-slate-200"
              >
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* DEG Card */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 backdrop-blur-md flex flex-col justify-between shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-rose-400">STEP 03</span>
              <Scale className="w-5 h-5 text-rose-400" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Differential Expression</h3>
            <p className="text-xs text-slate-400">
              {degResults
                ? `Identified ${degResults.up_regulated_count} up-regulated and ${degResults.down_regulated_count} down-regulated genes at |log2FC| ≥ ${degResults.log2fc_threshold} and FDR ≤ ${degResults.fdr_threshold}.`
                : 'Differential expression analysis has not been executed yet.'}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setActiveStep('differential')}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
            >
              <span>View Volcano & DEG Table</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            {degResults && (
              <button
                onClick={exportDEG_CSV}
                className="text-[11px] text-slate-400 hover:text-slate-200"
              >
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Clustering Card */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 backdrop-blur-md flex flex-col justify-between shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-purple-400">STEP 04</span>
              <Grid3X3 className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Hierarchical Clustering</h3>
            <p className="text-xs text-slate-400">
              {clusteringResults
                ? `Clustered ${clusteringResults.gene_ids.length} genes x ${clusteringResults.sample_ids.length} samples with ${clusteringResults.distance_metric} distance and ${clusteringResults.linkage_method} linkage.`
                : 'Hierarchical clustering has not been executed yet.'}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setActiveStep('clustering')}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
            >
              <span>View Clustered Heatmap</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            {clusteringResults && (
              <button
                onClick={exportCluster_CSV}
                className="text-[11px] text-slate-400 hover:text-slate-200"
              >
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Enrichment Card */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 backdrop-blur-md flex flex-col justify-between shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400">STEP 05</span>
              <Network className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Pathway Enrichment</h3>
            <p className="text-xs text-slate-400">
              {enrichmentResults
                ? `Identified ${enrichmentResults.significant_pathways_count} significant pathways (FDR < 0.05) across ${enrichmentResults.database}.`
                : 'Functional pathway enrichment has not been executed yet.'}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setActiveStep('enrichment')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
            >
              <span>View Dot Plot & Pathways</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            {enrichmentResults && (
              <button
                onClick={exportEnrichment_CSV}
                className="text-[11px] text-slate-400 hover:text-slate-200"
              >
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Survival Card */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 backdrop-blur-md flex flex-col justify-between shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400">STEP 06</span>
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Survival Prognosis</h3>
            <p className="text-xs text-slate-400">
              {survivalResults
                ? `Evaluated ${survivalResults.gene_id} stratification: Log-rank p=${survivalResults.log_rank_p_value < 0.001 ? '<0.001' : survivalResults.log_rank_p_value.toFixed(4)}, HR=${survivalResults.hazard_ratio.toFixed(2)}.`
                : dataset.has_survival
                ? 'Clinical survival analysis ready to run.'
                : 'No clinical survival timeline uploaded.'}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setActiveStep('survival')}
              disabled={!dataset.has_survival}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 disabled:opacity-40"
            >
              <span>View Kaplan-Meier Curves</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            {survivalResults && (
              <button
                onClick={exportSurvival_CSV}
                className="text-[11px] text-slate-400 hover:text-slate-200"
              >
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Documentation / Theory Card */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 backdrop-blur-md flex flex-col justify-between shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400">THEORY</span>
              <FileText className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Bioinformatics Handbook</h3>
            <p className="text-xs text-slate-400">
              In-depth documentation of normalization equations, parametric testing, FDR correction, hierarchical clustering, and survival mathematics.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={() => setActiveStep('docs')}
              className="text-xs text-slate-300 hover:text-slate-100 font-semibold flex items-center gap-1"
            >
              <span>Read Documentation & Citations</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* CSV Export Center Hub */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              Batch CSV Data Export Hub
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Download formatted raw and processed tables from each pipeline stage for downstream publication or scripting.
            </p>
          </div>
          <button
            onClick={exportAllCSVs}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-all self-start sm:self-auto"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Download All Generated Tables</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          {degResults && (
            <button
              onClick={exportDEG_CSV}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-rose-400" />
              <span>DEG Master Table (CSV)</span>
            </button>
          )}

          {qcResults && (
            <button
              onClick={exportQC_CSV}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>QC Library Sizes (CSV)</span>
            </button>
          )}

          {clusteringResults && (
            <button
              onClick={exportCluster_CSV}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              <span>Clustered Z-Score Matrix (CSV)</span>
            </button>
          )}

          {enrichmentResults && (
            <button
              onClick={exportEnrichment_CSV}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Pathway Enrichment Table (CSV)</span>
            </button>
          )}

          {survivalResults && (
            <button
              onClick={exportSurvival_CSV}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Survival Risk Table (CSV)</span>
            </button>
          )}
        </div>
      </div>

      {/* Methods & Citations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ready-to-copy Methods paragraph */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              Publication Methods Paragraph (Draft)
            </h3>
            <button
              onClick={() => copyToClipboard(generatedMethodsText, 'methods')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            >
              {copiedSection === 'methods' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-sans bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 select-all">
            {generatedMethodsText}
          </p>
        </div>

        {/* Ready-to-copy BibTeX Citations */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Code className="w-4 h-4 text-purple-400" />
              BibTeX Tool Citations
            </h3>
            <button
              onClick={() => copyToClipboard(bibtexEntries, 'bibtex')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            >
              {copiedSection === 'bibtex' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy BibTeX</span>
                </>
              )}
            </button>
          </div>
          <pre className="text-[11px] text-slate-300 font-mono bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 overflow-x-auto select-all leading-relaxed">
            {bibtexEntries}
          </pre>
        </div>
      </div>
    </div>
  );
};
