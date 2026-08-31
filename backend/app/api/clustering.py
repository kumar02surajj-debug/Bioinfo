"""
Hierarchical Clustering API Router for TranscriptoX.
"""

from fastapi import APIRouter, HTTPException
import logging

from app.models.clustering import ClusteringRequest, ClusteringResponse
from app.services.clustering import compute_clustering
from app.services.data_processing import ValidationError

logger = logging.getLogger("transcriptox.api.clustering")

router = APIRouter(prefix="/api/clustering", tags=["Clustering"])


@router.post("", response_model=ClusteringResponse)
async def run_clustering_endpoint(request: ClusteringRequest):
    """
    Execute hierarchical clustering on DEGs or selected genes.
    """
    try:
        response = compute_clustering(
            dataset_id=request.dataset_id,
            deg_top_n=request.deg_top_n,
            distance_metric=request.distance_metric,
            linkage_method=request.linkage_method,
            custom_genes=request.custom_genes
        )
        return response
    except ValidationError as ve:
        logger.warning(f"Clustering validation error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error computing clustering: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute clustering: {str(e)}")
