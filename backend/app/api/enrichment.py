"""
Pathway Enrichment API Router for TranscriptoX.
"""

from fastapi import APIRouter, HTTPException
import logging

from app.models.enrichment import EnrichmentRequest, EnrichmentResponse
from app.services.enrichment import compute_enrichment
from app.services.data_processing import ValidationError

logger = logging.getLogger("transcriptox.api.enrichment")

router = APIRouter(prefix="/api/enrichment", tags=["Enrichment"])


@router.post("", response_model=EnrichmentResponse)
async def run_enrichment_endpoint(request: EnrichmentRequest):
    """
    Execute functional pathway over-representation analysis against GO, KEGG, and Reactome.
    """
    try:
        response = compute_enrichment(
            dataset_id=request.dataset_id,
            database=request.database,
            organism=request.organism,
            regulation_filter=request.regulation_filter,
            custom_genes=request.custom_genes
        )
        return response
    except ValidationError as ve:
        logger.warning(f"Enrichment validation error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error computing enrichment: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute pathway enrichment: {str(e)}")
