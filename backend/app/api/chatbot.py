from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from app.api.auth import get_current_user
from app.core.limiter import limiter
from app.core.config import settings
import httpx
import json
import os

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    recommended_specialist: str | None = None
    specialty_keyword: str | None = None

# Specialty inference rules
SPECIALTY_MAP = {
    "cardiologist": ["chest", "heart", "palpitation", "angina", "cardiac"],
    "neurologist": ["headache", "migraine", "dizzy", "numbness", "seizure", "fainting"],
    "gastroenterologist": ["stomach", "vomiting", "nausea", "diarrhea", "abdominal", "digestion"],
    "dermatologist": ["skin", "rash", "itching", "acne", "eczema", "hives"],
    "orthopedic": ["bone", "fracture", "joint", "knee", "back pain", "muscle", "sprain"],
    "ophthalmologist": ["eye", "vision", "blur", "red eye"],
    "dentist": ["tooth", "teeth", "gum", "jaw", "dental"],
    "general physician": ["fever", "cough", "cold", "sore throat", "flu"],
    "gynecologist": ["pregnancy", "period", "menstrual", "bleeding"],
    "pediatrician": ["child", "baby", "pediatric", "kid"],
    "pulmonologist": ["breathing", "asthma", "lung", "shortness of breath", "wheezing"],
}

def infer_specialist(text: str) -> tuple[str, str]:
    """Quick keyword scan to extract a specialist recommendation."""
    lower = text.lower()
    for specialist, keywords in SPECIALTY_MAP.items():
        if any(kw in lower for kw in keywords):
            return specialist.title(), specialist
    return "General Physician", "general physician"


# ── Google Gemini API Integration ──
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

async def call_gemini_llm(user_message: str) -> str | None:
    """Call the Google Gemini REST API."""
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        print("Warning: GEMINI_API_KEY is not set.")
        return None

    system_prompt = (
        "You are Dr. AyuSphere, a virtual health assistant in an emergency health app. "
        "Provide brief, practical health advice for common symptoms and answer general health inquiries. "
        "Be professional and always remind users to consult a real doctor for proper diagnosis. "
        "Keep your response concise (3-4 sentences max)."
    )

    url = f"{GEMINI_API_URL}?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"System Guidelines: {system_prompt}\\n\\nPatient says: {user_message}"}]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 250,
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, json=payload, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            try:
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return text.strip()
            except (KeyError, IndexError):
                return None
        else:
            print(f"Gemini API Error: {resp.status_code} - {resp.text}")
        return None


@router.post("/message", response_model=ChatResponse)
@limiter.limit("15/minute")
async def process_chat(request: Request, chat_request: ChatRequest, current_user: dict = Depends(get_current_user)):
    text = chat_request.message

    # Step 1: Try Gemini LLM for a rich, intelligent response
    try:
        llm_response = await call_gemini_llm(text)
        if llm_response:
            specialist, keyword = infer_specialist(text)
            return ChatResponse(
                response=llm_response,
                recommended_specialist=specialist,
                specialty_keyword=keyword
            )
    except Exception as e:
        print(f"HF LLM Error: {e}")

    # Step 2: Match specialists based on symptom keywords
    specialist, keyword = infer_specialist(text)
    
    # Build response based on matched specialist
    if specialist != "General Physician":
        response_text = (
            f"Based on the symptoms you've described, I recommend consulting a {specialist}. "
            f"Based on the symptoms you've described, they "
            f"suggest this specialist would be best equipped to help you. "
            f"Please seek medical attention promptly if your symptoms are severe."
        )
    else:
        response_text = (
            "Thank you for sharing your symptoms. I recommend consulting "
            "a General Physician who can properly evaluate your condition. "
            "If you're experiencing severe symptoms, please don't hesitate to use the SOS button "
            "or call emergency services immediately."
        )

    return ChatResponse(
        response=response_text,
        recommended_specialist=specialist,
        specialty_keyword=keyword
    )
