import asyncio
import httpx
from app.core.config import settings

async def main():
    api_key = settings.GEMINI_API_KEY
    # The models their key can "see"
    models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3-flash-preview']
    
    payload = {
        "contents": [{"role": "user", "parts": [{"text": "Hello"}]}]
    }
    
    async with httpx.AsyncClient() as client:
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                print(f"{model}: SUCCESS!")
                return
            else:
                try:
                    data = resp.json()
                    msg = data.get("error", {}).get("message", "")
                    if "limit: 0" in msg:
                        print(f"{model}: 429 Quota Exceeded (Limit 0)")
                    elif resp.status_code == 429:
                        print(f"{model}: 429 Quota Exceeded (Used up)")
                    else:
                        print(f"{model}: {resp.status_code} - {msg}")
                except Exception:
                    print(f"{model}: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    asyncio.run(main())
