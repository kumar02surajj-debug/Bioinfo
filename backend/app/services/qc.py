"""
Quality Control (QC) Computation Service for TranscriptoX.
Calculates library sizes, zero-count statistics, sample-level expression distributions,
sample-sample correlation matrix, and normalized log2(CPM+1) counts.
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict, Any

from app.models.qc import (
    QCResponse,
    QCSummaryMetrics,
    LibrarySizeItem,
    ExpressionDistItem,
    CorrelationMatrixData,
    TransformedMatrixPreview,
)
from app.services.data_processing import get_dataset, save_dataset_session

logger = logging.getLogger("transcriptox.services.qc")


def normalize_cpm_log2(raw_counts: pd.DataFrame, prior_count: float = 1.0) -> pd.DataFrame:
    """
    Computes standard log2(CPM + 1) normalized expression matrix.
    
    If the expression matrix is already log-transformed or pre-normalized (max value <= 50.0),
    returns raw_counts directly to avoid double-normalization log2FC compression.
    """
    vals = raw_counts.values.astype(np.float64)
    max_val = float(np.nanmax(vals)) if vals.size > 0 else 0.0
    min_val = float(np.nanmin(vals)) if vals.size > 0 else 0.0

    # If max value <= 50.0 and min >= 0.0, the matrix is already log-scale/normalized!
    if max_val <= 50.0 and min_val >= 0.0 and max_val > 0.0:
        logger.info(
            "Expression matrix is pre-normalized / log-transformed (max=%.2f, min=%.2f). Using directly.",
            max_val, min_val,
        )
        return raw_counts.copy()

    lib_sizes = raw_counts.sum(axis=0)
    lib_sizes = lib_sizes.replace(0, 1.0)
    cpm = (raw_counts / lib_sizes) * 1e6
    log2_cpm = np.log2(cpm + prior_count)
    return log2_cpm


def compute_qc(dataset_id: str, normalization: str = "log2_cpm") -> QCResponse:
    """
    Execute comprehensive QC analysis on the dataset.
    Stores the normalized expression matrix in the dataset session.
    """
    data = get_dataset(dataset_id)
    raw_df: pd.DataFrame = data["raw_counts"]
    meta_df: pd.DataFrame = data["metadata"]

    sample_to_cond = dict(zip(meta_df["sample_id"], meta_df["condition"]))

    # 1. Library sizes
    lib_sizes_series = raw_df.sum(axis=0)
    library_sizes = [
        LibrarySizeItem(
            sample_id=str(sample),
            condition=str(sample_to_cond.get(sample, "Unknown")),
            library_size=float(lib_sizes_series[sample])
        )
        for sample in raw_df.columns
    ]

    # 2. Normalization
    norm_df = normalize_cpm_log2(raw_df)
    data["normalized_counts"] = norm_df
    save_dataset_session(dataset_id)

    # 3. Summary metrics
    total_genes = int(raw_df.shape[0])
    total_samples = int(raw_df.shape[1])
    zero_genes_count = int((raw_df == 0).all(axis=1).sum())
    total_zeros = int((raw_df == 0).sum().sum())
    zero_fraction = float(total_zeros / (total_genes * total_samples)) if (total_genes * total_samples) > 0 else 0.0

    summary = QCSummaryMetrics(
        total_genes=total_genes,
        total_samples=total_samples,
        mean_library_size=float(lib_sizes_series.mean()),
        median_library_size=float(lib_sizes_series.median()),
        genes_with_zero_counts=zero_genes_count,
        zero_fraction_total=round(zero_fraction, 4),
        normalization_applied="log2(CPM + 1) [Counts Per Million]"
    )

    # 4. Expression distributions (on normalized log2-CPM counts)
    expr_distributions = []
    for sample in norm_df.columns:
        s_vals = norm_df[sample]
        expr_distributions.append(
            ExpressionDistItem(
                sample_id=str(sample),
                condition=str(sample_to_cond.get(sample, "Unknown")),
                min=round(float(s_vals.min()), 3),
                q1=round(float(s_vals.quantile(0.25)), 3),
                median=round(float(s_vals.median()), 3),
                q3=round(float(s_vals.quantile(0.75)), 3),
                max=round(float(s_vals.max()), 3),
                mean=round(float(s_vals.mean()), 3),
            )
        )

    # 5. Sample correlation matrix
    # Compute Pearson correlation across samples using normalized counts
    corr_matrix = norm_df.corr(method="pearson").round(4).values.tolist()
    correlation_data = CorrelationMatrixData(
        samples=list(norm_df.columns),
        conditions=[sample_to_cond.get(s, "Unknown") for s in norm_df.columns],
        matrix=corr_matrix
    )

    # 6. Transformed matrix preview
    preview_genes = list(norm_df.index[:10])
    preview_samples = list(norm_df.columns[:10])
    preview_values = norm_df.loc[preview_genes, preview_samples].round(3).values.tolist()

    response = QCResponse(
        dataset_id=dataset_id,
        summary=summary,
        library_sizes=library_sizes,
        expression_distributions=expr_distributions,
        correlation=correlation_data,
        transformed_matrix_preview=TransformedMatrixPreview(
            genes=preview_genes,
            samples=preview_samples,
            values=preview_values
        )
    )

    data["analysis_results"]["qc"] = response
    return response
