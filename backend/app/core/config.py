from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "yoursecretkey_changethis_in_production"
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

    class Config:
        env_file = ".env"

settings = Settings()
