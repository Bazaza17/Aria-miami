"""Aria API entry point."""

from dotenv import load_dotenv

load_dotenv(override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from aria.routes import agent

app = FastAPI(title="Aria API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
