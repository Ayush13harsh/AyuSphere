from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.api.auth import get_current_user
from app.core.config import settings
import httpx
import re

router = APIRouter()

class SymptomRequest(BaseModel):
    symptoms_text: str
    duration: Optional[str] = None
    pain_level: Optional[int] = None
    fever: Optional[bool] = None
    age_group: Optional[str] = None
    existing_conditions: Optional[str] = None

class SymptomResponse(BaseModel):
    possible_conditions: List[str]
    recommended_specialist: str
    specialty_keyword: str
    disclaimer: str = "This tool provides guidance only and is not a medical diagnosis."

class RiskAssessRequest(BaseModel):
    age: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    systolic: Optional[int] = None
    diastolic: Optional[int] = None
    symptoms: List[str] = []
    smoke: bool = False
    diabetes: bool = False

class RiskAssessResponse(BaseModel):
    score: float
    category: str
    color: str
    factors: List[str]
    bmi: Optional[float] = None
    ai_analysis: Optional[str] = None
    recommended_specialist: str = "General Physician"
    specialty_keyword: str = "hospital"
    disclaimer: str = "This risk assessment is for screening purposes only and does not substitute professional medical care."

# Simple heuristic mapping for symptoms to conditions and specialists
SYMPTOM_RULES = [
    {
        "keywords": ["chest pain", "heart", "palpitations", "left arm pain", "shortness of breath", "angina"],
        "condition": "Cardiovascular Issue (e.g., Angina, Heart Attack)",
        "specialist": "Cardiologist",
        "keyword": "cardiologist"
    },
    {
        "keywords": ["headache", "migraine", "dizzy", "dizziness", "numbness", "seizure", "vision", "fainting"],
        "condition": "Neurological Issue (e.g., Migraine, Vertigo)",
        "specialist": "Neurologist",
        "keyword": "neurologist"
    },
    {
        "keywords": ["stomach", "vomiting", "nausea", "diarrhea", "food poisoning", "abdominal", "digestion", "acid"],
        "condition": "Gastrointestinal Issue (e.g., Food Poisoning, Gastritis)",
        "specialist": "Gastroenterologist",
        "keyword": "gastroenterologist"
    },
    {
        "keywords": ["skin", "rash", "itching", "acne", "mole", "hives", "eczema"],
        "condition": "Dermatological Issue (e.g., Eczema, Allergic Reaction)",
        "specialist": "Dermatologist",
        "keyword": "dermatologist"
    },
    {
        "keywords": ["bone", "fracture", "joint", "knee", "back pain", "muscle", "sprain", "injury", "arthritis"],
        "condition": "Musculoskeletal Issue (e.g., Sprain, Fracture, Arthritis)",
        "specialist": "Orthopedic",
        "keyword": "orthopedic"
    },
    {
        "keywords": ["eye", "vision", "blur", "red eye", "pink eye"],
        "condition": "Ocular Issue (e.g., Conjunctivitis)",
        "specialist": "Ophthalmologist",
        "keyword": "ophthalmologist"
    },
    {
        "keywords": ["tooth", "teeth", "gum", "jaw", "dental"],
        "condition": "Dental Issue",
        "specialist": "Dentist",
        "keyword": "dentist"
    },
    {
        "keywords": ["fever", "cough", "cold", "sore throat", "flu", "viral"],
        "condition": "General Infection (e.g., Viral Fever, Flu)",
        "specialist": "General Physician",
        "keyword": "general physician"
    },
    {
        "keywords": ["pregnancy", "period", "menstrual", "bleeding", "pregnant"],
        "condition": "Gynecological Issue",
        "specialist": "Gynecologist",
        "keyword": "gynecologist"
    },
    {
        "keywords": ["child", "baby", "pediatric", "kid"],
        "condition": "Pediatric Issue",
        "specialist": "Pediatrician",
        "keyword": "pediatrician"
    }
]

@router.post("/check", response_model=SymptomResponse)
async def check_symptoms(request: SymptomRequest, current_user: dict = Depends(get_current_user)):
    text = request.symptoms_text.lower()
    
    if request.fever and "fever" not in text:
        text += " fever"
    
    matched_conditions = []
    recommended_specialist = "General Physician"
    specialty_keyword = "hospital"

    for rule in SYMPTOM_RULES:
        if any(re.search(r'\b' + kw + r'\b', text) for kw in rule["keywords"]):
            matched_conditions.append(rule["condition"])
    
    if request.age_group in ["infant", "toddler", "child"]:
        matched_conditions.append("Pediatric Consideration")
        if not matched_conditions or len(matched_conditions) == 1:
            recommended_specialist = "Pediatrician"
            specialty_keyword = "pediatrician"

    if matched_conditions:
        for rule in SYMPTOM_RULES:
            if rule["condition"] == matched_conditions[0]:
                recommended_specialist = rule["specialist"]
                specialty_keyword = rule["keyword"]
                break
    else:
        matched_conditions.append("Unspecified General Illness")

    if request.pain_level and request.pain_level >= 8:
        matched_conditions.append("Severe Pain - Requires Immediate Attention")
        if recommended_specialist == "General Physician":
            recommended_specialist = "Emergency Medicine / Urgent Care"
            specialty_keyword = "hospital"

    return SymptomResponse(
        possible_conditions=list(dict.fromkeys(matched_conditions)),
        recommended_specialist=recommended_specialist,
        specialty_keyword=specialty_keyword
    )


