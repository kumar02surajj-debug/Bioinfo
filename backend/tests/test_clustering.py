import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_clustering_workflow():
    # 1. Load demo dataset
    upload_res = client.post("/api/upload/demo")
    dataset_id = upload_res.json()["dataset_id"]

    # 2. Run DEG first
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

    # 3. Run Clustering on Top 30 DEGs
    cluster_res = client.post(
        "/api/clustering",
        json={
            "dataset_id": dataset_id,
            "deg_top_n": 30,
            "distance_metric": "euclidean",
            "linkage_method": "average",
        }
    )
    assert cluster_res.status_code == 200
    c_data = cluster_res.json()

    assert len(c_data["gene_ids"]) == 30
    assert len(c_data["sample_ids"]) == 16
    assert len(c_data["z_scores"]) == 30
    assert len(c_data["z_scores"][0]) == 16
    assert len(c_data["sample_conditions"]) == 16
