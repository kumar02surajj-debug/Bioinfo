"""
Upload API Router for TranscriptoX.
Endpoints for uploading raw count matrices, metadata, survival files,
and loading the synthetic demo dataset.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import logging

from app.models.upload import UploadResponse
from app.services.data_processing import validate_and_parse_csvs, get_or_load_demo_dataset, ValidationError, get_dataset

logger = logging.getLogger("transcriptox.api.upload")

router = APIRouter(prefix="/api/upload", tags=["Upload"])


@router.post("", response_model=UploadResponse)
async def upload_dataset_endpoint(
    expression_file: UploadFile = File(..., description="Expression matrix CSV or TXT (genes x samples)"),
    metadata_file: UploadFile = File(..., description="Sample metadata CSV or TXT (sample_id, condition)"),
    survival_file: Optional[UploadFile] = File(None, description="Optional survival data CSV or TXT (sample_id, time, event)"),
    dataset_name: Optional[str] = Form(None, description="Optional custom name for dataset")
):
    try:
        expr_bytes = await expression_file.read()
        meta_bytes = await metadata_file.read()
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
        data = get_dataset(dataset_id)
        raw_df = data["raw_counts"]
        meta_df = data["metadata"]
        surv_df = data["survival"]

        conditions = sorted(meta_df["condition"].unique().tolist())
        cond_counts = meta_df["condition"].value_counts().to_dict()

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
            metadata_preview=meta_df.head(10).to_dict(orient="records"),
            survival_preview=surv_df.head(10).to_dict(orient="records") if surv_df is not None else None
        )
    except ValidationError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
