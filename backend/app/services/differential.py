"""
Differential Expression (DEG) Analysis Service for TranscriptoX.
Implements group-wise log2 Fold Change estimation, vectorized two-sample Welch's
t-test (manual NumPy implementation to avoid scipy masked-array issues), and
Benjamini-Hochberg False Discovery Rate (FDR) multiple-testing correction.

Performance notes
-----------------
* The full t-test + BH pass is computed in one vectorized NumPy/scipy call over
  all genes simultaneously — no per-gene Python loop.
* On repeated calls with the same control/treatment pair, the expensive t-test
  and BH steps are skipped; only threshold filters are re-applied on the cached
  per-gene summary arrays (sub-millisecond for threshold slider changes).
* `results` in the response contains only significant (UP/DOWN) genes, which
  eliminates the bottleneck of constructing and JSON-serializing 22 k Pydantic
  objects. The full per-gene summary is available in `volcano_data` (compact,
  5-field VolcanoPoint objects) so the frontend volcano/MA plots still render
  all genes.
"""

import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.stats.multitest import multipletests
import logging
from typing import List, Tuple

from app.models.differential import (
    DifferentialResponse,
    DEGItem,
    VolcanoPoint,
    RegulationStatus,
)
from app.services.data_processing import get_dataset, ValidationError
from app.services.qc import normalize_cpm_log2

