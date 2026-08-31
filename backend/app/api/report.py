"""
Report Generation API Router for TranscriptoX.
"""

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import HTMLResponse
import logging

from app.models.report import ReportRequest
from app.services.report import generate_html_report
from app.services.data_processing import ValidationError

logger = logging.getLogger("transcriptox.api.report")

router = APIRouter(prefix="/api/report", tags=["Report"])


@router.post("")
async def generate_report_endpoint(request: ReportRequest):
    """
    Compile analysis results into a downloadable standalone HTML report.
    """
    try:
        html_content = generate_html_report(request)
        return Response(
            content=html_content,
            media_type="text/html",
            headers={
                "Content-Disposition": 'attachment; filename="TranscriptoX_Analysis_Report.html"'
            }
        )
    except ValidationError as ve:
        logger.warning(f"Report validation error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate analysis report: {str(e)}")
