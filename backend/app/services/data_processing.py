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


def get_dataset(dataset_id: str, require_metadata: bool = True) -> Dict[str, Any]:
    """Retrieve cached dataset by ID."""
    if dataset_id not in _DATASETS_STORE:
        raise ValidationError(f"Dataset session '{dataset_id}' not found. Please upload or reload your dataset.")
    data = _DATASETS_STORE[dataset_id]
    if require_metadata and data.get("metadata") is None:
        raise ValidationError("Sample condition groups have not been confirmed. Please confirm or assign sample condition groups on the Upload page before running analysis.")
    return data


def store_dataset(
    dataset_id: str,
    raw_counts: pd.DataFrame,
    metadata: Optional[pd.DataFrame] = None,
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



def _detect_delimiter(sample_lines: List[str]) -> str:
    """
    Detects whether a table is tab, comma, whitespace, or semicolon separated.
    Restricts detection to standard data table delimiters.
    """
    first_line = ""
    for line in sample_lines:
        line_s = line.strip()
        if line_s and not line_s.startswith("#"):
            first_line = line_s
            break

    if not first_line:
        return ","

    tab_count = first_line.count("\t")
    comma_count = first_line.count(",")
    semi_count = first_line.count(";")

    if tab_count > 0 and tab_count >= comma_count:
        return "\t"
    if comma_count > 0:
        return ","
    if semi_count > 0:
        return ";"

    import re
    if re.search(r"\s+", first_line):
        return r"\s+"

    return ","


def _parse_delimited_expression(content: bytes) -> pd.DataFrame:
    """
    Parse CSV or plain-text (tab, comma, whitespace delimited) expression matrix.
    Ensures friendly error messages when delimiter cannot be detected or shape is invalid.
    """
    try:
        expr_str = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            expr_str = content.decode("latin-1")
        except Exception:
            raise ValidationError("Expression matrix must be a valid UTF-8 or ASCII encoded text file (.csv or .txt).")

    if not expr_str or not expr_str.strip():
        raise ValidationError("Expression matrix file is empty.")

    lines = expr_str.strip().splitlines()
    primary_sep = _detect_delimiter(lines[:5])

    expr_df = None
    candidates = [primary_sep]
    for sep in ["\t", ",", r"\s+", ";"]:
        if sep not in candidates:
            candidates.append(sep)

    for sep in candidates:
        try:
            df = pd.read_csv(
                io.StringIO(expr_str),
                sep=sep,
                engine="python" if (sep == r"\s+" or sep == ";") else "c",
                index_col=0
            )
            if df is not None and not df.empty and df.shape[1] >= 1:
                valid_cols = [c for c in df.columns if not str(c).startswith("Unnamed:")]
                if len(valid_cols) >= 1:
                    expr_df = df[valid_cols]
                    break
        except Exception:
            continue

    if expr_df is None or expr_df.empty or expr_df.shape[1] < 1:
        raise ValidationError("Could not parse this file as a gene expression matrix. Please check the format and try again.")

    return expr_df


def _parse_delimited_table(content: bytes, table_name: str = "Metadata") -> pd.DataFrame:
    """
    Parse CSV or plain-text table for metadata or survival data.
    """
    try:
        text_str = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text_str = content.decode("latin-1")
        except Exception:
            raise ValidationError(f"{table_name} file must be a valid UTF-8 or ASCII encoded text file (.csv or .txt).")

    if not text_str or not text_str.strip():
        raise ValidationError(f"{table_name} file is empty.")

    lines = text_str.strip().splitlines()
    primary_sep = _detect_delimiter(lines[:5])

    table_df = None
    candidates = [primary_sep]
    for sep in ["\t", ",", r"\s+", ";"]:
        if sep not in candidates:
            candidates.append(sep)

    for sep in candidates:
        try:
            df = pd.read_csv(
                io.StringIO(text_str),
                sep=sep,
                engine="python" if (sep == r"\s+" or sep == ";") else "c"
            )
            if df is not None and not df.empty and df.shape[1] >= 2:
                valid_cols = [c for c in df.columns if not str(c).startswith("Unnamed:")]
                if len(valid_cols) >= 2:
                    table_df = df[valid_cols]
                    break
        except Exception:
            continue

    if table_df is None or table_df.empty:
        raise ValidationError(f"Could not parse {table_name} file. Please ensure it is a valid CSV or tab-delimited text file.")

    return table_df


def detect_sample_groups(samples: List[str]) -> Tuple[bool, Dict[str, str]]:
    """
    Infers potential sample groups from sample names using general pattern detection heuristics.
    Returns (pattern_detected, mapping_dict).
    If no reliable pattern is found (e.g. all unique, or only 1 group), returns (False, {}).
    """
    import re
    if not samples or len(samples) < 2:
        return False, {}

    # Candidate regex transformations to extract condition/group prefix or pattern
    patterns = [
        r'[-_. ]+(?:rep|sample|replicate|batch|run|r|s)?[-_. ]*\d+$',
        r'[-_. ]+(?:rep|sample|replicate|batch|run|r|s)[-_. ]*$',
        r'[-_. ]+[A-Za-z]?\d+[A-Za-z]?$',
        r'(?<=[a-zA-Z])\d+$',  # Control1, WT2
        r'[-_. ]+(?:rep|sample|replicate)?[-_. ]*[A-Za-z]$', # Control_A, Treat_B
    ]

    best_mapping: Dict[str, str] = {}
    best_unique_count = 0

    for pat in patterns:
        mapping = {}
        for s in samples:
            cleaned = re.sub(pat, '', s, flags=re.IGNORECASE).strip(' -_./')
            if cleaned:
                mapping[s] = cleaned
            else:
                mapping[s] = s

        unique_groups = set(mapping.values())
        unique_count = len(unique_groups)

        # We want >= 2 distinct groups and < len(samples) (meaning at least some samples share a group)
        if 1 < unique_count < len(samples):
            if len(mapping) == len(samples):
                if not best_mapping or (unique_count < best_unique_count and unique_count >= 2):
                    best_mapping = mapping
                    best_unique_count = unique_count

    if best_mapping and 1 < len(set(best_mapping.values())) < len(samples):
        return True, best_mapping

    return False, {}


def validate_and_parse_csvs(
    expression_content: bytes,
    metadata_content: Optional[bytes] = None,
    survival_content: Optional[bytes] = None,
    dataset_name: str = "Uploaded Dataset"
) -> Tuple[str, UploadResponse]:
    """
    Validate and parse uploaded CSV or TXT files with friendly, actionable error messages.
    Supports single-file upload (expression only) with automatic group detection.
    """
    # 1. Parse Expression Matrix (CSV or TXT)
    expr_df = _parse_delimited_expression(expression_content)

    if expr_df.empty:
        raise ValidationError("Expression matrix is empty.")

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
    expr_samples = set(expr_df.columns)

    # 2. Parse Metadata (CSV or TXT) if provided
    meta_df = None
    conditions = []
    condition_counts = {}
    metadata_preview = []
    requires_confirmation = False
    suggested_groups = None
    pattern_detected = False

    if metadata_content and len(metadata_content.strip()) > 0:
        meta_df = _parse_delimited_table(metadata_content, table_name="Metadata")
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
            raise ValidationError("Metadata file must have a 'condition' (or 'group') column defining sample classes.")

        meta_df["sample_id"] = meta_df[sample_col].astype(str).str.strip()
        meta_df["condition"] = meta_df[cond_col].astype(str).str.strip()

        # Check sample matches
        meta_samples = set(meta_df["sample_id"])

        if meta_df["sample_id"].duplicated().any():
            raise ValidationError("Metadata file contains duplicate sample IDs.")

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
        metadata_preview = meta_df.head(10).to_dict(orient="records")
        requires_confirmation = False
    else:
        # Single-file flow: Infer sample groups
        pattern_detected, suggested_groups = detect_sample_groups(list(expr_df.columns))
        requires_confirmation = True
        if pattern_detected and suggested_groups:
            conditions = sorted(list(set(suggested_groups.values())))
            condition_counts = pd.Series(list(suggested_groups.values())).value_counts().to_dict()
        else:
            conditions = []
            condition_counts = {}
            suggested_groups = {}

    # 3. Parse Survival (CSV or TXT) (if provided)
    survival_df = None
    if survival_content and len(survival_content.strip()) > 0:
        try:
            surv_df = _parse_delimited_table(survival_content, table_name="Survival")
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
                raise ValidationError("Survival file must contain 'sample_id', 'time' (numeric), and 'event' (0 or 1) columns.")

            surv_df["sample_id"] = surv_df[s_col].astype(str).str.strip()
            surv_df["time"] = pd.to_numeric(surv_df[t_col], errors='coerce')
            surv_df["event"] = pd.to_numeric(surv_df[e_col], errors='coerce')

            if surv_df["time"].isna().any():
                raise ValidationError("Survival file contains non-numeric or missing time values.")
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
            raise ValidationError(f"Failed to parse Survival file: {str(e)}")

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
        survival_preview=survival_preview,
        requires_group_confirmation=requires_confirmation,
        suggested_groups=suggested_groups if requires_confirmation else None,
        group_pattern_detected=pattern_detected if requires_confirmation else False
    )

    return dataset_id, response