@router.post("/risk-assess", response_model=RiskAssessResponse)
async def calculate_health_risk(data: RiskAssessRequest, current_user: dict = Depends(get_current_user)):
    risk_points = 0
    factors = []

    # 1. BMI Evaluation
    bmi = None
    if data.weight and data.height and data.height > 0:
        height_m = data.height / 100.0
        bmi = round(data.weight / (height_m * height_m), 1)
        if bmi >= 30:
            risk_points += 2.5
            factors.append(f"High BMI ({bmi}) - Obesity Class Risk")
        elif bmi >= 25:
            risk_points += 1.0
            factors.append(f"Elevated BMI ({bmi}) - Overweight Category")

    # 2. Blood Pressure (AHA Guidelines)
    sys = data.systolic or 120
    dia = data.diastolic or 80
    if sys >= 180 or dia >= 120:
        risk_points += 6.0
        factors.append("CRITICAL: Hypertensive Crisis Range (BP >= 180/120)")
    elif sys >= 140 or dia >= 90:
        risk_points += 3.5
        factors.append("Stage 2 Hypertension (BP >= 140/90)")
    elif sys >= 130 or dia >= 80:
        risk_points += 2.0
        factors.append("Stage 1 Hypertension (BP >= 130/80)")

    # 3. Demographics & Lifestyle
    if data.age and data.age >= 65:
        risk_points += 2.0
        factors.append("Age >= 65 Years (Geriatric Consideration)")
    elif data.age and data.age >= 50:
        risk_points += 1.0
        factors.append("Age >= 50 Years")

    if data.smoke:
        risk_points += 2.5
        factors.append("Tobacco / Smoking Habit")
    if data.diabetes:
        risk_points += 2.5
        factors.append("Pre-existing Diabetes Mellitus")

    # 4. Reported Symptoms Severity
    recommended_specialist = "General Physician"
    specialty_keyword = "general physician"
    
    symptoms_str = " ".join(data.symptoms).lower()
    if any(k in symptoms_str for k in ["chest pain", "shortness of breath", "angina"]):
        risk_points += 4.5
        factors.append("High Risk Symptom: Chest Pain / Shortness of Breath")
        recommended_specialist = "Cardiologist"
        specialty_keyword = "cardiologist"
    elif any(k in symptoms_str for k in ["headache", "dizziness", "fainting"]):
        risk_points += 2.5
        factors.append("Neurological Symptom: Severe Headache / Syncope")
        if recommended_specialist == "General Physician":
            recommended_specialist = "Neurologist"
            specialty_keyword = "neurologist"

    # Score Normalization (0 - 100)
    score = min(max((risk_points / 15.0) * 100.0, 10.0), 100.0)

    if score >= 60 or sys >= 180 or dia >= 120:
        category = "High Risk"
        color = "#EF4444"
    elif score >= 35:
        category = "Moderate Risk"
        color = "#F59E0B"
    else:
        category = "Low Risk"
        color = "#10B981"

    if not factors:
        factors = ["No major clinical risk factors detected based on provided parameters."]

    # AI Synthesis via Gemini (if key available)
    ai_analysis = None
    if settings.GEMINI_API_KEY and "simulate" not in settings.GEMINI_API_KEY.lower():
        try:
            prompt = (
                f"You are a medical AI assistant. Patient stats: Age: {data.age}, BMI: {bmi}, BP: {sys}/{dia}, "
                f"Smoker: {data.smoke}, Diabetes: {data.diabetes}, Symptoms: {data.symptoms}. "
                f"Computed Risk Category: {category} ({round(score)}/100). Identified Factors: {factors}. "
                "Provide a concise, 2-sentence professional medical explanation and 1 actionable lifestyle/clinical advice."
            )
            async with httpx.AsyncClient(timeout=8.0) as client:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                resp = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
                if resp.status_code == 200:
                    ai_analysis = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:
            pass

    return RiskAssessResponse(
        score=round(score, 1),
        category=category,
        color=color,
        factors=factors,
        bmi=bmi,
        ai_analysis=ai_analysis,
        recommended_specialist=recommended_specialist,
        specialty_keyword=specialty_keyword
    )

