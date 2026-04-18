import asyncio
import httpx

async def main():
    url = "https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta"
    headers = {"Content-Type": "application/json"}
    payload = {
        "inputs": "<|system|>\nYou are an AI doctor.\n<|user|>\nI have a headache.\n<|assistant|>\n",
        "parameters": {"max_new_tokens": 100, "return_full_text": False}
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload, headers=headers)
        print(resp.status_code, resp.text)

if __name__ == "__main__":
    asyncio.run(main())
