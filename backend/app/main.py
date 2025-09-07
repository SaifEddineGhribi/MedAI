from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import os

from app.AI.bedrock_client import BedrockChat
from app.AI.config import load_config


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    # Backward compatibility: allow either a single message or full history
    message: Optional[str] = Field(default=None, description="Single user message")
    messages: Optional[List[Message]] = Field(
        default=None,
        description="Full chat history as list of {role, content}",
    )


class ChatResponse(BaseModel):
    reply: str


app = FastAPI(title="MedAI Backend", version="0.1.0")


def _parse_cors_origins() -> List[str]:
    raw = os.getenv("MEDAI_CORS_ORIGINS", "").strip()
    if raw == "*":
        return ["*"]
    if raw:
        parts = [p.strip() for p in raw.split(",") if p.strip()]
        if parts:
            return parts
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


_CORS_ORIGINS = _parse_cors_origins()
_ALLOW_CREDENTIALS_ENV = os.getenv("MEDAI_CORS_ALLOW_CREDENTIALS", "true").lower() == "true"
# Browsers disallow credentials with wildcard origin. Avoid sending creds with "*".
_ALLOW_CREDENTIALS = _ALLOW_CREDENTIALS_ENV and _CORS_ORIGINS != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=_ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


"""
Avoid creating the Bedrock client at import time so the app can start
even if AWS credentials/region aren't configured yet. We lazily
initialize on first use.
"""
_CONFIG = load_config()
_bedrock_client: Optional[BedrockChat] = None


def _get_bedrock() -> BedrockChat:
    global _bedrock_client
    if _bedrock_client is None:
        _bedrock_client = BedrockChat(config=_CONFIG)
    return _bedrock_client


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    # Prefer multi-turn history if provided; otherwise fall back to single-turn
    try:
        br = _get_bedrock()
        if req.messages:
            # Convert Pydantic models to plain dicts
            history = [{"role": m.role, "content": m.content} for m in req.messages]
            reply = br.chat(history, system_prompt=_CONFIG.model.system_prompt)
        else:
            msg = req.message or ""
            reply = br.ask(msg, system_prompt=_CONFIG.model.system_prompt)
    except Exception as e:
        reply = f"Server configuration error: {e}"
    return {"reply": reply}
