from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
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
    
    # Heartbeat to monitor if the process is alive during startup
    import asyncio
    async def heartbeat():
        try:
            while True:
                logger.info("HEARTBEAT: App is alive and event loop is running.")
                await asyncio.sleep(10)
        except asyncio.CancelledError:
            pass
            
    heartbeat_task = asyncio.create_task(heartbeat())
    
    await db.connect()
    yield
    heartbeat_task.cancel()
    await db.disconnect()


app = FastAPI(title="AyuSphere API", version="2.0.0", lifespan=lifespan)

# Radical Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"INCOMING REQUEST: {request.method} {request.url.path}")
    logger.info(f"HEADERS: {dict(request.headers)}")
    response = await call_next(request)
    logger.info(f"RESPONSE STATUS: {response.status_code}")
    return response

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# Combine default origins with any extra origins from CORS_ORIGINS env var
_default_origins = [
    "https://ayusphere.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
_extra = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()] if settings.CORS_ORIGINS else []
_allowed_origins = list(set(_default_origins + _extra))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def safe_cors_json_response(status_code: int, content: dict, request: Request):
    """
    Creates a JSONResponse with explicit CORS headers.
    This is a fallback for when middleware might be bypassed or fail.
    """
    origin = request.headers.get("origin") or "*"
    
    headers = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*"
    }
    
    return JSONResponse(
        status_code=status_code,
        content=content,
        headers=headers
    )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    logger.warning(f"Rate limit exceeded for {request.client.host if request.client else 'unknown'}: {request.url.path}")
    return safe_cors_json_response(
        status_code=429,
        content={"detail": "Too many requests. Please try again later."},
        request=request
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error on {request.method} {request.url.path}: {exc}")
    error_details = []
    for error in exc.errors():
        loc = ".".join(str(l) for l in error.get("loc", []))
        msg = error.get("msg", "Validation error")
        error_details.append(f"{loc}: {msg}")
    
    return safe_cors_json_response(
        status_code=422,
        content={"detail": error_details},
        request=request
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.error(f"HTTP exception on {request.method} {request.url.path}: {exc.detail}")
    return safe_cors_json_response(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        request=request
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return safe_cors_json_response(
        status_code=500,
        content={"detail": "Internal server error"},
        request=request
    )


app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(contacts.router, prefix="/api/v1/contacts", tags=["Contacts"])
app.include_router(profile.router, prefix="/api/v1/profile", tags=["Profile"])
app.include_router(sos.router, prefix="/api/v1/sos", tags=["SOS"])
app.include_router(symptoms.router, prefix="/api/v1/symptoms", tags=["Symptoms"])
app.include_router(hospitals.router, prefix="/api/v1", tags=["Hospitals"])
app.include_router(chatbot.router, prefix="/api/v1/chatbot", tags=["Chatbot"])


@app.get("/")
async def root(request: Request):
    return {
        "status": "System Live",
        "message": "Welcome to AyuSphere API. Use /api/v1 for backend services.",
        "version": "2.0.0"
    }


@app.get("/health")
async def health(request: Request):
    return {"status": "healthy", "version": "2.0.0"}
