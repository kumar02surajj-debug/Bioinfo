"""
Differential Expression API Router for TranscriptoX.
"""

from fastapi import APIRouter, HTTPException
import logging

from app.models.differential import DifferentialRequest, DifferentialResponse
from app.services.differential import compute_differential_expression
from app.services.data_processing import ValidationError

logger = logging.getLogger("transcriptox.api.differential")

router = APIRouter(prefix="/api/differential-expression", tags=["Differential Expression"])


@router.post("", response_model=DifferentialResponse)
async def run_differential_endpoint(request: DifferentialRequest):
    """
    Execute differential expression analysis with customizable fold-change and FDR thresholds.
    """
    try:
        response = compute_differential_expression(
            dataset_id=request.dataset_id,
            control_group=request.control_group,
            treatment_group=request.treatment_group,
            log2fc_threshold=request.log2fc_threshold,
            fdr_threshold=request.fdr_threshold
        )
        return response
    except ValidationError as ve:
        logger.warning(f"Differential expression validation error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error computing differential expression: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute differential expression: {str(e)}")
