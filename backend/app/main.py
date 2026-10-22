import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.init_db import init_db
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.voice import router as voice_router
from app.api.complaints import router as complaints_router
from app.api.evidence import router as evidence_router
from app.api.overview import router as overview_router
from app.api.graph import router as graph_router
from app.api.reports import router as reports_router
from app.api.demo import router as demo_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("cybersaarthi")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and migrations are applied
    logger.info("Initializing CyberSaarthi database and verifying schema...")
    init_db()
    logger.info("CyberSaarthi backend startup complete. Zero auto-seeded demo records on fresh database.")
    yield
    logger.info("CyberSaarthi backend shutting down.")

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Multilingual cyber-fraud evidence analysis and investigation-support platform.",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes under /api
app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(voice_router, prefix="/api")
app.include_router(complaints_router, prefix="/api")
app.include_router(evidence_router, prefix="/api")
app.include_router(overview_router, prefix="/api")
app.include_router(graph_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(demo_router, prefix="/api")

@app.get("/")
def root():
    return {
        "platform": settings.app_name,
        "tagline": "From fragmented evidence to traceable cyber intelligence.",
        "documentation": "/docs",
        "api_prefix": "/api"
    }
