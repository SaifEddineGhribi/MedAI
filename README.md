# MedAI (FastAPI + React)

A minimal full-stack scaffold for a medical platform with a left-hand features panel and an initial feature: AI Medical Assistant. The assistant is wired end-to-end and currently returns a stubbed response of `hello` to any user input. Swap the stub later with a real LLM call.

## Project Structure

- `backend/` — FastAPI app exposing `POST /api/chat`
- `frontend/` — React app (Vite) with sidebar + chat UI

## Prerequisites

- Node.js 18+
- Python 3.9+

## Running Locally

1) Backend (FastAPI)
- Open a terminal in `backend/`
- Create a venv and install deps:
  - macOS/Linux: `python3 -m venv .venv && source .venv/bin/activate`
  - Windows (PowerShell): `py -m venv .venv ; .venv\\Scripts\\Activate.ps1`
  - Install: `pip install -r requirements.txt`
- Start the API: `uvicorn app.main:app --reload --port 8000`
- Health check: `http://localhost:8000/health`

2) Frontend (React + Vite)
- Open a new terminal in `frontend/`
- Install deps: `npm install`
- Start dev server: `npm run dev`
- Open: `http://localhost:5173`

The UI sends messages to the backend at `http://localhost:8000/api/chat`. To change the backend base URL, set `VITE_API_BASE` in the frontend environment, e.g. `VITE_API_BASE=http://localhost:8000`.

## Run with Docker (hot reload)

Requires Docker and Docker Compose.

- Build and start both services: `docker compose up --build`
- Frontend: http://localhost:5173 (Vite HMR enabled)
- Backend: http://localhost:8000 (FastAPI reload enabled)

Code changes in `frontend/` and `backend/` are bind-mounted and trigger hot reload automatically. If you change dependencies (`requirements.txt` or `package.json`), rebuild with `docker compose up --build`.

## AI Config (Bedrock)

Backend integrates Amazon Bedrock via `backend/app/AI/bedrock_client.py`.

Configure via environment or JSON file:
- Env vars: `AWS_REGION` (or `AWS_DEFAULT_REGION`), `BEDROCK_MODEL_ID`, `MEDAI_SYSTEM_PROMPT`, `MEDAI_MAX_TOKENS`, `MEDAI_TEMPERATURE`.
- JSON file: copy `backend/app/AI/config.example.json`, edit, then set `MEDAI_CONFIG_PATH=/absolute/path/to/your.json` before starting the backend. Env vars override JSON values.

Credentials: use standard AWS methods (env vars, `~/.aws/credentials`, or IAM role). You can also place credentials in the JSON for local dev, but do not commit secrets.

- Add authentication and role-based access for multi-user environments.
- Flesh out additional features/tabs and route state as needed.
