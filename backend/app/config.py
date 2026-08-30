import os


def _normalize_db_url(url: str) -> str:
    # Supabase and generic postgres:// -> psycopg driver
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://") and "+psycopg" not in url:
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


class Settings:
    DATABASE_URL: str = _normalize_db_url(os.getenv("DATABASE_URL", "sqlite:///./northstar.db"))
    # Embedded AI is primary; external providers are optional enhancements
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "embedded")
    LLM_TIMEOUT: float = float(os.getenv("LLM_TIMEOUT", "30"))

    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "") or os.getenv("SUPABASE_ANON_KEY", "")

    @property
    def is_postgres(self) -> bool:
        return self.DATABASE_URL.startswith("postgresql")

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


settings = Settings()