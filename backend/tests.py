import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.anyio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.anyio
async def test_signup_and_login():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        signup_res = await ac.post("/api/v1/auth/signup", json={"email": "test@test.com", "password": "password123"})
        assert signup_res.status_code == 201

        login_res = await ac.post("/api/v1/auth/login", data={"username": "test@test.com", "password": "password123"})
        assert login_res.status_code == 200
        assert "access_token" in login_res.json()
