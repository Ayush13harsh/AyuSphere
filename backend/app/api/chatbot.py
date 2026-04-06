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
    action: str | None = None

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
GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-pro"
]

async def call_gemini_llm(user_message: str) -> str:
    """Call the Google Gemini REST API with automatic model cascading."""
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return "[Error] I am currently running offline. Please add your GEMINI_API_KEY to your backend environment variables."
        
    if "simulate" in api_key.lower():
        return "[Error] API Quota Exceeded! The Google Gemini API is 100% FREE, but you are currently using a simulated placeholder API key. To fix this: Go to https://aistudio.google.com/app/apikey to get a free key."

    system_prompt = (
        "You are Dr. AyuSphere, the premium virtual health AI for the AyuSphere emergency health application. "
        "Your platform features a built-in 'Hospital & Doctor Finder'. If a user asks you to find a doctor, consult one, "
        "or locate a hospital, strictly inform them that they can use the built-in 'Hospitals' feature on the AyuSphere app. "
        "CRITICAL AGENT INSTRUCTION: If they ask to find, consult, or book a doctor/hospital, YOU MUST append exactly the string `[ACTION:FIND_DOCTOR]` to the very end of your response. "
        "CRITICAL AGENT INSTRUCTION: If they ask to call an ambulance, send an SOS, or report a life-threatening emergency, YOU MUST append exactly the string `[ACTION:CALL_AMBULANCE]` to the very end of your response. "
        "If a user asks a non-medical question, you MUST answer it accurately as a capable AI, but ALWAYS elegantly pivot back to focusing on their health. "
        "Keep your overall responses highly robust, professional, and do not abruptly stop talking. "
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"System Guidelines: {system_prompt}\n\nPatient says: {user_message}"}]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 4096,
        }
    }

    async with httpx.AsyncClient() as client:
        last_error = ""
        for model in GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                resp = await client.post(url, json=payload, timeout=20.0)
                if resp.status_code == 200:
                    data = resp.json()
                    # Successfully generated a response
                    try:
                        return data["candidates"][0]["content"]["parts"][0]["text"]
                    except (KeyError, IndexError):
                        return "[Error] The model returned an empty or structurally malformed response."
                        
                elif resp.status_code == 429:
                    err_msg = resp.json().get("error", {}).get("message", "Quota Exceeded")
                    last_error = f"[Error] 429 Quota Exceeded on {model}: {err_msg}"
                    continue # Try the next fallback model!
                    
                elif resp.status_code == 404:
                    last_error = f"[Error] 404 Model {model} not found for this API Key."
                    continue # Try the next fallback model!
                    
                elif resp.status_code in (400, 403):
                    # For permissions or severe syntax errors, fail immediately.
                    try:
                        err_msg = resp.json().get("error", {}).get("message", resp.text)
                        return f"[Error] API Access Denied ({resp.status_code}): {err_msg}"
                    except Exception:
                        return f"[Error] API Error ({resp.status_code}): {resp.text}"
                else:
                    last_error = f"[Error] An error occurred with the AI service: HTTP {resp.status_code}. Details: {resp.text}"
                    continue
                    
            except httpx.TimeoutException:
                last_error = f"[Error] Network Timeout waiting for {model} to respond."
                continue
            except Exception as e:
                last_error = f"[Error] Unknown connection error reaching {model}: {str(e)}"
                continue
                
        # If we exhausted the entire waterfall without returning success or a hard 403
        return last_error or "[Error] All Gemini fallback models failed due to routing or quota limits."


@router.post("/message", response_model=ChatResponse)
@limiter.limit("15/minute")
async def process_chat(request: Request, chat_request: ChatRequest, current_user: dict = Depends(get_current_user)):
    text = chat_request.message

    # Call Gemini LLM directly, getting back text or error reason
    llm_response = await call_gemini_llm(text)
    
    # Extract agentic structural actions
    action = None
    if "[ACTION:FIND_DOCTOR]" in llm_response:
        action = "FIND_DOCTOR"
        llm_response = llm_response.replace("[ACTION:FIND_DOCTOR]", "").strip()
    elif "[ACTION:CALL_AMBULANCE]" in llm_response:
        action = "CALL_AMBULANCE"
        llm_response = llm_response.replace("[ACTION:CALL_AMBULANCE]", "").strip()
    
    # Still attach a specialist chip to help the user navigate
    specialist, keyword = infer_specialist(text)
    
    return ChatResponse(
        response=llm_response,
        recommended_specialist=specialist if not llm_response.startswith("[Error]") else None,
        specialty_keyword=keyword if not llm_response.startswith("[Error]") else None,
        action=action
    )
