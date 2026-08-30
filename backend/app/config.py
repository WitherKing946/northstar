import os


class Settings:
    _raw_db_url: str = os.getenv("DATABASE_URL", "sqlite:///./northstar.db")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "embedded")
    LLM_TIMEOUT: float = float(os.getenv("LLM_TIMEOUT", "30"))

    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", os.getenv("VITE_SUPABASE_URL", ""))
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", os.getenv("VITE_SUPABASE_ANON_KEY", ""))

    @property
    def DATABASE_URL(self) -> str:
        url = self._raw_db_url
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg://", 1)
        if url.startswith("postgresql://") and not url.startswith("postgresql+psycopg://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

    @property
    def is_postgres(self) -> bool:
        return self.DATABASE_URL.startswith("postgresql")

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


settings = Settings()