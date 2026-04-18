import asyncio
import httpx

async def main():
    url = "https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.3"
    headers = {"Content-Type": "application/json"}
    payload = {
        "inputs": "<s>[INST] You are a doctor. Explain malaria. [/INST]",
        "parameters": {"max_new_tokens": 100, "return_full_text": False}
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload, headers=headers)
        print(resp.status_code, resp.text)

if __name__ == "__main__":
    asyncio.run(main())
