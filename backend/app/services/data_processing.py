"""
Data Processing & Validation Service for TranscriptoX.
Handles file parsing, rigorous biological data validation, dataset caching,
and normalization routines.
"""

import io
import uuid
import logging
from typing import Dict, Any, Optional, Tuple, List
import pandas as pd
import numpy as np
from pathlib import Path

from app.models.upload import UploadResponse
from app.utils.generate_demo import generate_demo_files

logger = logging.getLogger("transcriptox.data_processing")

# In-memory storage for analysis sessions
_DATASETS_STORE: Dict[str, Dict[str, Any]] = {}


class ValidationError(Exception):
    """Custom friendly validation error."""
    pass


def get_dataset(dataset_id: str) -> Dict[str, Any]:
    """Retrieve cached dataset by ID."""
    if dataset_id not in _DATASETS_STORE:
        raise ValidationError(f"Dataset session '{dataset_id}' not found. Please upload or reload your dataset.")
    return _DATASETS_STORE[dataset_id]


def store_dataset(
    dataset_id: str,
    raw_counts: pd.DataFrame,
    metadata: pd.DataFrame,
    survival: Optional[pd.DataFrame] = None,
    dataset_name: str = "Uploaded Dataset",
    is_demo: bool = False
) -> Dict[str, Any]:
    """Store dataset in session cache."""
    data_entry = {
        "dataset_id": dataset_id,
        "dataset_name": dataset_name,
        "raw_counts": raw_counts,
        "metadata": metadata,
        "survival": survival,
        "normalized_counts": None,
        "is_demo": is_demo,
        "analysis_results": {}
    }
    _DATASETS_STORE[dataset_id] = data_entry
    return data_entry


