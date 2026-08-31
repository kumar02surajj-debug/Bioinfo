import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_qc_and_pca_workflow():
    # 1. Load demo dataset
    upload_res = client.post("/api/upload/demo")
    assert upload_res.status_code == 200
    dataset_id = upload_res.json()["dataset_id"]

    # 2. Run QC
    qc_res = client.post("/api/qc", json={"dataset_id": dataset_id, "normalization": "log2_cpm"})
    assert qc_res.status_code == 200
    qc_data = qc_res.json()
    assert qc_data["summary"]["total_genes"] == 600
    assert qc_data["summary"]["total_samples"] == 16
    assert len(qc_data["library_sizes"]) == 16
    assert len(qc_data["expression_distributions"]) == 16
    assert len(qc_data["correlation"]["matrix"]) == 16
    assert len(qc_data["transformed_matrix_preview"]["values"]) > 0

    # 3. Run PCA
    pca_res = client.post("/api/pca", json={"dataset_id": dataset_id, "n_components": 3})
    assert pca_res.status_code == 200
    pca_data = pca_res.json()
    assert len(pca_data["samples"]) == 16
    assert len(pca_data["explained_variance_ratio"]) == 3
    assert sum(pca_data["explained_variance_ratio"]) <= 1.01
    assert len(pca_data["top_loadings_pc1"]) > 0
    assert len(pca_data["top_loadings_pc2"]) > 0
    assert "log2(CPM+1)" in pca_data["normalization_note"]
