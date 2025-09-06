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

The UI sends messages to the backend at `http://localhost:8000/api/chat` and will always display `hello` from the server. To change the backend base URL, set `VITE_API_BASE` in the frontend environment, e.g. `VITE_API_BASE=http://localhost:8000`.

## Run with Docker (hot reload)

Requires Docker and Docker Compose.

- Build and start both services: `docker compose up --build`
- Frontend: http://localhost:5173 (Vite HMR enabled)
- Backend: http://localhost:8000 (FastAPI reload enabled)

Code changes in `frontend/` and `backend/` are bind-mounted and trigger hot reload automatically. If you change dependencies (`requirements.txt` or `package.json`), rebuild with `docker compose up --build`.

## Next Steps

- Replace the stub in `backend/app/main.py` with your LLM provider call (e.g., OpenAI) and return the actual model response.
- Add authentication and role-based access for multi-user environments.
- Flesh out additional features/tabs and route state as needed.
