import asyncio
import httpx

async def main():
    url = "https://text.pollinations.ai/"
    payload = {
        "messages": [
            {"role": "system", "content": "You are Dr. AyuSphere. Be concise."},
            {"role": "user", "content": "I have headache."}
        ]
    }
    headers = {"Content-Type": "application/json"}
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload, headers=headers)
        print(resp.status_code, resp.text)

if __name__ == "__main__":
    asyncio.run(main())
