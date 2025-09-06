# MedAI Backend (FastAPI)

## Setup

- Create and activate a virtual environment
  - macOS/Linux: `python3 -m venv .venv && source .venv/bin/activate`
  - Windows (PowerShell): `py -m venv .venv ; .venv\\Scripts\\Activate.ps1`
- Install dependencies: `pip install -r requirements.txt`

## Run

- Start the API: `uvicorn app.main:app --reload --port 8000`
- Health check: `GET http://localhost:8000/health`
- Chat endpoint (stub): `POST http://localhost:8000/api/chat` with JSON body `{ "message": "..." }`

The chat endpoint currently returns `{\"reply\": \"hello\"}` for any input.

