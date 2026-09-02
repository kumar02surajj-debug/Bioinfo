"""
Upload API Router for TranscriptoX.
Endpoints for uploading raw count matrices, metadata, survival files,
and loading the synthetic demo dataset.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional, Dict
import logging
import pandas as pd

from app.models.upload import UploadResponse, ConfirmMetadataRequest
from app.services.data_processing import (
    validate_and_parse_csvs,
    confirm_dataset_metadata,
    get_or_load_demo_dataset,
    detect_sample_groups,
    ValidationError,
    get_dataset,
)

logger = logging.getLogger("transcriptox.api.upload")

router = APIRouter(prefix="/api/upload", tags=["Upload"])


@router.post("", response_model=UploadResponse)
async def upload_dataset_endpoint(
    expression_file: UploadFile = File(..., description="Expression matrix CSV or TXT (genes x samples)"),
    metadata_file: Optional[UploadFile] = File(None, description="Optional sample metadata CSV or TXT (sample_id, condition)"),
    survival_file: Optional[UploadFile] = File(None, description="Optional survival data CSV or TXT (sample_id, time, event)"),
    dataset_name: Optional[str] = Form(None, description="Optional custom name for dataset")
):
    try:
        expr_bytes = await expression_file.read()
        meta_bytes = await metadata_file.read() if metadata_file else None
        surv_bytes = await survival_file.read() if survival_file else None

        name = dataset_name or expression_file.filename or "Uploaded Dataset"
        dataset_id, response = validate_and_parse_csvs(
            expression_content=expr_bytes,
            metadata_content=meta_bytes,
            survival_content=surv_bytes,
            dataset_name=name
        )
        return response

    except ValidationError as ve:
        logger.warning(f"Dataset upload validation error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Unexpected error during upload: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal error processing dataset: {str(e)}")


@router.post("/confirm-metadata", response_model=UploadResponse)
async def confirm_metadata_endpoint(request: ConfirmMetadataRequest):
    """
    Confirm or manually assign condition groups for a dataset uploaded without a metadata file.
    """
    try:
        dataset_id, response = confirm_dataset_metadata(
            dataset_id=request.dataset_id,
            sample_conditions=request.sample_conditions
        )
        return response
    except ValidationError as ve:
        logger.warning(f"Metadata confirmation validation error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Unexpected error during metadata confirmation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to confirm sample condition assignments: {str(e)}")


@router.post("/demo", response_model=UploadResponse)
async def load_demo_endpoint():
    """
    Load the standard synthetic demo dataset for exploratory testing.
    """
    try:
        dataset_id, response = get_or_load_demo_dataset()
        return response
    except Exception as e:
        logger.error(f"Error loading demo dataset: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to load demo dataset: {str(e)}")


@router.get("/{dataset_id}", response_model=UploadResponse)
async def get_dataset_info(dataset_id: str):
    """
    Retrieve overview information for a loaded dataset.
    """
    try:
        data = get_dataset(dataset_id, require_metadata=False)
        raw_df = data["raw_counts"]
        meta_df = data.get("metadata")
        surv_df = data.get("survival")

        if meta_df is not None:
            conditions = sorted(meta_df["condition"].unique().tolist())
            cond_counts = meta_df["condition"].value_counts().to_dict()
            meta_preview = meta_df.head(10).to_dict(orient="records")
            req_confirm = False
            suggested = None
            pattern_detected = False
        else:
            pattern_detected, suggested = detect_sample_groups(list(raw_df.columns))
            conditions = sorted(list(set(suggested.values()))) if pattern_detected else []
            cond_counts = dict(pd.Series(list(suggested.values())).value_counts()) if pattern_detected else {}
            meta_preview = []
            req_confirm = True

        return UploadResponse(
            dataset_id=dataset_id,
            dataset_name=data["dataset_name"],
            gene_count=int(raw_df.shape[0]),
            sample_count=int(raw_df.shape[1]),
            samples=list(raw_df.columns),
            conditions=conditions,
            condition_counts=cond_counts,
            has_survival=(surv_df is not None and len(surv_df) > 0),
            is_demo=data["is_demo"],
            genes_preview=list(raw_df.index[:10]),
            metadata_preview=meta_preview,
            survival_preview=surv_df.head(10).to_dict(orient="records") if surv_df is not None else None,
            requires_group_confirmation=req_confirm,
            suggested_groups=suggested if req_confirm else None,
            group_pattern_detected=pattern_detected if req_confirm else False
        )
    except ValidationError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

