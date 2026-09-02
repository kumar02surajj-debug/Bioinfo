import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_load_demo_endpoint():
    response = client.post("/api/upload/demo")
    assert response.status_code == 200
    data = response.json()
    assert "dataset_id" in data
    assert data["gene_count"] == 600
    assert data["sample_count"] == 16
    assert data["is_demo"] is True
    assert data["has_survival"] is True
    assert len(data["conditions"]) == 2
    assert "Control" in data["conditions"]
    assert "Treatment" in data["conditions"]


def test_upload_valid_csv():
    expr_csv = (
        "gene_id,S1,S2,S3,S4\n"
        "TP53,100,120,5,10\n"
        "EGFR,50,45,200,210\n"
        "MYC,10,12,300,320\n"
    )
    meta_csv = (
        "sample_id,condition\n"
        "S1,Control\n"
        "S2,Control\n"
        "S3,Treatment\n"
        "S4,Treatment\n"
    )
    files = {
        "expression_file": ("expression.csv", expr_csv.encode("utf-8"), "text/csv"),
        "metadata_file": ("metadata.csv", meta_csv.encode("utf-8"), "text/csv"),
    }
    response = client.post("/api/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["gene_count"] == 3
    assert data["sample_count"] == 4
    assert data["has_survival"] is False


def test_upload_mismatched_samples_error():
    expr_csv = "gene_id,S1,S2\nTP53,10,20\n"
    meta_csv = "sample_id,condition\nS1,Control\nS3,Treatment\n" # S3 not in expr
    files = {
        "expression_file": ("expression.csv", expr_csv.encode("utf-8"), "text/csv"),
        "metadata_file": ("metadata.csv", meta_csv.encode("utf-8"), "text/csv"),
    }
    response = client.post("/api/upload", files=files)
    assert response.status_code == 400
    assert "Sample IDs in metadata do not match" in response.json()["detail"]


def test_upload_duplicate_genes_error():
    expr_csv = "gene_id,S1,S2\nTP53,10,20\nTP53,30,40\n"
    meta_csv = "sample_id,condition\nS1,Control\nS2,Treatment\n"
    files = {
        "expression_file": ("expression.csv", expr_csv.encode("utf-8"), "text/csv"),
        "metadata_file": ("metadata.csv", meta_csv.encode("utf-8"), "text/csv"),
    }
    response = client.post("/api/upload", files=files)
    assert response.status_code == 400
    assert "duplicate gene IDs" in response.json()["detail"]


def test_upload_valid_tab_delimited_txt_and_run_deg():
    expr_tsv = (
        "gene_id\tS1\tS2\tS3\tS4\n"
        "TP53\t100\t120\t5\t10\n"
        "EGFR\t50\t45\t200\t210\n"
        "MYC\t10\t12\t300\t320\n"
        "BRCA1\t80\t85\t15\t20\n"
    )
    meta_tsv = (
        "sample_id\tcondition\n"
        "S1\tControl\n"
        "S2\tControl\n"
        "S3\tTreatment\n"
        "S4\tTreatment\n"
    )
    files = {
        "expression_file": ("expression.txt", expr_tsv.encode("utf-8"), "text/plain"),
        "metadata_file": ("metadata.txt", meta_tsv.encode("utf-8"), "text/plain"),
    }
    upload_res = client.post("/api/upload", files=files)
    assert upload_res.status_code == 200
    data = upload_res.json()
    assert data["gene_count"] == 4
    assert data["sample_count"] == 4
    assert "dataset_id" in data
    dataset_id = data["dataset_id"]

    # Test running DEG on tab-delimited uploaded dataset
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
    assert deg_data["total_tested_genes"] == 4
    assert deg_data["up_regulated_count"] + deg_data["down_regulated_count"] > 0


def test_upload_valid_whitespace_delimited_txt():
    expr_ws = (
        "gene_id  S1  S2  S3  S4\n"
        "TP53  100  120  5  10\n"
        "EGFR  50  45  200  210\n"
    )
    meta_csv = (
        "sample_id,condition\n"
        "S1,Control\n"
        "S2,Control\n"
        "S3,Treatment\n"
        "S4,Treatment\n"
    )
    files = {
        "expression_file": ("expression.txt", expr_ws.encode("utf-8"), "text/plain"),
        "metadata_file": ("metadata.csv", meta_csv.encode("utf-8"), "text/csv"),
    }
    response = client.post("/api/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["gene_count"] == 2
    assert data["sample_count"] == 4


def test_upload_malformed_txt_error():
    malformed_txt = "invalid_header_only_no_samples\njust_one_word\n"
    meta_csv = "sample_id,condition\nS1,Control\nS2,Treatment\n"
    files = {
        "expression_file": ("malformed.txt", malformed_txt.encode("utf-8"), "text/plain"),
        "metadata_file": ("metadata.csv", meta_csv.encode("utf-8"), "text/csv"),
    }
    response = client.post("/api/upload", files=files)
    assert response.status_code == 400
    # Must provide friendly error, not raw python crash
    detail = response.json()["detail"]
    assert "Could not parse this file as a gene expression matrix" in detail or "at least 2 sample columns" in detail


def test_single_file_upload_with_auto_detected_groups_and_confirmation():
    expr_csv = (
        "gene_id,Control_1,Control_2,SALS_1,SALS_2\n"
        "TP53,100,120,5,10\n"
        "EGFR,50,45,200,210\n"
        "MYC,10,12,300,320\n"
        "SOD1,80,90,15,20\n"
    )
    files = {
        "expression_file": ("expression.csv", expr_csv.encode("utf-8"), "text/csv"),
    }
    upload_res = client.post("/api/upload", files=files)
    assert upload_res.status_code == 200
    data = upload_res.json()
    assert data["requires_group_confirmation"] is True
    assert data["group_pattern_detected"] is True
    assert data["suggested_groups"] == {
        "Control_1": "Control",
        "Control_2": "Control",
        "SALS_1": "SALS",
        "SALS_2": "SALS",
    }
    dataset_id = data["dataset_id"]

    # Trying to run DEG before confirmation must fail with a friendly message
    deg_blocked_res = client.post(
        "/api/differential-expression",
        json={
            "dataset_id": dataset_id,
            "control_group": "Control",
            "treatment_group": "SALS",
        }
    )
    assert deg_blocked_res.status_code == 400
    assert "condition groups have not been confirmed" in deg_blocked_res.json()["detail"].lower()

    # Now confirm the metadata
    confirm_res = client.post(
        "/api/upload/confirm-metadata",
        json={
            "dataset_id": dataset_id,
            "sample_conditions": data["suggested_groups"]
        }
    )
    assert confirm_res.status_code == 200
    confirmed_data = confirm_res.json()
    assert confirmed_data["requires_group_confirmation"] is False
    assert len(confirmed_data["conditions"]) == 2
    assert "Control" in confirmed_data["conditions"]
    assert "SALS" in confirmed_data["conditions"]
    assert confirmed_data["condition_counts"]["Control"] == 2
    assert confirmed_data["condition_counts"]["SALS"] == 2
    assert len(confirmed_data["metadata_preview"]) == 4

    # Run DEG on confirmed dataset
    deg_res = client.post(
        "/api/differential-expression",
        json={
            "dataset_id": dataset_id,
            "control_group": "Control",
            "treatment_group": "SALS",
            "log2fc_threshold": 1.0,
            "fdr_threshold": 0.05,
        }
    )
    assert deg_res.status_code == 200
    deg_data = deg_res.json()
    assert deg_data["total_tested_genes"] == 4
    assert deg_data["up_regulated_count"] + deg_data["down_regulated_count"] > 0


def test_single_file_upload_no_pattern_fallback_manual_assignment():
    expr_csv = (
        "gene_id,DonorA,DonorB,PatientC,PatientD\n"
        "TP53,100,120,5,10\n"
        "EGFR,50,45,200,210\n"
    )
    files = {
        "expression_file": ("expression.csv", expr_csv.encode("utf-8"), "text/csv"),
    }
    upload_res = client.post("/api/upload", files=files)
    assert upload_res.status_code == 200
    data = upload_res.json()
    assert data["requires_group_confirmation"] is True
    # All 4 samples unique after any trailing stripping -> no pattern detected
    assert data["group_pattern_detected"] is False
    dataset_id = data["dataset_id"]

    # Manual assignment with missing sample should fail
    bad_confirm = client.post(
        "/api/upload/confirm-metadata",
        json={
            "dataset_id": dataset_id,
            "sample_conditions": {
                "DonorA": "Healthy",
                "DonorB": "Healthy",
            }
        }
    )
    assert bad_confirm.status_code == 400
    assert "Missing condition assignment" in bad_confirm.json()["detail"]

    # Manual assignment with only 1 condition group should fail
    one_group_confirm = client.post(
        "/api/upload/confirm-metadata",
        json={
            "dataset_id": dataset_id,
            "sample_conditions": {
                "DonorA": "Healthy",
                "DonorB": "Healthy",
                "PatientC": "Healthy",
                "PatientD": "Healthy",
            }
        }
    )
    assert one_group_confirm.status_code == 400
    assert "Only 1 distinct condition group" in one_group_confirm.json()["detail"]

    # Valid manual assignment
    good_confirm = client.post(
        "/api/upload/confirm-metadata",
        json={
            "dataset_id": dataset_id,
            "sample_conditions": {
                "DonorA": "Healthy",
                "DonorB": "Healthy",
                "PatientC": "Diseased",
                "PatientD": "Diseased",
            }
        }
    )
    assert good_confirm.status_code == 200
    good_data = good_confirm.json()
    assert good_data["requires_group_confirmation"] is False
    assert good_data["conditions"] == ["Diseased", "Healthy"]


