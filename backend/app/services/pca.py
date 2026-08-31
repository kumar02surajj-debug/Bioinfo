"""
Principal Component Analysis (PCA) Service for TranscriptoX.
Runs PCA strictly on normalized log2(CPM+1) standardized expression matrices.
Computes explained variance ratios, sample projection coordinates, and gene loadings.
"""

import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import logging
from typing import List

from app.models.pca import PCAResponse, PCASampleCoord, GeneLoading
from app.services.data_processing import get_dataset
from app.services.qc import normalize_cpm_log2

logger = logging.getLogger("transcriptox.services.pca")


def compute_pca(dataset_id: str, n_components: int = 3) -> PCAResponse:
    """
    Execute standardized PCA on the normalized log2(CPM+1) expression matrix.
    """
    data = get_dataset(dataset_id)
    meta_df: pd.DataFrame = data["metadata"]

    # Ensure normalized counts exist
    norm_df: pd.DataFrame = data.get("normalized_counts")
    if norm_df is None:
        raw_df: pd.DataFrame = data["raw_counts"]
        norm_df = normalize_cpm_log2(raw_df)
        data["normalized_counts"] = norm_df

    sample_to_cond = dict(zip(meta_df["sample_id"], meta_df["condition"]))

    # Transpose so samples are rows and genes are features: (n_samples, n_genes)
    X = norm_df.T.values
    genes = list(norm_df.index)
    samples = list(norm_df.columns)

    n_samples, n_genes = X.shape
    actual_components = min(n_components, n_samples, n_genes)

    # Standardize gene expression across samples (zero mean, unit variance)
    # Filter out invariant genes (zero standard deviation across all samples)
    gene_stds = np.std(X, axis=0)
    valid_mask = gene_stds > 1e-8

    if not np.any(valid_mask):
        # Fallback if matrix is completely constant
        X_scaled = np.zeros_like(X)
    else:
        X_filtered = X[:, valid_mask]
        filtered_genes = [g for g, v in zip(genes, valid_mask) if v]
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_filtered)

    pca = PCA(n_components=actual_components)
    coords = pca.fit_transform(X_scaled)

    # Variance explained
    exp_var = [round(float(v), 4) for v in pca.explained_variance_ratio_]
    cum_var = [round(float(v), 4) for v in np.cumsum(pca.explained_variance_ratio_)]

    # Sample coordinates
    sample_coords: List[PCASampleCoord] = []
    for i, sample in enumerate(samples):
        sample_coords.append(
            PCASampleCoord(
                sample_id=str(sample),
                condition=str(sample_to_cond.get(sample, "Unknown")),
                pc1=round(float(coords[i, 0]), 4),
                pc2=round(float(coords[i, 1]), 4) if actual_components > 1 else 0.0,
                pc3=round(float(coords[i, 2]), 4) if actual_components > 2 else None,
            )
        )

    # Gene loadings for PC1 and PC2
    top_pc1: List[GeneLoading] = []
    top_pc2: List[GeneLoading] = []

    if np.any(valid_mask) and hasattr(pca, "components_"):
        # PC1 loadings
        loadings_pc1 = pca.components_[0]
        sorted_pc1_idx = np.argsort(np.abs(loadings_pc1))[::-1][:10]
        top_pc1 = [
            GeneLoading(gene_id=filtered_genes[idx], loading=round(float(loadings_pc1[idx]), 4))
            for idx in sorted_pc1_idx
        ]

        # PC2 loadings
        if actual_components > 1:
            loadings_pc2 = pca.components_[1]
            sorted_pc2_idx = np.argsort(np.abs(loadings_pc2))[::-1][:10]
            top_pc2 = [
                GeneLoading(gene_id=filtered_genes[idx], loading=round(float(loadings_pc2[idx]), 4))
                for idx in sorted_pc2_idx
            ]

    response = PCAResponse(
        dataset_id=dataset_id,
        explained_variance_ratio=exp_var,
        cumulative_variance_ratio=cum_var,
        samples=sample_coords,
        top_loadings_pc1=top_pc1,
        top_loadings_pc2=top_pc2,
        normalization_note="PCA computed on standardized log2(CPM+1) normalized expression matrix (genes with zero variance excluded)."
    )

    data["analysis_results"]["pca"] = response
    return response
