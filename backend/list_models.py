import asyncio
import httpx
from app.core.config import settings

async def main():
    api_key = settings.GEMINI_API_KEY
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        data = resp.json()
        models = [m['name'] for m in data.get('models', [])]
        print([m for m in models if 'flash' in m.lower()])

if __name__ == "__main__":
    asyncio.run(main())
