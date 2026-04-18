import asyncio
import httpx
from app.core.config import settings

async def main():
    api_key = settings.GEMINI_API_KEY
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    system_prompt = (
        "You are Dr. AyuSphere, a virtual health assistant in an emergency health app. "
        "Provide brief, practical health advice for common symptoms and answer general health inquiries. "
        "Be professional and always remind users to consult a real doctor for proper diagnosis. "
        "Keep your response concise (3-4 sentences max)."
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"System Guidelines: {system_prompt}\n\nPatient says: what is typhoid?"}]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 250,
        }
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload)
        data = resp.json()
        try:
            print("FULL RESPONSE JSON:")
            print(data)
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            print("\nEXTRACTED TEXT:")
            print(text.strip())
        except Exception as e:
            print(f"Error extracting: {e}")

if __name__ == "__main__":
    asyncio.run(main())
