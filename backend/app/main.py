from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.db.mongodb import db
from app.core.config import settings
from app.core.limiter import limiter
from app.api import auth, contacts, profile, sos, hospitals, symptoms, chatbot
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.SECRET_KEY == "yoursecretkey_changethis_in_production":
        logger.warning(
            "WARNING: Using default SECRET_KEY. "
            "Set a strong, unique SECRET_KEY environment variable before deploying to production."
        )
    await db.connect()
    yield
    await db.disconnect()


app = FastAPI(title="AyuSphere API", version="2.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ayusphere.vercel.app",
    "https://ayu-sphere-jade.vercel.app",
]
if settings.CORS_ORIGINS:
    cors_origins.extend(
        origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    logger.warning(f"Rate limit exceeded for {request.client.host if request.client else 'unknown'}: {request.url.path}")
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again later."},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(contacts.router, prefix="/api/v1/contacts", tags=["Contacts"])
app.include_router(profile.router, prefix="/api/v1/profile", tags=["Profile"])
app.include_router(sos.router, prefix="/api/v1/sos", tags=["SOS"])
app.include_router(symptoms.router, prefix="/api/v1/symptoms", tags=["Symptoms"])
app.include_router(hospitals.router, prefix="/api/v1", tags=["Hospitals"])
app.include_router(chatbot.router, prefix="/api/v1/chatbot", tags=["Chatbot"])


@app.get("/health")
@limiter.limit("10/minute")
async def health(request: Request):
    return {"status": "healthy", "version": "2.0.0"}
