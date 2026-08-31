"""
Survival Analysis API Router for TranscriptoX.
"""

from fastapi import APIRouter, HTTPException
import logging

from app.models.survival import SurvivalRequest, SurvivalResponse
from app.services.survival import compute_survival_analysis
from app.services.data_processing import ValidationError

logger = logging.getLogger("transcriptox.api.survival")

router = APIRouter(prefix="/api/survival", tags=["Survival"])


@router.post("", response_model=SurvivalResponse)
async def run_survival_endpoint(request: SurvivalRequest):
    """
    Execute Kaplan-Meier survival curves, Log-rank test, and Cox PH modeling for target gene.
    """
    try:
        response = compute_survival_analysis(
            dataset_id=request.dataset_id,
            gene_id=request.gene_id,
            split_method=request.split_method,
            custom_cutoff=request.custom_cutoff
        )
        return response
    except ValidationError as ve:
        logger.warning(f"Survival validation error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error computing survival analysis: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute survival analysis: {str(e)}")
