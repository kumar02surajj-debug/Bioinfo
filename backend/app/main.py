"""
TranscriptoX FastAPI Application
Central routing, CORS configuration, exception handling, and health endpoint.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.api.upload import router as upload_router
from app.api.qc import router as qc_router
from app.api.pca import router as pca_router
from app.api.differential import router as diff_router
from app.api.clustering import router as cluster_router
from app.api.enrichment import router as enrichment_router
from app.api.survival import router as survival_router
from app.api.report import router as report_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("transcriptox")

app = FastAPI(
    title="TranscriptoX Backend API",
    description="Integrated Transcriptomic Analysis Pipeline backend engine",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_request_timing(request: Request, call_next):
    import time
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 1)
    path = request.url.path
    if path != "/api/health" and not path.startswith("/docs") and not path.startswith("/redoc"):
        logger.info(f"API {request.method} {path} -> {response.status_code} [{duration_ms}ms]")
    return response


# Include Routers
app.include_router(upload_router)
app.include_router(qc_router)
app.include_router(pca_router)
app.include_router(diff_router)
app.include_router(cluster_router)
app.include_router(enrichment_router)
app.include_router(survival_router)
app.include_router(report_router)


@app.get("/api/health")
async def health_check():
    """
    Health check endpoint to verify backend status and version.
    """
    return {
        "status": "ok",
        "service": "TranscriptoX Backend",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    return {
        "message": "Welcome to TranscriptoX API. Visit /docs for API documentation.",
        "status": "running"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "An internal server error occurred during analysis.",
            "detail": str(exc),
            "path": request.url.path
        }
    )
