from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass

from backend.routers import apps, general, clusters, namespaces, resourcequota, limitrange, l4_ingress, pull_requests, egress_ip, rolebindings, app_argocd, nsargocd, egressfirewall, ns_basic, egress
from backend.middleware.readonly import ReadOnlyMiddleware

app = FastAPI(title="Application Management API")

# Add read-only middleware
app.add_middleware(ReadOnlyMiddleware)

# execute the following command to run
# uvicorn backend.main:app --reload
app.include_router(general.router, prefix="/api/v1")
app.include_router(clusters.router, prefix="/api/v1")
app.include_router(apps.router, prefix="/api/v1")
app.include_router(app_argocd.router, prefix="/api/v1")
app.include_router(nsargocd.router, prefix="/api/v1")
app.include_router(namespaces.router, prefix="/api/v1")
app.include_router(ns_basic.router, prefix="/api/v1")
app.include_router(egress.router, prefix="/api/v1")
app.include_router(resourcequota.router, prefix="/api/v1")
app.include_router(limitrange.router, prefix="/api/v1")
app.include_router(rolebindings.router, prefix="/api/v1")
app.include_router(egressfirewall.router, prefix="/api/v1")
app.include_router(l4_ingress.router, prefix="/api/v1")
app.include_router(pull_requests.router, prefix="/api/v1")
app.include_router(egress_ip.router, prefix="/api/v1")

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
    if full_path.startswith("api/v1/") or full_path == "api/v1":
        raise HTTPException(status_code=404)
    if full_path.startswith("static/") or full_path == "static":
        raise HTTPException(status_code=404)
    return FileResponse(str(_FRONTEND_DIR / "index.html"))
