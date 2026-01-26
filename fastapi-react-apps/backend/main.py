from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from backend.routers import apps, general, namespaces, l4_ingress, pull_requests, egress_ip

app = FastAPI(title="Application Management API")
# execute the following command to run
# uvicorn backend.main:app --reload
app.include_router(general.router, prefix="/api")
app.include_router(apps.router, prefix="/api")
app.include_router(namespaces.router, prefix="/api")
app.include_router(l4_ingress.router, prefix="/api")
app.include_router(pull_requests.router, prefix="/api")
app.include_router(egress_ip.router, prefix="/api")

_BACKEND_DIR = Path(__file__).resolve().parent
_FRONTEND_DIR = _BACKEND_DIR.parent / "frontend"

app.mount("/static", StaticFiles(directory=str(_FRONTEND_DIR)), name="static")


@app.get("/")
def serve_ui():
    return FileResponse(str(_FRONTEND_DIR / "index.html"))


@app.get("/{full_path:path}")
def serve_ui_routes(full_path: str):
    if full_path.startswith("api/") or full_path == "api":
        raise HTTPException(status_code=404)
    if full_path.startswith("static/") or full_path == "static":
        raise HTTPException(status_code=404)
    return FileResponse(str(_FRONTEND_DIR / "index.html"))
