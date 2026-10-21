import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.init_db import init_db
from app.db.database import get_connection
from app.api.health import router as health_router
from app.api.complaints import router as complaints_router
from app.api.evidence import router as evidence_router
from app.api.overview import router as overview_router
from app.api.graph import router as graph_router
from app.api.reports import router as reports_router
from app.api.demo import router as demo_router, seed_demo_data

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("cybersaarthi")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist
    logger.info("Initializing CyberSaarthi database...")
    init_db()
    
    # Auto-seed if database has 0 complaints
    conn = get_connection()
    try:
        count = conn.execute("SELECT COUNT(*) FROM complaints").fetchone()[0]
        if count == 0:
            logger.info("Database empty. Seeding initial demonstration scenarios...")
            seed_demo_data()
    finally:
        conn.close()
        
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
