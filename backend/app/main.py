from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

from app.AI.bedrock_client import BedrockChat
from app.AI.config import load_config


class ChatRequest(BaseModel):
    message: str


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
    reply = bedrock.ask(req.message, system_prompt=_CONFIG.model.system_prompt)
    return {"reply": reply}
