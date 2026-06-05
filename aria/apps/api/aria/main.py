"""Aria API entry point."""

from dotenv import load_dotenv

load_dotenv(override=True)

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from aria.routes import agent

app = FastAPI(title="Aria API")

_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    # Vercel preview + production — set ALLOWED_ORIGIN env var to lock down
    *(
        [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
        if os.environ.get("ALLOWED_ORIGINS")
        else []
    ),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent.router)


@app.get("/")
async def root():
    return {"service": "aria", "status": "ok"}


@app.get("/health")
async def health():
    return {"ok": True}
