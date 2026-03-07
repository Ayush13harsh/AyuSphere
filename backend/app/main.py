from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.db.mongodb import db
from app.api import auth, contacts, profile, sos, hospitals, symptoms, chatbot
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="AyuSphere API", version="2.0.0")
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
@app.on_event("startup")
async def startup_db_client():
    await db.connect()

@app.on_event("shutdown")
async def shutdown_db_client():
    await db.disconnect()

@app.get("/health")
@limiter.limit("10/minute")
async def health(request):
    return {"status": "healthy", "version": "2.0.0"}
