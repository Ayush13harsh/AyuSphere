from pydantic_settings import BaseSettings
from pydantic import field_validator


_INSECURE_DEFAULT_KEY = "yoursecretkey_changethis_in_production"


class Settings(BaseSettings):
    # Environment needs to be parsed first for SECRET_KEY validation
    ENVIRONMENT: str = "production"  # "development" | "staging" | "production"
    # REQUIRED — app will refuse to start without a real key
    SECRET_KEY: str = _INSECURE_DEFAULT_KEY
    MONGODB_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "healthsos"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    GOOGLE_MAPS_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    GEMINI_API_KEY: str = ""
    # Email API settings
    BREVO_API_KEY: str = ""
    SMTP_FROM_EMAIL: str = "noreply@ayusphere.com"
    # CORS settings (comma-separated list of additional allowed origins)
    CORS_ORIGINS: str = ""
    # Environment Flags
    ALLOW_IN_MEMORY_DB: bool = False

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_set(cls, v, info):
        env = info.data.get("ENVIRONMENT", "production")
        if v == _INSECURE_DEFAULT_KEY and env != "development":
            raise ValueError(
                "CRITICAL: SECRET_KEY is set to the insecure default. "
                "Set a strong, unique SECRET_KEY in your environment variables. "
                "Set ENVIRONMENT=development to bypass this check locally."
            )
        return v

    class Config:
        env_file = ".env"

settings = Settings()
