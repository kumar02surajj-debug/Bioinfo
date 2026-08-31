"""
Synthetic Demo Dataset Generator for TranscriptoX
Generates realistic RNA-seq count matrices, sample metadata, and survival timeline.
Clearly labeled as DEMO / SYNTHETIC DATA.
"""

import numpy as np
import pandas as pd
from pathlib import Path

def generate_demo_files(output_dir: Path):
    np.random.seed(42)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 16 samples: 8 Control, 8 Treatment
    samples = [f"Sample_Ctrl_{i+1:02d}" for i in range(8)] + [f"Sample_Trt_{i+1:02d}" for i in range(8)]
    conditions = ["Control"] * 8 + ["Treatment"] * 8
    batches = ["Batch1", "Batch1", "Batch2", "Batch2"] * 4
    tissue_types = ["Primary_Tissue"] * 16

    # 600 realistic genes
    known_genes = [
        "TP53", "EGFR", "MYC", "VEGFA", "TNF", "IL6", "STAT1", "STAT3", "CDK1", "CDK2",
        "CCND1", "BRCA1", "BRCA2", "PTEN", "AKT1", "MTOR", "HIF1A", "CASP3", "CASP8",
        "BAX", "BCL2", "MKI67", "PCNA", "CXCL8", "CCL2", "ICAM1", "VCAM1", "MMP9", "MMP2",
        "FOXO3", "SNAI1", "TWIST1", "CDH1", "CDH2", "VIM", "FN1", "COL1A1", "ACTA2", "TGFB1",
        "SMAD2", "SMAD3", "JUN", "FOS", "NFKB1", "RELA", "IL1B", "IFNG", "IRF1", "GAPDH", "ACTB"
    ]
    # Fill up to 600 genes with systematic identifiers
    remaining_genes = [f"GENE_{i+1:04d}" for i in range(len(known_genes), 600)]
    all_genes = known_genes + remaining_genes

    # Base baseline expression (log-normal distribution)
    base_expr = np.random.lognormal(mean=5.0, sigma=1.8, size=(600, 1))

    # Generate count matrix
    # Add biological variation and differential expression
    counts = np.zeros((600, 16), dtype=int)

    for i, gene in enumerate(all_genes):
        # 50 genes strongly upregulated in Treatment (fold change 2.5x to 6x)
        # 50 genes strongly downregulated in Treatment (fold change 0.15x to 0.4x)
        # Remaining genes are non-differentially expressed with standard noise
        if i < 50:
            fc = np.random.uniform(2.5, 6.0)
            ctrl_mult = 1.0
            trt_mult = fc
        elif i < 100:
            fc = np.random.uniform(0.15, 0.45)
            ctrl_mult = 1.0
            trt_mult = fc
        else:
            ctrl_mult = 1.0
            trt_mult = np.random.uniform(0.85, 1.15)

        for j in range(16):
            mult = ctrl_mult if j < 8 else trt_mult
            # Negative binomial / Poisson like count generation
            mean_val = max(1.0, base_expr[i, 0] * mult)
            # Add sample-specific dispersion
            sample_val = np.random.negative_binomial(n=20, p=20.0 / (20.0 + mean_val))
            counts[i, j] = int(sample_val)

    # Create DataFrames
    expr_df = pd.DataFrame(counts, index=all_genes, columns=samples)
    expr_df.index.name = "gene_id"

    metadata_df = pd.DataFrame({
        "sample_id": samples,
        "condition": conditions,
        "batch": batches,
        "tissue_type": tissue_types
    })

    # Survival data: Treatment with high expression of marker genes has differential survival
    # Follow-up time in months (6 to 60 months)
    survival_times = []
    survival_events = []
    for j in range(16):
        is_trt = (j >= 8)
        # Base time
        if is_trt:
            t = np.random.exponential(scale=24.0) + 10.0
            evt = 1 if np.random.rand() < 0.7 else 0
        else:
            t = np.random.exponential(scale=38.0) + 15.0
            evt = 1 if np.random.rand() < 0.45 else 0
        t = round(float(min(60.0, max(4.0, t))), 1)
        survival_times.append(t)
        survival_events.append(evt)

    survival_df = pd.DataFrame({
        "sample_id": samples,
        "time": survival_times,
        "event": survival_events
    })

    # Save to CSV
    expr_df.to_csv(output_dir / "expression.csv")
    metadata_df.to_csv(output_dir / "metadata.csv", index=False)
    survival_df.to_csv(output_dir / "survival.csv", index=False)

    print(f"Generated synthetic demo dataset in {output_dir}")
    print(f"Expression matrix: {expr_df.shape[0]} genes x {expr_df.shape[1]} samples")
    print(f"Metadata: {len(metadata_df)} samples")
    print(f"Survival data: {len(survival_df)} samples")

if __name__ == "__main__":
    generate_demo_files(Path("TranscriptoX/data/example"))
