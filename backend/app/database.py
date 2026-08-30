from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

from .config import settings


class Base(DeclarativeBase):
    pass


def _engine_kwargs(url: str) -> dict:
    kwargs: dict = {}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    if url in ("sqlite://", "sqlite:///:memory:"):
        kwargs["poolclass"] = StaticPool
    if url.startswith("postgresql"):
        # Supabase pooled connections need these
        is_supabase = "supabase" in url
        kwargs["pool_pre_ping"] = True
        kwargs["pool_recycle"] = 300
        if is_supabase:
            kwargs["connect_args"] = {
                "sslmode": "require",
                "prepare_threshold": 0,
                "options": "-c statement_timeout=30000",
            }
            # psycopg prepared_statement_cache_size must be 0 for pgbouncer
            kwargs["connect_args"]["prepare_threshold"] = None
    return kwargs


engine = create_engine(settings.DATABASE_URL, **_engine_kwargs(settings.DATABASE_URL))
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)