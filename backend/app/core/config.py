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
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    class Config:
        env_file = ".env"

settings = Settings()
