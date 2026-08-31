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