def confirm_dataset_metadata(
    dataset_id: str,
    sample_conditions: Dict[str, str]
) -> Tuple[str, UploadResponse]:
    """
    Generates internal metadata from confirmed or manually assigned sample condition mappings.
    Validates that all samples are assigned to at least 2 distinct condition groups.
    """
    data = get_dataset(dataset_id, require_metadata=False)
    raw_df: pd.DataFrame = data["raw_counts"]
    surv_df: Optional[pd.DataFrame] = data.get("survival")

    expr_samples = list(raw_df.columns)

    if not sample_conditions:
        raise ValidationError("Please assign condition groups to all samples.")

    # Check that all expression samples are in sample_conditions
    missing = [s for s in expr_samples if s not in sample_conditions or not str(sample_conditions[s]).strip()]
    if missing:
        raise ValidationError(f"Missing condition assignment for samples: {', '.join(missing[:4])}. Every sample must be assigned to a condition group.")

    # Clean and build metadata DataFrame
    cleaned_conditions = {s: str(sample_conditions[s]).strip() for s in expr_samples}

    meta_df = pd.DataFrame({
        "sample_id": expr_samples,
        "condition": [cleaned_conditions[s] for s in expr_samples]
    })

    conditions = sorted(meta_df["condition"].unique().tolist())
    if len(conditions) < 2:
        raise ValidationError(
            f"Only 1 distinct condition group ('{conditions[0]}') was provided. "
            "Differential expression and comparative analysis require at least 2 distinct condition groups (e.g. Control vs Treatment)."
        )

    condition_counts = meta_df["condition"].value_counts().to_dict()

    # Store confirmed metadata in dataset session
    data["metadata"] = meta_df
    data["normalized_counts"] = None
    data["analysis_results"] = {}

    metadata_preview = meta_df.head(10).to_dict(orient="records")
    survival_preview = surv_df.head(10).to_dict(orient="records") if surv_df is not None else None

    response = UploadResponse(
        dataset_id=dataset_id,
        dataset_name=data["dataset_name"],
        gene_count=int(raw_df.shape[0]),
        sample_count=int(raw_df.shape[1]),
        samples=expr_samples,
        conditions=conditions,
        condition_counts=condition_counts,
        has_survival=(surv_df is not None and len(surv_df) > 0),
        is_demo=data.get("is_demo", False),
        genes_preview=list(raw_df.index[:10]),
        metadata_preview=metadata_preview,
        survival_preview=survival_preview,
        requires_group_confirmation=False,
        suggested_groups=None,
        group_pattern_detected=False
    )

    return dataset_id, response



def get_or_load_demo_dataset() -> Tuple[str, UploadResponse]:
    """
    Loads or generates the standard synthetic demo dataset.
    """
    demo_dir = Path("data/example")
    if not (demo_dir / "expression.csv").exists():
        if Path("TranscriptoX/data/example/expression.csv").exists():
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
