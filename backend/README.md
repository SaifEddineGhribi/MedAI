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

## Amazon Bedrock Integration

This backend uses Amazon Bedrock (Anthropic Claude models) for chat replies via `app/AI/bedrock_client.py`.

Configure using either environment variables or a JSON config file.

- Env vars (quick start):
  - `AWS_REGION` (or `AWS_DEFAULT_REGION`): e.g., `us-east-1`
  - `BEDROCK_MODEL_ID` (optional)
  - `MEDAI_SYSTEM_PROMPT` (optional)
  - `MEDAI_MAX_TOKENS`, `MEDAI_TEMPERATURE` (optional)

- JSON config (recommended for project-local dev):
  - Copy `app/AI/config.example.json` to a safe location, edit values.
  - Point to it with `MEDAI_CONFIG_PATH=/full/path/to/config.json` when running the backend.
  - Any env var set will override corresponding JSON values.

Provide AWS credentials using one of the standard AWS SDK methods:

- Environment: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` (if using STS)
- Shared config/credentials files (`~/.aws/credentials`, `~/.aws/config`)
- IAM Role (EC2/ECS/EKS)

You may also place credentials in the JSON config (for local dev only): `access_key_id`, `secret_access_key`, `session_token`.
Avoid committing secrets to version control.
