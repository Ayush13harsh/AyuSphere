from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
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


# ── Hugging Face Inference API (FREE, no key needed for public models) ──
HF_MODEL = "mistralai/Mistral-7B-Instruct-v0.3"
HF_API_URL = f"https://router.hugging-face.cn/models/{HF_MODEL}"
HF_TOKEN = os.getenv("HF_TOKEN", "")  # Optional, increases rate limits

async def call_hf_llm(user_message: str) -> str | None:
    """Call the Hugging Face free Inference API."""
    system_prompt = (
        "You are Dr. AyuSphere, a virtual health assistant in an emergency health app. "
        "Provide brief, practical health advice for common symptoms. "
        "Be professional and remind users to consult a real doctor for proper diagnosis. "
        "Mention what type of specialist they should see."
    )
    
    prompt = f"<s>[INST] {system_prompt}\n\nPatient says: {user_message} [/INST]"

    headers = {"Content-Type": "application/json"}
    if HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"

    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 250,
            "temperature": 0.7,
            "return_full_text": False
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(HF_API_URL, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        
        if isinstance(data, list) and len(data) > 0:
            return data[0].get("generated_text", "").strip()
        return None


@router.post("/message", response_model=ChatResponse)
async def process_chat(request: ChatRequest):
    text = request.message

    # Step 1: Try HF LLM for a rich, intelligent response
    try:
        llm_response = await call_hf_llm(text)
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
