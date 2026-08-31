import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_survival_analysis():
    # 1. Load demo dataset (has survival data)
    upload_res = client.post("/api/upload/demo")
    assert upload_res.status_code == 200
    dataset_id = upload_res.json()["dataset_id"]

    # 2. Run Survival analysis on TP53
    surv_res = client.post(
        "/api/survival",
        json={
            "dataset_id": dataset_id,
            "gene_id": "TP53",
            "split_method": "median",
        }
    )
    assert surv_res.status_code == 200
    s_data = surv_res.json()

    assert s_data["gene_id"] == "TP53"
    assert s_data["split_method"] == "median"
    assert s_data["high_group"]["sample_count"] > 0
    assert s_data["low_group"]["sample_count"] > 0
    assert len(s_data["high_group"]["km_curve"]) > 0
    assert len(s_data["low_group"]["km_curve"]) > 0
    assert "hazard_ratio" in s_data
    assert "log_rank_p_value" in s_data
    assert len(s_data["risk_table"]) == 6
    assert "statistically associated" in s_data["association_disclaimer"]
