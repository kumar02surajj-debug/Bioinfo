"""
Differential Expression (DEG) Analysis Service for TranscriptoX.
Implements group-wise log2 Fold Change estimation, two-sample Welch's t-test,
and Benjamini-Hochberg False Discovery Rate (FDR) multiple-testing correction.
"""

import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.stats.multitest import multipletests
import logging
from typing import List

from app.models.differential import DifferentialResponse, DEGItem, RegulationStatus
from app.services.data_processing import get_dataset, ValidationError
from app.services.qc import normalize_cpm_log2

logger = logging.getLogger("transcriptox.services.differential")


def compute_differential_expression(
    dataset_id: str,
    control_group: str,
    treatment_group: str,
    log2fc_threshold: float = 1.0,
    fdr_threshold: float = 0.05
) -> DifferentialResponse:
    """
    Execute differential expression analysis comparing treatment_group vs control_group.
    """
    data = get_dataset(dataset_id)
    meta_df: pd.DataFrame = data["metadata"]

    norm_df: pd.DataFrame = data.get("normalized_counts")
    if norm_df is None:
        raw_df: pd.DataFrame = data["raw_counts"]
        norm_df = normalize_cpm_log2(raw_df)
        data["normalized_counts"] = norm_df

    # Extract samples for each condition
    ctrl_samples = meta_df[meta_df["condition"] == control_group]["sample_id"].tolist()
    trt_samples = meta_df[meta_df["condition"] == treatment_group]["sample_id"].tolist()

    if not ctrl_samples:
        raise ValidationError(f"Control group '{control_group}' contains 0 samples in metadata.")
    if not trt_samples:
        raise ValidationError(f"Treatment group '{treatment_group}' contains 0 samples in metadata.")
    if control_group == treatment_group:
        raise ValidationError("Control group and Treatment group cannot be the same condition.")

    # Subset matrix
    ctrl_matrix = norm_df[ctrl_samples].values # (n_genes, n_ctrl)
    trt_matrix = norm_df[trt_samples].values   # (n_genes, n_trt)
    genes = list(norm_df.index)

    n_genes = len(genes)
    ctrl_means = np.mean(ctrl_matrix, axis=1)
    trt_means = np.mean(trt_matrix, axis=1)
    base_means = (np.sum(ctrl_matrix, axis=1) + np.sum(trt_matrix, axis=1)) / (len(ctrl_samples) + len(trt_samples))

    # Log2FC = Mean(Treatment) - Mean(Control) on log2 counts
    log2fc_values = trt_means - ctrl_means

    # Perform statistical test per gene
    p_values = np.ones(n_genes, dtype=float)

    for i in range(n_genes):
        c_vals = ctrl_matrix[i, :]
        t_vals = trt_matrix[i, :]

        # Check for zero variance
        if np.all(c_vals == c_vals[0]) and np.all(t_vals == t_vals[0]):
            if c_vals[0] == t_vals[0]:
                p_values[i] = 1.0
            else:
                # Small variance regularizer if both groups are constant but distinct
                p_values[i] = 1e-6
        else:
            try:
                # Welch's t-test (unequal variances)
                stat, p_val = stats.ttest_ind(t_vals, c_vals, equal_var=False, nan_policy='omit')
                if np.isnan(p_val) or np.isinf(p_val):
                    p_values[i] = 1.0
                else:
                    p_values[i] = float(np.clip(p_val, 1e-300, 1.0))
            except Exception:
                p_values[i] = 1.0

    # Multiple-testing correction using Benjamini-Hochberg FDR
    reject, adj_p_values, _, _ = multipletests(p_values, alpha=fdr_threshold, method='fdr_bh')

    # Construct DEG items and counts
    deg_items: List[DEGItem] = []
    up_count = 0
    down_count = 0
    not_sig_count = 0

    results_rows = []

    for i, gene in enumerate(genes):
        fc = float(log2fc_values[i])
        pval = float(p_values[i])
        fdr = float(adj_p_values[i])
        c_mean = float(ctrl_means[i])
        t_mean = float(trt_means[i])
        b_mean = float(base_means[i])

        if fdr <= fdr_threshold and fc >= log2fc_threshold:
            status: RegulationStatus = "UP"
            up_count += 1
        elif fdr <= fdr_threshold and fc <= -log2fc_threshold:
            status = "DOWN"
            down_count += 1
        else:
            status = "NOT_SIG"
            not_sig_count += 1

        item = DEGItem(
            gene_id=gene,
            mean_control=round(c_mean, 3),
            mean_treatment=round(t_mean, 3),
            log2fc=round(fc, 4),
            p_value=pval,
            adj_p_value=fdr,
            status=status,
            base_mean=round(b_mean, 3)
        )
        deg_items.append(item)

        results_rows.append({
            "gene_id": gene,
            "mean_control": c_mean,
            "mean_treatment": t_mean,
            "log2fc": fc,
            "p_value": pval,
            "adj_p_value": fdr,
            "status": status,
            "base_mean": b_mean
        })

    # Sort results by adjusted p-value ascending
    deg_items.sort(key=lambda x: x.adj_p_value)

    method_note = (
        f"Differential expression comparing '{treatment_group}' (n={len(trt_samples)}) vs '{control_group}' (n={len(ctrl_samples)}) "
        f"using Welch's two-sample t-test on log2(CPM+1) normalized counts with Benjamini-Hochberg FDR multiple-testing correction. "
        f"Note: This parametric test provides an exploratory statistical approximation compared to generalized linear negative binomial models (e.g. DESeq2/edgeR)."
    )

    response = DifferentialResponse(
        dataset_id=dataset_id,
        control_group=control_group,
        treatment_group=treatment_group,
        log2fc_threshold=log2fc_threshold,
        fdr_threshold=fdr_threshold,
        total_tested_genes=n_genes,
        up_regulated_count=up_count,
        down_regulated_count=down_count,
        not_sig_count=not_sig_count,
        results=deg_items,
        methodology_note=method_note
    )

    # Cache DEG DataFrame for downstream clustering and enrichment
    deg_df = pd.DataFrame(results_rows).set_index("gene_id")
    data["deg_results_df"] = deg_df
    data["analysis_results"]["differential"] = response

    return response
