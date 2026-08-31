"""
Standalone HTML Report Generator Service for TranscriptoX.
Compiles analysis results across all stages into a publication-quality, self-contained HTML report.
"""

from datetime import datetime, timezone
import pandas as pd
import logging
from typing import Dict, Any

from app.models.report import ReportRequest
from app.services.data_processing import get_dataset, ValidationError

logger = logging.getLogger("transcriptox.services.report")


def generate_html_report(request: ReportRequest) -> str:
    """
    Generate self-contained HTML report from session analysis results.
    """
    data = get_dataset(request.dataset_id)
    raw_df: pd.DataFrame = data["raw_counts"]
    meta_df: pd.DataFrame = data["metadata"]
    results_cache = data.get("analysis_results", {})

    dataset_name = data.get("dataset_name", "Transcriptomic Analysis")
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    conditions = sorted(meta_df["condition"].unique().tolist())
    cond_str = " vs ".join(conditions)

    # 1. QC Section
    qc_data = results_cache.get("qc")
    qc_html = ""
    if request.include_qc and qc_data:
        qc_html = f"""
        <section class="report-section">
            <h2>01. Quality Control & Normalization</h2>
            <p class="section-desc">Sequencing depth evaluation and log2(CPM + 1) normalization metrics across all samples.</p>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Total Genes</div>
                    <div class="metric-value">{qc_data.summary.total_genes:,}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Total Samples</div>
                    <div class="metric-value">{qc_data.summary.total_samples}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Mean Library Size</div>
                    <div class="metric-value">{int(qc_data.summary.mean_library_size):,} reads</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Zero-Count Proportion</div>
                    <div class="metric-value">{(qc_data.summary.zero_fraction_total * 100):.1f}%</div>
                </div>
            </div>
            <h3>Sample Library Sizes</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Sample ID</th>
                        <th>Condition Group</th>
                        <th style="text-align: right;">Total Library Reads</th>
                    </tr>
                </thead>
                <tbody>
                    {''.join([f"<tr><td><code>{item.sample_id}</code></td><td><span class='badge'>{item.condition}</span></td><td style='text-align: right;'>{int(item.library_size):,}</td></tr>" for item in qc_data.library_sizes[:16]])}
                </tbody>
            </table>
        </section>
        """

    # 2. PCA Section
    pca_data = results_cache.get("pca")
    pca_html = ""
    if request.include_pca and pca_data:
        pc1_var = pca_data.explained_variance_ratio[0] * 100 if len(pca_data.explained_variance_ratio) > 0 else 0
        pc2_var = pca_data.explained_variance_ratio[1] * 100 if len(pca_data.explained_variance_ratio) > 1 else 0
        top_pc1_genes = ", ".join([f"{g.gene_id} ({g.loading:.3f})" for g in pca_data.top_loadings_pc1[:6]])
        pca_html = f"""
        <section class="report-section">
            <h2>02. Principal Component Analysis (PCA)</h2>
            <p class="section-desc">{pca_data.normalization_note}</p>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">PC1 Variance</div>
                    <div class="metric-value">{pc1_var:.1f}%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">PC2 Variance</div>
                    <div class="metric-value">{pc2_var:.1f}%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Total 2D Variance</div>
                    <div class="metric-value">{(pc1_var + pc2_var):.1f}%</div>
                </div>
            </div>
            <p><strong>Top PC1 Driver Genes:</strong> <span class="highlight">{top_pc1_genes}</span></p>
        </section>
        """

    # 3. DEG Section
    deg_data = results_cache.get("differential")
    deg_html = ""
    if request.include_deg and deg_data:
        top_up = [d for d in deg_data.results if d.status == "UP"][:10]
        top_down = [d for d in deg_data.results if d.status == "DOWN"][:10]

        deg_rows = ""
        for item in (top_up + top_down):
            status_badge = (
                f"<span class='badge badge-up'>UP (+{item.log2fc:.2f})</span>"
                if item.status == "UP"
                else f"<span class='badge badge-down'>DOWN ({item.log2fc:.2f})</span>"
            )
            fdr_str = f"{item.adj_p_value:.3e}" if item.adj_p_value < 0.001 else f"{item.adj_p_value:.4f}"
            deg_rows += f"""
            <tr>
                <td><strong><code>{item.gene_id}</code></strong></td>
                <td>{status_badge}</td>
                <td style="text-align: right;">{item.log2fc:+.3f}</td>
                <td style="text-align: right;">{fdr_str}</td>
                <td style="text-align: right;">{item.base_mean:.2f}</td>
            </tr>
            """

        deg_html = f"""
        <section class="report-section">
            <h2>03. Differential Gene Expression Analysis</h2>
            <p class="section-desc">{deg_data.methodology_note}</p>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Tested Genes</div>
                    <div class="metric-value">{deg_data.total_tested_genes:,}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Up-regulated DEGs</div>
                    <div class="metric-value text-rose">{deg_data.up_regulated_count}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Down-regulated DEGs</div>
                    <div class="metric-value text-sky">{deg_data.down_regulated_count}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Thresholds</div>
                    <div class="metric-value font-sm">|log2FC| ≥ {deg_data.log2fc_threshold}, FDR ≤ {deg_data.fdr_threshold}</div>
                </div>
            </div>
            <h3>Top Differentially Expressed Genes (Selected Preview)</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Gene ID</th>
                        <th>Regulation</th>
                        <th style="text-align: right;">log2 Fold Change</th>
                        <th style="text-align: right;">FDR (adj. p)</th>
                        <th style="text-align: right;">Mean Expression</th>
                    </tr>
                </thead>
                <tbody>
                    {deg_rows}
                </tbody>
            </table>
        </section>
        """

    # 4. Clustering Section
    clustering_data = results_cache.get("clustering")
    clustering_html = ""
    if request.include_clustering and clustering_data:
        clustering_html = f"""
        <section class="report-section">
            <h2>04. Hierarchical Clustering</h2>
            <p class="section-desc">Sample and gene co-expression modularity evaluated on row Z-score standardized expressions.</p>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Clustered Features</div>
                    <div class="metric-value">{len(clustering_data.gene_ids)} Genes</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Distance Metric</div>
                    <div class="metric-value">{clustering_data.distance_metric.title()}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Linkage Method</div>
                    <div class="metric-value">{clustering_data.linkage_method.title()}</div>
                </div>
            </div>
        </section>
        """

    # 5. Enrichment Section
    enrichment_data = results_cache.get("enrichment")
    enrichment_html = ""
    if request.include_enrichment and enrichment_data and enrichment_data.results:
        path_rows = ""
        for p in enrichment_data.results[:12]:
            fdr_val = f"{p.adj_p_value:.3e}" if p.adj_p_value < 0.001 else f"{p.adj_p_value:.4f}"
            gene_sample = ", ".join(p.genes[:6]) + ("..." if len(p.genes) > 6 else "")
            path_rows += f"""
            <tr>
                <td><strong>{p.term}</strong></td>
                <td style="text-align: center;"><code>{p.overlap}</code></td>
                <td style="text-align: right;">{(p.gene_ratio * 100):.1f}%</td>
                <td style="text-align: right; color: #fb7185;"><strong>{fdr_val}</strong></td>
                <td style="font-size: 11px; color: #94a3b8;">{gene_sample}</td>
            </tr>
            """

        enrichment_html = f"""
        <section class="report-section">
            <h2>05. Functional Pathway Enrichment</h2>
            <p class="section-desc">Over-representation analysis against {enrichment_data.database} ({enrichment_data.organism}).</p>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Input Gene List</div>
                    <div class="metric-value">{enrichment_data.input_gene_count} Genes</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Significant Terms (FDR &lt; 0.05)</div>
                    <div class="metric-value">{enrichment_data.significant_pathways_count}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Database</div>
                    <div class="metric-value font-sm">{enrichment_data.database}</div>
                </div>
            </div>
            <h3>Top Enriched Pathways & Biological Functions</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Pathway / Term</th>
                        <th style="text-align: center;">Overlap</th>
                        <th style="text-align: right;">Gene Ratio</th>
                        <th style="text-align: right;">FDR (adj. p)</th>
                        <th>Associated Genes</th>
                    </tr>
                </thead>
                <tbody>
                    {path_rows}
                </tbody>
            </table>
        </section>
        """

    # 6. Survival Section
    survival_data = results_cache.get("survival")
    survival_html = ""
    if request.include_survival and survival_data:
        lr_p = f"{survival_data.log_rank_p_value:.3e}" if survival_data.log_rank_p_value < 0.001 else f"{survival_data.log_rank_p_value:.4f}"
        med_high = f"{survival_data.high_group.median_survival_time} mo" if survival_data.high_group.median_survival_time else "Not Reached"
        med_low = f"{survival_data.low_group.median_survival_time} mo" if survival_data.low_group.median_survival_time else "Not Reached"

        survival_html = f"""
        <section class="report-section">
            <h2>06. Clinical Survival Analysis</h2>
            <p class="section-desc">Kaplan-Meier survival estimation and Cox Proportional Hazards regression for <strong>{survival_data.gene_id}</strong>.</p>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Log-Rank Test p-value</div>
                    <div class="metric-value {'text-rose' if survival_data.log_rank_p_value < 0.05 else ''}">{lr_p}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Hazard Ratio (HR)</div>
                    <div class="metric-value">{survival_data.hazard_ratio:.2f}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">HR 95% Confidence Interval</div>
                    <div class="metric-value font-sm">[{survival_data.hr_ci_lower:.2f} - {survival_data.hr_ci_upper:.2f}]</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Median Survival (High vs Low)</div>
                    <div class="metric-value font-sm">{med_high} vs {med_low}</div>
                </div>
            </div>
            <div class="callout callout-info">
                <strong>Association Notice:</strong> {survival_data.association_disclaimer}
            </div>
        </section>
        """

    # Assemble Full Document
    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TranscriptoX Analysis Report — {dataset_name}</title>
    <style>
        :root {{
            --bg: #0f172a;
            --surface: #1e293b;
            --border: #334155;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --accent: #38bdf8;
            --accent-rose: #fb7185;
            --accent-emerald: #34d399;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 40px 20px;
        }}
        .container {{
            max-width: 1080px;
            margin: 0 auto;
            background-color: #0b1120;
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }}
        header {{
            border-b: 2px solid var(--border);
            padding-bottom: 24px;
            margin-bottom: 32px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 20px;
        }}
        .brand-title {{
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #ffffff;
        }}
        .brand-title span {{ color: var(--accent); }}
        .subtitle {{
            font-size: 14px;
            color: var(--text-muted);
            margin-top: 4px;
        }}
        .meta-box {{
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 12px 18px;
            font-size: 12px;
            color: var(--text-muted);
        }}
        .meta-box strong {{ color: var(--text); }}
        .report-section {{
            margin-bottom: 40px;
            padding-bottom: 32px;
            border-bottom: 1px solid rgba(51, 65, 85, 0.6);
        }}
        h2 {{
            font-size: 20px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 6px;
        }}
        h3 {{
            font-size: 15px;
            font-weight: 600;
            color: #e2e8f0;
            margin: 20px 0 12px 0;
        }}
        .section-desc {{
            font-size: 13px;
            color: var(--text-muted);
            margin-bottom: 20px;
        }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }}
        .metric-card {{
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 16px 20px;
        }}
        .metric-label {{
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-muted);
            margin-bottom: 6px;
        }}
        .metric-value {{
            font-size: 20px;
            font-weight: 700;
            color: #ffffff;
        }}
        .font-sm {{ font-size: 14px; }}
        .text-rose {{ color: var(--accent-rose); }}
        .text-sky {{ color: var(--accent); }}
        .report-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 12px;
            background: #0f172a;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid var(--border);
        }}
        .report-table th, .report-table td {{
            padding: 10px 14px;
            border-bottom: 1px solid #1e293b;
        }}
        .report-table th {{
            background-color: #1e293b;
            color: var(--text-muted);
            font-weight: 600;
            text-align: left;
        }}
        .report-table tr:hover td {{
            background-color: rgba(56, 189, 248, 0.04);
        }}
        code {{
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            background: #1e293b;
            padding: 2px 6px;
            border-radius: 4px;
            color: var(--accent);
            font-size: 11px;
        }}
        .badge {{
            display: inline-block;
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 600;
            background: #1e293b;
            color: var(--text-muted);
        }}
        .badge-up {{
            background: rgba(244, 63, 94, 0.15);
            color: #fb7185;
            border: 1px solid rgba(244, 63, 94, 0.3);
        }}
        .badge-down {{
            background: rgba(2, 132, 199, 0.15);
            color: #38bdf8;
            border: 1px solid rgba(2, 132, 199, 0.3);
        }}
        .callout {{
            padding: 16px 20px;
            border-radius: 12px;
            font-size: 12px;
            line-height: 1.5;
            margin-top: 16px;
        }}
        .callout-info {{
            background: rgba(56, 189, 248, 0.08);
            border: 1px solid rgba(56, 189, 248, 0.25);
            color: #bae6fd;
        }}
        .callout-warning {{
            background: rgba(251, 191, 36, 0.08);
            border: 1px solid rgba(251, 191, 36, 0.25);
            color: #fde68a;
        }}
        footer {{
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid var(--border);
            text-align: center;
            font-size: 11px;
            color: var(--text-muted);
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <div class="brand-title">Transcripto<span>X</span></div>
                <div class="subtitle">Integrated Transcriptomic Analysis Pipeline — Comprehensive Analysis Report</div>
            </div>
            <div class="meta-box">
                <div><strong>Dataset:</strong> {dataset_name}</div>
                <div><strong>Contrast:</strong> {cond_str}</div>
                <div><strong>Generated:</strong> {timestamp}</div>
            </div>
        </header>

        {qc_html}
        {pca_html}
        {deg_html}
        {clustering_html}
        {enrichment_html}
        {survival_html}

        <section class="report-section">
            <h2>07. Methodology & Analysis Pipeline Notes</h2>
            <div class="callout callout-info">
                <strong>Methodology Transparency:</strong>
                TranscriptoX implements parametric two-sample Welch's t-tests on log2(CPM + 1) normalized counts combined with Benjamini-Hochberg False Discovery Rate (FDR) adjustment. This approach provides rapid, robust exploratory differential profiling. For definitive clinical quantification, supplementary generalized linear negative binomial models (such as DESeq2/edgeR) are recommended.
            </div>
            <div class="callout callout-warning">
                <strong>Standard Scientific Disclaimer:</strong>
                TranscriptoX is designed for scientific research, academic education, and exploratory bioinformatics discovery. All statistical associations, hazard ratios, and enriched pathways should be independently validated using experimental assays before diagnostic or clinical application.
            </div>
        </section>

        <footer>
            Generated automatically by <strong>TranscriptoX Pipeline v1.0</strong> • Standalone Bioinformatics Engine
        </footer>
    </div>
</body>
</html>
"""
    return full_html
