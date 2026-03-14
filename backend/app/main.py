from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from app.db.mongodb import db
from app.core.config import settings
from app.api import auth, contacts, profile, sos, hospitals, symptoms, chatbot
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://ayusphere.vercel.app",
        "https://ayu-sphere-jade.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
