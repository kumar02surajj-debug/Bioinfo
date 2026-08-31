import React, { useState } from 'react';
import {
  Dna,
  Scale,
  Microscope,
  Grid3X3,
  Network,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Sparkles,
} from 'lucide-react';

export const DocumentationPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('overview');

  const sections = [
    { id: 'overview', title: '1. Pipeline Overview & Philosophy', icon: Dna },
    { id: 'data_formats', title: '2. Input Data & Matrix Specifications', icon: Code2 },
    { id: 'normalization', title: '3. Normalization Algorithms (CPM & log2)', icon: Microscope },
    { id: 'pca', title: '4. Dimensionality Reduction & PCA', icon: Sparkles },
    { id: 'differential', title: '5. Differential Expression & Welch t-test', icon: Scale },
    { id: 'fdr', title: '6. Benjamini-Hochberg FDR Multiple Testing', icon: CheckCircle2 },
    { id: 'clustering', title: '7. Hierarchical Clustering & Z-Score Scaling', icon: Grid3X3 },
    { id: 'enrichment', title: '8. Pathway Enrichment (GO, KEGG, Reactome)', icon: Network },
    { id: 'survival', title: '9. Survival Analysis (Kaplan-Meier & Cox PH)', icon: Activity },
    { id: 'disclaimer', title: '10. Limitations & Scientific Disclaimer', icon: AlertTriangle },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            REFERENCE MANUAL
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Bioinformatics Documentation & Theory
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          In-depth mathematical principles, statistical assumptions, and implementation details powering TranscriptoX.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Table of Contents Sticky Sidebar */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Documentation Index
          </p>
          <nav className="space-y-1 sticky top-20">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => {
                    setActiveSection(sec.id);
                    document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                  <span className="truncate">{sec.title}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Body */}
        <div className="lg:col-span-3 space-y-10 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {/* Section 1: Overview */}
          <div id="overview" className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Dna className="w-5 h-5 text-cyan-400" />
              1. Pipeline Overview & Design Philosophy
            </h2>
            <p>
              <strong>TranscriptoX</strong> is an integrated transcriptomic analysis pipeline engineered to process raw RNA sequencing counts and guide researchers through an unbroken analysis workflow:
            </p>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs text-cyan-300">
              Upload → 01 QC + PCA → 02 Differential Expression → 03 Clustering + Heatmap → 04 Pathway Enrichment → 05 Survival Analysis → Results & Report
            </div>
            <p>
              Unlike disconnected command-line tools that require tedious intermediate file reformatting and gene list copy-pasting, TranscriptoX automatically connects each stage. Statistically significant differentially expressed genes (DEGs) computed in Stage 02 immediately feed into hierarchical clustering (Stage 03), over-representation analysis (Stage 04), and clinical prognostic modeling (Stage 05).
            </p>
          </div>

          {/* Section 2: Data Formats */}
          <div id="data_formats" className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-emerald-400" />
              2. Input Data & Matrix Specifications
            </h2>
            <p>
              TranscriptoX accepts standard comma-separated values (CSV) files with strict integrity validation:
            </p>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-slate-200">1. Expression Matrix CSV</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rows represent distinct gene identifiers (e.g. HGNC symbols like <code>TP53</code>, <code>EGFR</code> or Ensembl IDs), and columns represent sample IDs. Values must be non-negative integer or floating-point read counts.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-200">2. Sample Metadata CSV</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Must contain a <code>sample_id</code> column (exactly matching expression matrix column headers) and a <code>condition</code> column specifying phenotypic groups (e.g., <code>Control</code> vs <code>Treatment</code>).
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-200">3. Survival Timeline CSV (Optional)</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Must contain <code>sample_id</code>, <code>time</code> (continuous follow-up duration), and <code>event</code> (binary: 0 = censored/alive, 1 = event/deceased).
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Normalization */}
          <div id="normalization" className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Microscope className="w-5 h-5 text-sky-400" />
              3. Normalization Algorithms (CPM & log2 Transformation)
            </h2>
            <p>
              Raw sequencing read counts are confounded by differences in total sequencing depth (library size) across sequencing runs. TranscriptoX performs <strong>Counts Per Million (CPM)</strong> normalization followed by a log2 transformation with a pseudo-count of 1:
            </p>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 space-y-2">
              <div><strong>CPM Formula:</strong> <code>CPM_ij = (Count_ij / LibrarySize_j) * 10^6</code></div>
              <div><strong>Log-CPM Transformation:</strong> <code>log2_CPM_ij = log2(CPM_ij + 1.0)</code></div>
            </div>
            <p>
              The pseudo-count (<code>+ 1.0</code>) stabilizes variance for low-expressed genes and prevents <code>log2(0) = -inf</code> errors.
            </p>
          </div>

          {/* Section 4: PCA */}
          <div id="pca" className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              4. Dimensionality Reduction & Principal Component Analysis (PCA)
            </h2>
            <p>
              Principal Component Analysis is executed strictly on the <strong>standardized log2(CPM + 1) normalized matrix</strong>, never on raw counts. Genes with zero variance across all samples are filtered out, and remaining features are centered to zero mean and scaled to unit variance:
            </p>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200">
              <code>Z_ij = (log2_CPM_ij - Mean_i) / Std_i</code>
            </div>
            <p>
              Singular Value Decomposition (SVD) of the sample covariance matrix produces orthogonal eigenvectors (Principal Components) ranked by the proportion of total variance explained.
            </p>
          </div>

          {/* Section 5: Differential Expression */}
          <div id="differential" className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Scale className="w-5 h-5 text-rose-400" />
              5. Differential Expression & Welch's Two-Sample t-Test
            </h2>
            <p>
              For each gene <em>g</em>, TranscriptoX computes the mean normalized expression in the Treatment group (&mu;<sub>trt</sub>) and Control group (&mu;<sub>ctrl</sub>). The log2 Fold Change is calculated as:
            </p>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200">
              <code>log2FC_g = Mean_Treatment_g - Mean_Control_g</code>
            </div>
            <p>
              Statistical significance is evaluated using <strong>Welch's two-sample t-test</strong>, which does not assume equal variances between biological conditions:
            </p>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200">
              <code>t = (Mean_Trt - Mean_Ctrl) / sqrt( (s_Trt^2 / n_Trt) + (s_Ctrl^2 / n_Ctrl) )</code>
            </div>
            <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-xs text-sky-200">
              <strong>Methodology Transparency:</strong> This parametric approach provides a fast, robust approximation for exploratory transcriptomics. For large-scale observational studies with extreme over-dispersion, generalized linear negative binomial models (e.g. DESeq2/edgeR) are complementary.
            </div>
          </div>

          {/* Section 6: Benjamini-Hochberg FDR */}
          <div id="fdr" className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              6. Multiple Testing Correction & Benjamini-Hochberg FDR
            </h2>
            <p>
              Testing thousands of genes simultaneously leads to an inflated rate of false positive discoveries. TranscriptoX controls the <strong>False Discovery Rate (FDR)</strong> using the Benjamini-Hochberg (1995) step-up procedure:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-300 font-mono">
              <li>Sort raw p-values in ascending order: p_(1) ≤ p_(2) ≤ ... ≤ p_(m).</li>
              <li>Compute critical value: q_(i) = (p_(i) * m) / i.</li>
              <li>Enforce monotonicity: adj_p_(i) = min(q_(i), adj_p_(i+1)).</li>
            </ol>
          </div>

          {/* Section 7: Clustering */}
          <div id="clustering" className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-purple-400" />
              7. Hierarchical Clustering & Z-Score Scaling
            </h2>
            <p>
              To visualize co-expression patterns, gene expression values are row-standardized into Z-scores across all samples. Hierarchical agglomerative clustering builds a tree by iteratively merging the closest pairs of clusters according to the selected distance metric (Euclidean, Correlation, Cosine) and linkage criterion (Average/UPGMA, Complete, Ward).
            </p>
          </div>

          {/* Section 8: Pathway Enrichment */}
          <div id="enrichment" className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Network className="w-5 h-5 text-amber-400" />
              8. Functional Pathway Enrichment Analysis (GSEAPy Enrichr)
            </h2>
            <p>
              TranscriptoX queries live <strong>Enrichr</strong> knowledgebases using the official <strong>GSEAPy</strong> engine. Over-representation analysis uses Fisher's exact test (Hypergeometric distribution) to assess whether a set of DEGs overlaps with curated biological pathways more than expected by random chance.
            </p>
            <p className="text-xs text-slate-400">
              Supported libraries include Gene Ontology Biological Process (GO-BP), Molecular Function (GO-MF), Cellular Component (GO-CC), KEGG, and Reactome pathways across Human, Mouse, and Rat models.
            </p>
          </div>

          {/* Section 9: Survival */}
          <div id="survival" className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-rose-400" />
              9. Survival Analysis (Kaplan-Meier & Cox Proportional Hazards)
            </h2>
            <p>
              When clinical survival metadata is provided, TranscriptoX stratifies patients into High and Low expression cohorts based on a selected target biomarker:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
              <li><strong>Kaplan-Meier Estimator:</strong> Non-parametric step-function of survival probability over time, accounting for right-censored patients.</li>
              <li><strong>Log-Rank Test:</strong> Non-parametric hypothesis test comparing the survival distributions of the High and Low expression groups.</li>
              <li><strong>Cox Proportional Hazards:</strong> Semiparametric regression estimating the Hazard Ratio (HR) and 95% Wald confidence intervals.</li>
            </ul>
          </div>

          {/* Section 10: Disclaimer */}
          <div id="disclaimer" className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              10. Limitations & Scientific Disclaimer
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              TranscriptoX is designed exclusively for exploratory bioinformatics discovery, academic research, and bioinformatics education.
              All statistical associations, hazard ratios, p-values, and pathway enrichments must be independently validated through wet-lab experimental assays (e.g. RT-qPCR, Western blot, functional knockdowns) prior to any clinical, diagnostic, or therapeutic decision-making.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
