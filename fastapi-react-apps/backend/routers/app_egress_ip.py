from fastapi import APIRouter, Depends
from typing import Any, Dict, List, Optional

import yaml

from backend.dependencies import require_env, get_workspace_path
from backend.auth.rbac import require_rbac

router = APIRouter(tags=["egress_ip"])



@router.get("/apps/{appname}/egress_ips")
def get_egress_ips(
    appname: str,
    env: Optional[str] = None,
    _: None = Depends(require_rbac(obj=lambda r: r.url.path, act=lambda r: r.method, app_id=lambda r: r.path_params.get("appname", ""))),
):
    env = require_env(env)

    workspace_path = get_workspace_path()
    rendered_root = (
        workspace_path
        / "kselfserv"
        / "cloned-repositories"
        / f"rendered_{str(env or '').strip().lower()}"
        / "ip_provisioning"
    )
    if not rendered_root.exists() or not rendered_root.is_dir():
        return []

    target_prefix = f"{str(appname or '').strip()}_"
    merged: Dict[str, List[Dict[str, Any]]] = {}

    for path in rendered_root.rglob("egressip-allocated.yaml"):
        if not path.is_file():
            continue

        # rendered_<env>/ip_provisioning/<cluster>/egressip-allocated.yaml
        # cluster is the immediate parent directory under ip_provisioning.
        cluster = ""
        try:
            cluster = str(path.parent.name or "").strip()
        except Exception:
            cluster = ""

        try:
            raw = yaml.safe_load(path.read_text()) or {}
        except Exception:
            continue
        if not isinstance(raw, dict):
            continue

        for k, v in raw.items():
            key = str(k or "").strip()
            if not key.startswith(target_prefix):
                continue
            ips = [str(x).strip() for x in v] if isinstance(v, list) else []
            ips = [x for x in ips if x]
            if not ips:
                continue

            row_key = f"{cluster}::{key}"
            prev_rows = merged.get(row_key) or []
            prev_ips: List[str] = []
            if prev_rows:
                existing_any = prev_rows[0].get("allocated_ips")
                prev_ips = [str(x).strip() for x in existing_any] if isinstance(existing_any, list) else []
                prev_ips = [x for x in prev_ips if x]

            seen = set(prev_ips)
            for ip in ips:
                if ip in seen:
                    continue
                prev_ips.append(ip)
                seen.add(ip)

            merged[row_key] = [{"cluster": cluster, "allocation_id": key, "allocated_ips": prev_ips}]

    out: List[Dict[str, Any]] = []
    for row_key in sorted(merged.keys(), key=lambda s: s.lower()):
        rows = merged.get(row_key) or []
        if not rows:
            continue
        out.append(rows[0])
    return out
