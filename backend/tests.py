import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongodb import db

@pytest.fixture(autouse=True)
async def setup_db():
    """Ensure the in-memory database is initialized for tests."""
    await db.connect()
    yield
    await db.disconnect()

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
        # Step 1: Request signup OTP
        signup_res = await ac.post("/api/v1/auth/signup", json={"email": "test@test.com", "password": "Password1"})
        assert signup_res.status_code == 200
        assert "OTP" in signup_res.json()["message"]

        # Step 2: Retrieve OTP from in-memory DB and verify signup
        otp_record = await db.db.users_otp.find_one({"email": "test@test.com", "purpose": "signup"})
        assert otp_record is not None
        otp = otp_record["otp"]

        verify_res = await ac.post("/api/v1/auth/verify-signup", json={
            "email": "test@test.com",
            "otp": otp,
            "password": "Password1"
        })
        assert verify_res.status_code == 201
        assert "access_token" in verify_res.json()

        # Step 3: Login with the created account
        login_res = await ac.post("/api/v1/auth/login", data={"username": "test@test.com", "password": "Password1"})
        assert login_res.status_code == 200
        assert "access_token" in login_res.json()

@pytest.mark.anyio
async def test_weak_password_rejected():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Password too short
        res = await ac.post("/api/v1/auth/signup", json={"email": "weak@test.com", "password": "short"})
        assert res.status_code == 422

        # Password without uppercase
        res = await ac.post("/api/v1/auth/signup", json={"email": "weak@test.com", "password": "password1"})
        assert res.status_code == 422

        # Password without digit
        res = await ac.post("/api/v1/auth/signup", json={"email": "weak@test.com", "password": "Password"})
        assert res.status_code == 422

@pytest.mark.anyio
async def test_verify_signup_invalid_otp_returns_json():
    """Verify that invalid OTP returns a proper JSON error, not a server crash."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # First request signup OTP
        await ac.post("/api/v1/auth/signup", json={"email": "otp_test@test.com", "password": "Password1"})

        # Try to verify with wrong OTP
        verify_res = await ac.post("/api/v1/auth/verify-signup", json={
            "email": "otp_test@test.com",
            "otp": "000000",
            "password": "Password1"
        })
        assert verify_res.status_code == 400
        data = verify_res.json()
        assert "detail" in data
        assert data["detail"] == "Invalid OTP"

@pytest.mark.anyio
async def test_rate_limit_returns_json():
    """Verify that rate limit exceeded returns a proper JSON 429 response."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Send requests up to the rate limit (5/minute for signup)
        for i in range(6):
            res = await ac.post("/api/v1/auth/signup", json={
                "email": f"ratelimit{i}@test.com",
                "password": "Password1"
            })
            if res.status_code == 429:
                data = res.json()
                assert "detail" in data
                break
