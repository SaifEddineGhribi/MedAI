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

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


# Initialize config and Bedrock client once
_CONFIG = load_config()
bedrock = BedrockChat(config=_CONFIG)


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    # Prefer multi-turn history if provided; otherwise fall back to single-turn
    if req.messages:
        # Convert Pydantic models to plain dicts
        history = [{"role": m.role, "content": m.content} for m in req.messages]
        reply = bedrock.chat(history, system_prompt=_CONFIG.model.system_prompt)
    else:
        msg = req.message or ""
        reply = bedrock.ask(msg, system_prompt=_CONFIG.model.system_prompt)
    return {"reply": reply}
