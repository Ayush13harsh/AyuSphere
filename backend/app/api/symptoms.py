from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.api.auth import get_current_user
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
    
    # Check if fever is explicitly ticked
    if request.fever and "fever" not in text:
        text += " fever"
    
    # Look for matching rules
    matched_conditions = []
    recommended_specialist = "General Physician"
    specialty_keyword = "hospital"  # Default fallback map search

    for rule in SYMPTOM_RULES:
        # Check if any keyword corresponds to the symptom text
        if any(re.search(r'\b' + kw + r'\b', text) for kw in rule["keywords"]):
            matched_conditions.append(rule["condition"])
    
    # Add age group heuristic
    if request.age_group in ["infant", "toddler", "child"]:
        matched_conditions.append("Pediatric Consideration")
        # If no specific matches, default child to Pediatrician
        if not matched_conditions or len(matched_conditions) == 1:
            recommended_specialist = "Pediatrician"
            specialty_keyword = "pediatrician"

    if matched_conditions:
        # We will use the specialist from the first matched rule as primary
        for rule in SYMPTOM_RULES:
            if rule["condition"] == matched_conditions[0]:
                recommended_specialist = rule["specialist"]
                specialty_keyword = rule["keyword"]
                break
    else:
        # Fallback if no keywords matched
        matched_conditions.append("Unspecified General Illness")

    # If pain is severe, automatically append an urgent note
    if request.pain_level and request.pain_level >= 8:
        matched_conditions.append("Severe Pain - Requires Immediate Attention")
        if recommended_specialist == "General Physician":
            recommended_specialist = "Emergency Medicine / Urgent Care"
            specialty_keyword = "hospital"

    return SymptomResponse(
        possible_conditions=list(dict.fromkeys(matched_conditions)), # make unique
        recommended_specialist=recommended_specialist,
        specialty_keyword=specialty_keyword
    )
