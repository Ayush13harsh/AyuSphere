import asyncio
import httpx
from app.core.config import settings

async def main():
    api_key = settings.GEMINI_API_KEY
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": "hi"}]}]
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{url}?key={api_key}", json=payload)
        print(resp.status_code, resp.json() if resp.status_code != 200 else "SUCCESS")

if __name__ == "__main__":
    asyncio.run(main())
