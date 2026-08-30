from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import seed_catalog
from .database import SessionLocal, init_db
from .api import chat, dashboard, learners, paths


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        seed_catalog.seed(db)
    finally:
        db.close()
    yield


app = FastAPI(title="North Star API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(learners.router)
app.include_router(paths.router)
app.include_router(chat.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}