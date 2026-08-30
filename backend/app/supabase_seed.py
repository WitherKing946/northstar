"""One-click Supabase setup — creates tables and seeds the skill catalog.

Usage:
  set DATABASE_URL=postgresql+psycopg://postgres.<ref>:<password>@...supabase.com:6543/postgres?sslmode=require
  python -m app.supabase_seed
"""

from app.config import settings
from app.database import SessionLocal, init_db
from app import seed_catalog

if __name__ == "__main__":
    print(f"Connecting to {settings.DATABASE_URL[:40]}...")
    init_db()
    db = SessionLocal()
    try:
        seed_catalog.seed(db)
        print("Supabase seeding complete — skill graph and resources ready.")
    finally:
        db.close()