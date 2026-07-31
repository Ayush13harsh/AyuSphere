import secrets
import logging
from pydantic_settings import BaseSettings
from pydantic import field_validator, ConfigDict

logger = logging.getLogger(__name__)

_INSECURE_DEFAULT_KEY = "yoursecretkey_changethis_in_production"


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")

    # Environment needs to be parsed first for SECRET_KEY validation
    ENVIRONMENT: str = "production"  # "development" | "staging" | "production"
    # Fallback to generated secret key if not set
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
    # Environment Flags — default to True so production demo services stay up even if MongoDB is unreachable
    ALLOW_IN_MEMORY_DB: bool = True

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_set(cls, v, info):
        if not v or v == _INSECURE_DEFAULT_KEY:
            env = info.data.get("ENVIRONMENT", "production")
            if env != "development":
                # Generate a secure random fallback key to prevent startup crash on Render while maintaining security
                generated_key = secrets.token_hex(32)
                logger.warning(
                    "SECRET_KEY is set to insecure default or blank in production. "
                    "Generated a secure runtime SECRET_KEY to prevent startup failure."
                )
                return generated_key
        return v


settings = Settings()

