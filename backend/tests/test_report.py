import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_full_pipeline_and_report_generation():
    # 1. Load demo dataset
    upload_res = client.post("/api/upload/demo")
    assert upload_res.status_code == 200
    dataset_id = upload_res.json()["dataset_id"]

    # 2. Run QC & PCA
    client.post("/api/qc", json={"dataset_id": dataset_id, "normalization": "log2_cpm"})
    client.post("/api/pca", json={"dataset_id": dataset_id, "n_components": 3})

    # 3. Run DEG
    client.post(
        "/api/differential-expression",
        json={
            "dataset_id": dataset_id,
            "control_group": "Control",
            "treatment_group": "Treatment",
            "log2fc_threshold": 1.0,
            "fdr_threshold": 0.05,
        }
    )

    # 4. Run Clustering
    client.post(
        "/api/clustering",
        json={
            "dataset_id": dataset_id,
            "deg_top_n": 30,
            "distance_metric": "euclidean",
            "linkage_method": "average",
        }
    )

    # 5. Run Survival
    client.post(
        "/api/survival",
        json={
            "dataset_id": dataset_id,
            "gene_id": "TP53",
            "split_method": "median",
        }
    )

    # 6. Generate Report
    report_res = client.post(
        "/api/report",
        json={
            "dataset_id": dataset_id,
            "include_qc": True,
            "include_pca": True,
            "include_deg": True,
            "include_clustering": True,
            "include_enrichment": True,
            "include_survival": True,
        }
    )
    assert report_res.status_code == 200
    assert "text/html" in report_res.headers["content-type"]
    html = report_res.text
    assert "TranscriptoX" in html
    assert "Quality Control" in html
    assert "Differential Gene Expression" in html
    assert "Methodology Transparency" in html
