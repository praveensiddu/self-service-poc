# Development Setup

## Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

## Frontend

The frontend is served by the backend as static assets.

- Open: `http://localhost:8000/`

## Workspace configuration

The server expects a configured workspace and cloned repos. Refer to:

- `backend/README.md` for configuration and repo layout.

## Environment variables

See `backend/README.md` for supported environment variables.