def validate_and_parse_csvs(
    expression_content: bytes,
    metadata_content: bytes,
    survival_content: Optional[bytes] = None,
    dataset_name: str = "Uploaded Dataset"
) -> Tuple[str, UploadResponse]:
    """
    Validate and parse uploaded CSV files with friendly, actionable error messages.
    """
    # 1. Parse Expression Matrix
    try:
        expr_str = expression_content.decode("utf-8-sig")
        expr_df = pd.read_csv(io.StringIO(expr_str), index_col=0)
    except UnicodeDecodeError:
        raise ValidationError("Expression matrix must be a UTF-8 encoded CSV file.")
    except Exception as e:
        raise ValidationError(f"Failed to parse Expression CSV: {str(e)}")

    if expr_df.empty:
        raise ValidationError("Expression matrix CSV is empty.")

    # Check gene ID index
    if expr_df.index.has_duplicates:
        dups = expr_df.index[expr_df.index.duplicated()].tolist()[:5]
        raise ValidationError(f"Expression matrix contains duplicate gene IDs (e.g. {', '.join(dups)}). Each gene ID must be unique.")

    if any(expr_df.index.isna()) or any(expr_df.index.astype(str).str.strip() == ""):
        raise ValidationError("Expression matrix contains blank or missing gene IDs.")

    # Check sample columns
    expr_df.columns = [str(c).strip() for c in expr_df.columns]
    if len(expr_df.columns) != len(set(expr_df.columns)):
        raise ValidationError("Expression matrix contains duplicate sample column headers.")

    if len(expr_df.columns) < 2:
        raise ValidationError("Expression matrix must contain at least 2 sample columns.")

    # Check numeric values
    non_numeric_cols = []
    for col in expr_df.columns:
        if not pd.api.types.is_numeric_dtype(expr_df[col]):
            # Try converting
            converted = pd.to_numeric(expr_df[col], errors='coerce')
            if converted.isna().any():
                non_numeric_cols.append(col)
            else:
                expr_df[col] = converted

    if non_numeric_cols:
        raise ValidationError(f"Non-numeric values detected in expression columns: {', '.join(non_numeric_cols[:4])}. Count matrix must contain numeric values only.")

    # Check for negative values
    if (expr_df.values < 0).any():
        raise ValidationError("Expression matrix contains negative values. RNA-seq count data must be non-negative (>= 0).")

    # Clean index strings
    expr_df.index = [str(g).strip() for g in expr_df.index]

    # 2. Parse Metadata CSV
    try:
        meta_str = metadata_content.decode("utf-8-sig")
        meta_df = pd.read_csv(io.StringIO(meta_str))
    except Exception as e:
        raise ValidationError(f"Failed to parse Metadata CSV: {str(e)}")

    if meta_df.empty:
        raise ValidationError("Metadata CSV is empty.")

    # Check columns
    meta_df.columns = [str(c).strip().lower() for c in meta_df.columns]
    
    # Locate sample_id and condition columns
    sample_col = None
    for cand in ["sample_id", "sampleid", "sample", "id"]:
        if cand in meta_df.columns:
            sample_col = cand
            break
    if not sample_col:
        sample_col = meta_df.columns[0] # Default to first column

    cond_col = None
    for cand in ["condition", "group", "treatment", "phenotype", "status", "class"]:
        if cand in meta_df.columns:
            cond_col = cand
            break
    if not cond_col and len(meta_df.columns) >= 2:
        cond_col = meta_df.columns[1] # Default to second column

    if not cond_col:
        raise ValidationError("Metadata CSV must have a 'condition' (or 'group') column defining sample classes.")

    meta_df["sample_id"] = meta_df[sample_col].astype(str).str.strip()
    meta_df["condition"] = meta_df[cond_col].astype(str).str.strip()

    # Check sample matches
    meta_samples = set(meta_df["sample_id"])
    expr_samples = set(expr_df.columns)

    if meta_df["sample_id"].duplicated().any():
        raise ValidationError("Metadata CSV contains duplicate sample IDs.")

    if meta_samples != expr_samples:
        missing_in_meta = list(expr_samples - meta_samples)[:4]
        missing_in_expr = list(meta_samples - expr_samples)[:4]
        msg = "Sample IDs in metadata do not match the expression matrix."
        if missing_in_meta:
            msg += f" Samples in expression matrix missing in metadata: {', '.join(missing_in_meta)}."
        if missing_in_expr:
            msg += f" Samples in metadata missing in expression matrix: {', '.join(missing_in_expr)}."
        raise ValidationError(msg)

    # Align metadata order to match expression columns exactly
    meta_df = meta_df.set_index("sample_id").loc[list(expr_df.columns)].reset_index()

    conditions = sorted(meta_df["condition"].unique().tolist())
    if len(conditions) < 2:
        raise ValidationError(f"Metadata has only 1 condition group ('{conditions[0]}'). Differential expression requires at least 2 distinct condition groups.")

    condition_counts = meta_df["condition"].value_counts().to_dict()

    # 3. Parse Survival CSV (if provided)
    survival_df = None
    if survival_content and len(survival_content.strip()) > 0:
        try:
            surv_str = survival_content.decode("utf-8-sig")
            surv_df = pd.read_csv(io.StringIO(surv_str))
            surv_df.columns = [str(c).strip().lower() for c in surv_df.columns]

            # Find sample_id, time, event
            s_col = None
            for cand in ["sample_id", "sampleid", "sample", "id"]:
                if cand in surv_df.columns:
                    s_col = cand
                    break
            if not s_col:
                s_col = surv_df.columns[0]

            t_col = None
            for cand in ["time", "survival_time", "months", "days", "years", "os_time", "time_months"]:
                if cand in surv_df.columns:
                    t_col = cand
                    break

            e_col = None
            for cand in ["event", "status", "censored", "os_event", "death", "vital_status"]:
                if cand in surv_df.columns:
                    e_col = cand
                    break

            if not t_col or not e_col:
                raise ValidationError("Survival CSV must contain 'sample_id', 'time' (numeric), and 'event' (0 or 1) columns.")

            surv_df["sample_id"] = surv_df[s_col].astype(str).str.strip()
            surv_df["time"] = pd.to_numeric(surv_df[t_col], errors='coerce')
            surv_df["event"] = pd.to_numeric(surv_df[e_col], errors='coerce')

            if surv_df["time"].isna().any():
                raise ValidationError("Survival CSV contains non-numeric or missing time values.")
            if (surv_df["time"] < 0).any():
                raise ValidationError("Survival times must be non-negative (>= 0).")

            if surv_df["event"].isna().any() or not set(surv_df["event"].unique()).issubset({0, 1}):
                raise ValidationError("Survival 'event' column must only contain 0 (censored/alive) or 1 (event/deceased).")

            # Check survival samples match
            surv_samples = set(surv_df["sample_id"])
            if not surv_samples.issubset(expr_samples):
                unknown_surv = list(surv_samples - expr_samples)[:3]
                raise ValidationError(f"Survival table contains unknown sample IDs not in expression matrix: {', '.join(unknown_surv)}.")

            # Filter & align survival df
            surv_df = surv_df[surv_df["sample_id"].isin(expr_samples)].drop_duplicates(subset=["sample_id"])
            survival_df = surv_df[["sample_id", "time", "event"]]

        except ValidationError:
            raise
        except Exception as e:
            raise ValidationError(f"Failed to parse Survival CSV: {str(e)}")

    # Store in memory
    dataset_id = str(uuid.uuid4())
    store_dataset(
        dataset_id=dataset_id,
        raw_counts=expr_df,
        metadata=meta_df,
        survival=survival_df,
        dataset_name=dataset_name,
        is_demo=False
    )

    # Compute preview response
    metadata_preview = meta_df.head(10).to_dict(orient="records")
    survival_preview = survival_df.head(10).to_dict(orient="records") if survival_df is not None else None

    response = UploadResponse(
        dataset_id=dataset_id,
        dataset_name=dataset_name,
        gene_count=int(expr_df.shape[0]),
        sample_count=int(expr_df.shape[1]),
        samples=list(expr_df.columns),
        conditions=conditions,
        condition_counts=condition_counts,
        has_survival=(survival_df is not None and len(survival_df) > 0),
        is_demo=False,
        genes_preview=list(expr_df.index[:10]),
        metadata_preview=metadata_preview,
        survival_preview=survival_preview
    )

    return dataset_id, response


def get_or_load_demo_dataset() -> Tuple[str, UploadResponse]:
    """
    Loads or generates the standard synthetic demo dataset.
    """
    demo_dir = Path("TranscriptoX/data/example")
    expr_path = demo_dir / "expression.csv"
    meta_path = demo_dir / "metadata.csv"
    surv_path = demo_dir / "survival.csv"

    if not (expr_path.exists() and meta_path.exists() and surv_path.exists()):
        generate_demo_files(demo_dir)

    with open(expr_path, "rb") as f:
        expr_bytes = f.read()
    with open(meta_path, "rb") as f:
        meta_bytes = f.read()
    with open(surv_path, "rb") as f:
        surv_bytes = f.read()

    dataset_id, response = validate_and_parse_csvs(
        expression_content=expr_bytes,
        metadata_content=meta_bytes,
        survival_content=surv_bytes,
        dataset_name="DEMO DATASET — SYNTHETIC / EXAMPLE DATA"
    )

    # Flag as demo in store and response
    _DATASETS_STORE[dataset_id]["is_demo"] = True
    response.is_demo = True

    return dataset_id, response
