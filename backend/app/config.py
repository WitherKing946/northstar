import os

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./northstar.db")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemma3:4b")
    LLM_TIMEOUT: float = float(os.getenv("LLM_TIMEOUT", "30"))

settings = Settings()