import json
import os

from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parents[1]


def _load_env(path: str | None = None) -> None:
    """Load KEY=VALUE pairs from a .env file (kept light, no extra deps)."""
    env_file = Path(path) if path else _BACKEND_DIR / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def _load_config_json(path: str | None = None) -> None:
    """Load keys from a backend/config.json file (preferred for the Groq key).

    Values already present in the environment take precedence.
    """
    cfg_file = Path(path) if path else _BACKEND_DIR / "config.json"
    if not cfg_file.exists():
        return
    try:
        data = json.loads(cfg_file.read_text(encoding="utf-8"))
    except Exception:
        return
    if not isinstance(data, dict):
        return
    for key, value in data.items():
        if isinstance(value, str) and key and key not in os.environ:
            os.environ[key] = value


_load_config_json()
_load_env()


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./northstar.db")
    LLM_TIMEOUT: float = float(os.getenv("LLM_TIMEOUT", "60"))

    # Groq (hosted cloud) is the AI provider
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    @property
    def is_postgres(self) -> bool:
        return self.DATABASE_URL.startswith("postgresql")

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


settings = Settings()