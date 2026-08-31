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
