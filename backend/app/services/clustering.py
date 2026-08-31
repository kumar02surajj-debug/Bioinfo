"""
Hierarchical Clustering & Heatmap Service for TranscriptoX.
Implements DEG subset filtering, row-wise Z-score scaling, and SciPy hierarchical clustering.
"""

import numpy as np
import pandas as pd
from scipy.cluster.hierarchy import linkage, leaves_list
from scipy.spatial.distance import pdist
import logging
from typing import List, Union, Optional

from app.models.clustering import ClusteringResponse
from app.services.data_processing import get_dataset, ValidationError
from app.services.qc import normalize_cpm_log2

logger = logging.getLogger("transcriptox.services.clustering")


def compute_clustering(
    dataset_id: str,
    deg_top_n: Union[int, str] = 50,
    distance_metric: str = "euclidean",
    linkage_method: str = "average",
    custom_genes: Optional[List[str]] = None,
    cluster_samples: bool = True,
    cluster_genes: bool = True
) -> ClusteringResponse:
    """
    Execute hierarchical clustering on selected DEGs or top variable genes.
    """
    data = get_dataset(dataset_id)
    meta_df: pd.DataFrame = data["metadata"]

    norm_df: pd.DataFrame = data.get("normalized_counts")
    if norm_df is None:
        raw_df: pd.DataFrame = data["raw_counts"]
        norm_df = normalize_cpm_log2(raw_df)
        data["normalized_counts"] = norm_df

    sample_to_cond = dict(zip(meta_df["sample_id"], meta_df["condition"]))

    # 1. Select Gene Subset
    selected_genes: List[str] = []

    if custom_genes and len(custom_genes) > 0:
        clean_custom = [g.strip() for g in custom_genes if g.strip() in norm_df.index]
        if not clean_custom:
            raise ValidationError("None of the specified custom genes were found in the dataset matrix.")
        selected_genes = clean_custom
    elif "deg_results_df" in data:
        deg_df: pd.DataFrame = data["deg_results_df"]
        sig_degs = deg_df[deg_df["status"].isin(["UP", "DOWN"])].sort_values("adj_p_value")

        if not sig_degs.empty:
            if str(deg_top_n).lower() == "all":
                selected_genes = sig_degs.index.tolist()
            else:
                top_k = int(deg_top_n) if str(deg_top_n).isdigit() else 50
                selected_genes = sig_degs.index[:top_k].tolist()
        else:
            # Fallback to genes sorted by lowest p-value
            top_k = int(deg_top_n) if str(deg_top_n).isdigit() else 50
            selected_genes = deg_df.sort_values("adj_p_value").index[:top_k].tolist()
    else:
        # Fallback to top variable genes across dataset
        top_k = int(deg_top_n) if str(deg_top_n).isdigit() else 50
        stds = norm_df.std(axis=1)
        selected_genes = stds.sort_values(ascending=False).index[:top_k].tolist()

    if len(selected_genes) < 2:
        raise ValidationError("At least 2 genes are required to perform hierarchical clustering.")

    # Extract submatrix (n_genes, n_samples)
    sub_df = norm_df.loc[selected_genes]
    samples = list(sub_df.columns)

    # 2. Row-wise Z-score Scaling across samples
    # Z = (x - mean) / std per gene row
    means = sub_df.mean(axis=1)
    stds = sub_df.std(axis=1).replace(0, 1.0)
    z_df = sub_df.sub(means, axis=0).div(stds, axis=0).fillna(0.0)
    # Clip extreme Z-scores to [-3, 3] for optimal heatmap contrast
    z_matrix = np.clip(z_df.values, -3.0, 3.0)

    # 3. Hierarchical Linkage and Ordering
    valid_metric = distance_metric.lower()
    valid_linkage = linkage_method.lower()

    # Ward requires euclidean distance
    if valid_linkage == "ward":
        valid_metric = "euclidean"

    n_genes, n_samples = z_matrix.shape

    # Gene clustering (Rows)
    gene_order = list(range(n_genes))
    if cluster_genes and n_genes > 1:
        try:
            gene_linkage = linkage(z_matrix, method=valid_linkage, metric=valid_metric)
            gene_order = leaves_list(gene_linkage).tolist()
        except Exception as e:
            logger.warning(f"Gene linkage failed with {valid_linkage}/{valid_metric}, falling back to average/euclidean: {e}")
            gene_linkage = linkage(z_matrix, method="average", metric="euclidean")
            gene_order = leaves_list(gene_linkage).tolist()

    # Sample clustering (Columns)
    sample_order = list(range(n_samples))
    if cluster_samples and n_samples > 1:
        try:
            sample_linkage = linkage(z_matrix.T, method=valid_linkage, metric=valid_metric)
            sample_order = leaves_list(sample_linkage).tolist()
        except Exception as e:
            logger.warning(f"Sample linkage failed: {e}")
            sample_linkage = linkage(z_matrix.T, method="average", metric="euclidean")
            sample_order = leaves_list(sample_linkage).tolist()

    # Reorder according to dendrogram leaves
    ordered_genes = [selected_genes[i] for i in gene_order]
    ordered_samples = [samples[j] for j in sample_order]
    ordered_z_matrix = z_matrix[gene_order, :][:, sample_order].round(3).tolist()
    ordered_conditions = [sample_to_cond.get(s, "Unknown") for s in ordered_samples]

    response = ClusteringResponse(
        dataset_id=dataset_id,
        gene_ids=ordered_genes,
        sample_ids=ordered_samples,
        z_scores=ordered_z_matrix,
        sample_conditions=ordered_conditions,
        distance_metric=valid_metric,
        linkage_method=valid_linkage,
        gene_order_indices=gene_order,
        sample_order_indices=sample_order
    )

    data["analysis_results"]["clustering"] = response
    return response
