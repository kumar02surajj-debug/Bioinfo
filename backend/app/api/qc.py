"""
Quality Control (QC) API Router for TranscriptoX.
"""

from fastapi import APIRouter, HTTPException
import logging

from app.models.qc import QCRequest, QCResponse
from app.services.qc import compute_qc
from app.services.data_processing import ValidationError

logger = logging.getLogger("transcriptox.api.qc")

router = APIRouter(prefix="/api/qc", tags=["QC"])


@router.post("", response_model=QCResponse)
async def run_qc_endpoint(request: QCRequest):
    """
    Compute QC metrics, sample distributions, correlation matrix, and normalized counts.
    """
    try:
        response = compute_qc(dataset_id=request.dataset_id, normalization=request.normalization)
        return response
    except ValidationError as ve:
        logger.warning(f"QC validation error: {str(ve)}")
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error computing QC: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute QC analysis: {str(e)}")