logger = logging.getLogger("transcriptox.services.differential")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _welch_ttest_vectorized(
    a: np.ndarray,  # (n_genes, n_a) — treatment
    b: np.ndarray,  # (n_genes, n_b) — control
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Fully vectorized Welch's two-sample t-test across all genes simultaneously.

    Uses plain NumPy arithmetic (no scipy masked-array complications from
    nan_policy='omit') and calls scipy.stats.t.sf once on the full array.

    Returns
    -------
    t_stat : np.ndarray, shape (n_genes,)
    p_values : np.ndarray, shape (n_genes,)  — two-tailed, clipped to [1e-300, 1.0]
    """
    n_a = a.shape[1]
    n_b = b.shape[1]
    n_genes = a.shape[0]

    mean_a = a.mean(axis=1)
    mean_b = b.mean(axis=1)

    # Sample variances (ddof=1); for n==1 variance is undefined → set to 0
    var_a = a.var(axis=1, ddof=1) if n_a > 1 else np.zeros(n_genes)
    var_b = b.var(axis=1, ddof=1) if n_b > 1 else np.zeros(n_genes)

    # Welch-Satterthwaite standard error and degrees of freedom
    se2_a = var_a / n_a  # variance of the mean for group a
    se2_b = var_b / n_b  # variance of the mean for group b
    se2_sum = se2_a + se2_b

    with np.errstate(divide="ignore", invalid="ignore"):
        t_stat = np.where(se2_sum > 0, (mean_a - mean_b) / np.sqrt(se2_sum), 0.0)

        # Welch-Satterthwaite degrees of freedom
        num = se2_sum ** 2
        denom = (se2_a ** 2) / max(n_a - 1, 1) + (se2_b ** 2) / max(n_b - 1, 1)
        df = np.where(denom > 0, num / denom, 1.0)
        df = np.maximum(df, 1.0)  # df must be >= 1

        # Two-tailed p-value: P(|T| >= |t|) = 2 * sf(|t|, df)
        p_values = 2.0 * stats.t.sf(np.abs(t_stat), df)

    # Sanitise: any NaN/Inf → 1.0 (uninformative, no evidence)
    p_values = np.where(np.isfinite(p_values), p_values, 1.0)
    p_values = np.clip(p_values, 1e-300, 1.0)

    return t_stat, p_values


def _apply_thresholds(
    genes: List[str],
    log2fc_values: np.ndarray,
    p_values: np.ndarray,
    adj_p_values: np.ndarray,
    ctrl_means: np.ndarray,
    trt_means: np.ndarray,
    base_means: np.ndarray,
    log2fc_threshold: float,
    fdr_threshold: float,
    dataset_id: str,
    control_group: str,
    treatment_group: str,
    n_ctrl: int,
    n_trt: int,
    methodology_note: str,
) -> DifferentialResponse:
    """
    Apply log2FC and FDR thresholds to pre-computed arrays and build the
    DifferentialResponse.  Called both from a fresh run and from the cache path.
    """
    n_genes = len(genes)

    is_up   = (adj_p_values <= fdr_threshold) & (log2fc_values >=  log2fc_threshold)
    is_down = (adj_p_values <= fdr_threshold) & (log2fc_values <= -log2fc_threshold)

    status_array: np.ndarray = np.where(
        is_up, "UP", np.where(is_down, "DOWN", "NOT_SIG")
    )

    up_count   = int(np.sum(is_up))
    down_count = int(np.sum(is_down))
    not_sig_count = n_genes - up_count - down_count

    # --- Significant DEGItem list (results) ---
    # Only construct full Pydantic objects for significant genes; sort by adj_p asc.
    sig_mask  = is_up | is_down
    sig_indices = np.where(sig_mask)[0]
    # Sort significant genes by adj_p_value ascending (already ~sorted after BH,
    # but explicit sort handles threshold-rerun reordering correctly).
    sig_indices = sig_indices[np.argsort(adj_p_values[sig_indices])]

    deg_items: List[DEGItem] = [
        DEGItem(
            gene_id=genes[i],
            mean_control=round(float(ctrl_means[i]), 3),
            mean_treatment=round(float(trt_means[i]), 3),
            log2fc=round(float(log2fc_values[i]), 4),
            p_value=float(p_values[i]),
            adj_p_value=float(adj_p_values[i]),
            status=status_array[i],
            base_mean=round(float(base_means[i]), 3),
        )
        for i in sig_indices
    ]

    # --- Compact VolcanoPoint list (volcano_data) — all genes ---
    # Use model_construct() (Pydantic v2 fast path) to skip per-field validation
    # overhead on 22k items. The arrays are already sanitised: log2fc/adj_p/base_mean
    # are finite float64 from NumPy, status is a string from np.where.
    log2fc_r   = np.round(log2fc_values, 4)
    adj_p_r    = adj_p_values           # already clipped [1e-300, 1.0]
    base_mean_r = np.round(base_means, 3)

    volcano_data: List[VolcanoPoint] = [
        VolcanoPoint.model_construct(
            gene_id=genes[i],
            log2fc=float(log2fc_r[i]),
            adj_p_value=float(adj_p_r[i]),
            base_mean=float(base_mean_r[i]),
            status=status_array[i],
        )
        for i in range(n_genes)
    ]

    return DifferentialResponse(
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
        volcano_data=volcano_data,
        methodology_note=methodology_note,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_differential_expression(
    dataset_id: str,
    control_group: str,
    treatment_group: str,
    log2fc_threshold: float = 1.0,
    fdr_threshold: float = 0.05,
) -> DifferentialResponse:
    """
    Execute differential expression analysis comparing treatment_group vs control_group.

    The function is split into two phases:

    Phase 1 — Expensive (t-test + BH):  run once per control/treatment pair on a
        given normalized matrix.  Results are cached in the session as raw NumPy
        arrays so repeated calls (e.g. threshold slider changes) skip this phase.

    Phase 2 — Cheap (threshold filter): always re-applied on cached arrays.
        Completes in microseconds regardless of gene count.
    """
    data = get_dataset(dataset_id)
    meta_df: pd.DataFrame = data["metadata"]

    # ------------------------------------------------------------------ #
    # Ensure normalized counts matrix exists (cached after first QC run)  #
    # ------------------------------------------------------------------ #
    norm_df: pd.DataFrame = data.get("normalized_counts")
    if norm_df is None:
        raw_df: pd.DataFrame = data["raw_counts"]
        logger.info(
            "Normalized counts not cached for dataset %s; computing log2(CPM+1).",
            dataset_id,
        )
        norm_df = normalize_cpm_log2(raw_df)
        data["normalized_counts"] = norm_df

    # ------------------------------------------------------------------ #
    # Validate group membership                                            #
    # ------------------------------------------------------------------ #
    ctrl_samples = meta_df[meta_df["condition"] == control_group]["sample_id"].tolist()
    trt_samples  = meta_df[meta_df["condition"] == treatment_group]["sample_id"].tolist()

    if not ctrl_samples:
        raise ValidationError(
            f"Control group '{control_group}' contains 0 samples in metadata."
        )
    if not trt_samples:
        raise ValidationError(
            f"Treatment group '{treatment_group}' contains 0 samples in metadata."
        )
    if control_group == treatment_group:
        raise ValidationError(
            "Control group and Treatment group cannot be the same condition."
        )

    n_ctrl = len(ctrl_samples)
    n_trt  = len(trt_samples)
    genes  = list(norm_df.index)
    n_genes = len(genes)

    methodology_note = (
        f"Differential expression comparing '{treatment_group}' (n={n_trt}) vs "
        f"'{control_group}' (n={n_ctrl}) using Welch's two-sample t-test on "
        f"log2(CPM+1) normalized counts with Benjamini-Hochberg FDR "
        f"multiple-testing correction. "
        f"Note: This parametric test provides an exploratory statistical "
        f"approximation compared to generalized linear negative binomial models "
        f"(e.g. DESeq2/edgeR)."
    )

    # ------------------------------------------------------------------ #
    # Cache key — invalidated whenever the group pair or matrix changes   #
    # ------------------------------------------------------------------ #
    cache_key = (control_group, treatment_group)
    deg_cache = data.get("_deg_stats_cache")

    if deg_cache is not None and deg_cache.get("key") == cache_key:
        # ---- FAST PATH: threshold-only re-run -------------------------
        logger.info(
            "DEG cache hit for (%s vs %s) on dataset %s — skipping t-test + BH, "
            "re-applying thresholds log2fc≥%.2f / FDR≤%.3f.",
            treatment_group, control_group, dataset_id, log2fc_threshold, fdr_threshold,
        )
        c = deg_cache
        response = _apply_thresholds(
            genes=c["genes"],
            log2fc_values=c["log2fc_values"],
            p_values=c["p_values"],
            adj_p_values=c["adj_p_values"],
            ctrl_means=c["ctrl_means"],
            trt_means=c["trt_means"],
            base_means=c["base_means"],
            log2fc_threshold=log2fc_threshold,
            fdr_threshold=fdr_threshold,
            dataset_id=dataset_id,
            control_group=control_group,
            treatment_group=treatment_group,
            n_ctrl=n_ctrl,
            n_trt=n_trt,
            methodology_note=methodology_note,
        )
        data["analysis_results"]["differential"] = response
        return response

    # ------------------------------------------------------------------ #
    # FULL PATH: compute t-test + BH for this control/treatment pair       #
    # ------------------------------------------------------------------ #
    logger.info(
        "Running DEG full computation: %s (n=%d) vs %s (n=%d), %d genes, dataset %s.",
        treatment_group, n_trt, control_group, n_ctrl, n_genes, dataset_id,
    )

    # Validate that all requested samples actually exist in the matrix
    missing_ctrl = [s for s in ctrl_samples if s not in norm_df.columns]
    missing_trt  = [s for s in trt_samples  if s not in norm_df.columns]
    if missing_ctrl:
        raise ValidationError(
            f"Control samples not found in expression matrix: {', '.join(missing_ctrl[:4])}"
        )
    if missing_trt:
        raise ValidationError(
            f"Treatment samples not found in expression matrix: {', '.join(missing_trt[:4])}"
        )

    # Subset matrices: shape (n_genes, n_samples)
    ctrl_matrix = norm_df[ctrl_samples].values.astype(np.float64)
    trt_matrix  = norm_df[trt_samples].values.astype(np.float64)

    # ---- Means & base mean ------------------------------------------ #
    ctrl_means = ctrl_matrix.mean(axis=1)   # (n_genes,)
    trt_means  = trt_matrix.mean(axis=1)    # (n_genes,)
    base_means = (ctrl_matrix.sum(axis=1) + trt_matrix.sum(axis=1)) / (n_ctrl + n_trt)

    # Log2FC = mean(treatment) − mean(control) on log2-CPM scale
    log2fc_values = trt_means - ctrl_means

    # ---- Vectorized Welch's t-test ----------------------------------- #
    # Manual NumPy implementation — avoids scipy's masked-array return
    # when nan_policy='omit' is used with a 2-D array (scipy ≥ 1.9 bug).
    _, p_values = _welch_ttest_vectorized(trt_matrix, ctrl_matrix)

    # ---- Diagnostic logging ----------------------------------------- #
    nan_count = int(np.sum(~np.isfinite(p_values)))
    logger.info(
        "Raw p-value stats — min: %.3e  max: %.3f  mean: %.3f  NaN/Inf: %d / %d",
        float(np.min(p_values)), float(np.max(p_values)),
        float(np.mean(p_values)), nan_count, n_genes,
    )

    # ---- Benjamini-Hochberg FDR ------------------------------------- #
    # multipletests expects a clean float array; p_values is already sanitised
    # inside _welch_ttest_vectorized.
    _, adj_p_values, _, _ = multipletests(p_values, alpha=fdr_threshold, method="fdr_bh")
    adj_p_values = np.clip(adj_p_values, 1e-300, 1.0)

    n_passing_fdr = int(np.sum(adj_p_values <= fdr_threshold))
    logger.info(
        "After BH correction — genes with adj_p ≤ %.3f: %d / %d",
        fdr_threshold, n_passing_fdr, n_genes,
    )

    # ---- Cache the per-gene stats arrays (NOT the thresholded output) -- #
    data["_deg_stats_cache"] = {
        "key":          cache_key,
        "genes":        genes,
        "log2fc_values": log2fc_values,
        "p_values":     p_values,
        "adj_p_values": adj_p_values,
        "ctrl_means":   ctrl_means,
        "trt_means":    trt_means,
        "base_means":   base_means,
    }

    # ---- Apply thresholds & build response -------------------------- #
    response = _apply_thresholds(
        genes=genes,
        log2fc_values=log2fc_values,
        p_values=p_values,
        adj_p_values=adj_p_values,
        ctrl_means=ctrl_means,
        trt_means=trt_means,
        base_means=base_means,
        log2fc_threshold=log2fc_threshold,
        fdr_threshold=fdr_threshold,
        dataset_id=dataset_id,
        control_group=control_group,
        treatment_group=treatment_group,
        n_ctrl=n_ctrl,
        n_trt=n_trt,
        methodology_note=methodology_note,
    )

    logger.info(
        "DEG result — UP: %d  DOWN: %d  NOT_SIG: %d  (log2fc≥%.2f, FDR≤%.3f)",
        response.up_regulated_count, response.down_regulated_count,
        response.not_sig_count, log2fc_threshold, fdr_threshold,
    )

    # ---- Store full deg_results_df for downstream clustering/enrichment #
    # This uses the adj_p_values and log2fc from the FULL run; downstream
    # services (clustering, enrichment) call get_dataset() directly and read
    # deg_results_df — they never touch the HTTP response object.
    is_up_full   = (adj_p_values <= fdr_threshold) & (log2fc_values >=  log2fc_threshold)
    is_down_full = (adj_p_values <= fdr_threshold) & (log2fc_values <= -log2fc_threshold)
    status_arr   = np.where(is_up_full, "UP", np.where(is_down_full, "DOWN", "NOT_SIG"))

    deg_df = pd.DataFrame(
        {
            "gene_id":       genes,
            "mean_control":  ctrl_means,
            "mean_treatment": trt_means,
            "log2fc":        log2fc_values,
            "p_value":       p_values,
            "adj_p_value":   adj_p_values,
            "status":        status_arr,
            "base_mean":     base_means,
        }
    ).set_index("gene_id")

    data["deg_results_df"] = deg_df
    data["analysis_results"]["differential"] = response

    return response
