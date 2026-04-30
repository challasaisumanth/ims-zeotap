from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    POSTGRES_URL: str = "postgresql://ims:ims@postgres:5432/ims"
    MONGO_URL: str = "mongodb://mongo:27017"
    REDIS_URL: str = "redis://redis:6379"
    RATE_LIMIT: str = "500/minute"

    class Config:
        env_file = ".env"

settings = Settings()