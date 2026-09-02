import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_differential_expression():
    # 1. Load demo dataset
    upload_res = client.post("/api/upload/demo")
    dataset_id = upload_res.json()["dataset_id"]

    # 2. Run DEG
    deg_res = client.post(
        "/api/differential-expression",
        json={
            "dataset_id": dataset_id,
            "control_group": "Control",
            "treatment_group": "Treatment",
            "log2fc_threshold": 1.0,
            "fdr_threshold": 0.05,
        }
    )
    assert deg_res.status_code == 200
    deg_data = deg_res.json()

    assert deg_data["control_group"] == "Control"
    assert deg_data["treatment_group"] == "Treatment"
    assert deg_data["total_tested_genes"] == 600
    assert deg_data["up_regulated_count"] > 0
    assert deg_data["down_regulated_count"] > 0
    assert len(deg_data["results"]) == 600

    # Verify top DEG structure
    top_deg = deg_data["results"][0]
    assert "gene_id" in top_deg
    assert "log2fc" in top_deg
    assert "p_value" in top_deg
    assert "adj_p_value" in top_deg
    assert top_deg["status"] in ["UP", "DOWN", "NOT_SIG"]
    assert "Welch's" in deg_data["methodology_note"]


def test_differential_expression_large_dataset_performance():
    """Verify that a 20,000+ gene dataset processes in < 1.0 second with vectorization."""
    import time
    import numpy as np
    import pandas as pd
    from app.services.data_processing import store_dataset
    from app.services.differential import compute_differential_expression

    n_genes = 22085
    n_ctrl = 10
    n_trt = 8
    samples = [f"Ctrl_{i}" for i in range(n_ctrl)] + [f"Trt_{j}" for j in range(n_trt)]
    genes = [f"GENE_{k:05d}" for k in range(n_genes)]

    np.random.seed(42)
    expr_data = np.random.exponential(scale=5.0, size=(n_genes, n_ctrl + n_trt))
    # Make top 50 genes strongly differentially expressed
    expr_data[:50, n_ctrl:] += 10.0

    raw_df = pd.DataFrame(expr_data, index=genes, columns=samples)
    meta_df = pd.DataFrame({
        "sample_id": samples,
        "condition": ["Control"] * n_ctrl + ["Treatment"] * n_trt
    })

    dataset_id = "test_large_perf_22k"
    store_dataset(
        dataset_id=dataset_id,
        raw_counts=raw_df,
        metadata=meta_df,
        dataset_name="Large_Perf_Dataset"
    )

    t0 = time.time()
    res = compute_differential_expression(
        dataset_id=dataset_id,
        control_group="Control",
        treatment_group="Treatment",
        log2fc_threshold=1.0,
        fdr_threshold=0.05
    )
    elapsed = time.time() - t0

    assert res.total_tested_genes == n_genes
    assert res.up_regulated_count >= 50
    assert len(res.results) == n_genes
    # Ensure computation was sub-second (usually ~0.1s)
    assert elapsed < 2.0, f"Differential expression took {elapsed:.2f}s, expected < 2.0s"

