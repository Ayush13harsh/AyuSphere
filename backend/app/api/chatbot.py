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
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

async def call_gemini_llm(user_message: str) -> str:
    """Call the Google Gemini REST API."""
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return "[Error] I am currently running offline. Please add your GEMINI_API_KEY to your backend environment variables."
        
    if "simulate" in api_key.lower():
        return "[Error] API Quota Exceeded! The Google Gemini API is 100% FREE, but you are currently using a simulated placeholder API key. To fix this: Go to https://aistudio.google.com/app/apikey to get a free key."

    system_prompt = (
        "You are Dr. AyuSphere, the premium virtual health AI for the AyuSphere emergency health application. "
        "Your platform features a built-in 'Hospital & Doctor Finder'. If a user asks you to find a doctor, consult one, "
        "or locate a hospital, strictly inform them that they can use the built-in 'Hospitals' feature on the AyuSphere app "
        "to instantly locate and contact nearby specialists. "
        "If a user asks a non-medical question (e.g. coding, AWS, trivia), you MUST answer it accurately and directly as a capable AI. "
        "However, after answering non-medical questions, ALWAYS elegantly pivot back to focusing on their health (e.g., '...Now, is there any health concern I can assist you with today?'). "
        "Keep your overall responses highly robust, professional, and do not abruptly stop talking. "
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
            "maxOutputTokens": 4096,
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(url, json=payload, headers=headers)
        except httpx.ReadTimeout:
            return "[Error] The connection to the AI service timed out. Please try again."
        
        if resp.status_code == 200:
            data = resp.json()
            try:
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return text.strip()
            except (KeyError, IndexError):
                return "[Error] Received an unexpected response format from the AI model."
        elif resp.status_code == 429:
            return "[Error] AI API quota has been exceeded. Please review your billing or limits on the API console."
        elif resp.status_code == 404:
            return f"[Error] AI Model not found (404). Current URL: {GEMINI_API_URL}."
        elif resp.status_code in (400, 403):
            try:
                err_msg = resp.json().get("error", {}).get("message", resp.text)
                return f"[Error] API Access Denied ({resp.status_code}): {err_msg}"
            except Exception:
                return f"[Error] API Error ({resp.status_code}): {resp.text}"
        else:
            return f"[Error] An error occurred with the AI service: HTTP {resp.status_code}. Details: {resp.text}"


@router.post("/message", response_model=ChatResponse)
@limiter.limit("15/minute")
async def process_chat(request: Request, chat_request: ChatRequest, current_user: dict = Depends(get_current_user)):
    text = chat_request.message

    # Call Gemini LLM directly, getting back text or error reason
    llm_response = await call_gemini_llm(text)
    
    # Still attach a specialist chip to help the user navigate
    specialist, keyword = infer_specialist(text)
    
    # If the LLM throws an actual error, we still want to show the error rather than a generic summary.
    # The `call_gemini_llm` now gracefully returns string traces starting with '[Error]' for debug.

    return ChatResponse(
        response=llm_response,
        recommended_specialist=specialist if not llm_response.startswith("[Error]") else None,
        specialty_keyword=keyword if not llm_response.startswith("[Error]") else None
    )
