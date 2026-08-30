import os


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./northstar.db")
    # Embedded AI is now inside the app; these are kept for backwards compat only
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "embedded")
    LLM_TIMEOUT: float = float(os.getenv("LLM_TIMEOUT", "30"))

    @property
    def is_postgres(self) -> bool:
        return self.DATABASE_URL.startswith("postgresql")

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


settings = Settings()