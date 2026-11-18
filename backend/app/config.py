from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "VoxLead AI API"
    app_version: str = "1.0.0"
    environment: str = "development"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    vapi_api_key: str = ""
    vapi_public_key: str = ""
    vapi_assistant_id: str = ""
    vapi_webhook_secret: str = ""

    database_url: str = "postgresql://postgres:postgres@localhost:5432/voxlead_db"

    jwt_secret_key: str = "dev-insecure-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    frontend_url: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
