"""
PCA API Router for TranscriptoX.
"""

from fastapi import APIRouter, HTTPException
import logging

from app.models.pca import PCARequest, PCAResponse
from app.services.pca import compute_pca
from app.services.data_processing import ValidationError

logger = logging.getLogger("transcriptox.api.pca")

router = APIRouter(prefix="/api/pca", tags=["PCA"])


@router.post("", response_model=PCAResponse)
async def run_pca_endpoint(request: PCARequest):
    """
    Compute PCA on normalized log2(CPM+1) counts.
    """
    try:
        response = compute_pca(dataset_id=request.dataset_id, n_components=request.n_components)
        return response
    except ValidationError as ve:
        logger.warning(f"PCA validation error: {str(ve)}")
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error computing PCA: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute PCA analysis: {str(e)}")
