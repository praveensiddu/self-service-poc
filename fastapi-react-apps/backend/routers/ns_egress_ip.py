from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

import logging

from backend.dependencies import require_env
from backend.routers import pull_requests
from backend.models import NamespaceInfoEgressRequest
from backend.services.namespace_details_service import NamespaceDetailsService
from backend.services.ns_egress_ip_service import NsEgressIpService
from backend.auth.rbac import require_rbac

router = APIRouter(tags=["egress"])

logger = logging.getLogger("uvicorn.error")

# Initialize services
ns_egress_ip_service = NsEgressIpService()


def get_namespace_details_service() -> NamespaceDetailsService:
    """Dependency injection for NamespaceDetailsService."""
    return NamespaceDetailsService()


def get_ns_egress_ip_service() -> NsEgressIpService:
    return ns_egress_ip_service


@router.put("/apps/{appname}/namespaces/{namespace}/namespace_info/egress")
def put_namespace_info_egress(
    appname: str,
    namespace: str,
    payload: NamespaceInfoEgressRequest,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service),
    ns_egress_service: NsEgressIpService = Depends(get_ns_egress_ip_service),
    _: None = Depends(require_rbac(
        obj=lambda r: f"/apps/{r.path_params.get('appname', '')}/namespaces",
        act="POST",
        app_id=lambda r: r.path_params.get("appname", "")
    ))
):
    """Update egress information for a namespace. Requires manager role."""
    env = require_env(env)

    ni = payload.namespace_info
    remove_egress_nameid = ni.egress_nameid is None
    result = service.update_egress_info(
        env,
        appname,
        namespace,
        egress_nameid=None if remove_egress_nameid else ni.egress_nameid,
        remove_egress_nameid=remove_egress_nameid,
        enable_pod_based_egress_ip=ni.enable_pod_based_egress_ip,
    )

    # If egress_nameid is set, ensure an IP is allocated for this namespace in each cluster.
    egress_nameid = result.get("egress_nameid")
    if egress_nameid:
        clusters_list = result.get("clusters", [])

        try:
            ns_egress_service.ensure_egress_ip_allocations(
                env=env,
                appname=appname,
                egress_nameid=str(egress_nameid),
                clusters_list=clusters_list,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to persist egress IP allocation: {e}",
            )


    try:
        pull_requests.ensure_pull_request(appname=appname, env=env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", str(env), str(appname), str(e))

    return {
        "egress_nameid": result.get("egress_nameid"),
        "enable_pod_based_egress_ip": result.get("enable_pod_based_egress_ip"),
    }


@router.get("/apps/{appname}/namespaces/{namespace}/namespace_info/egress")
def get_namespace_info_egress(
    appname: str,
    namespace: str,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service),
    ns_egress_service: NsEgressIpService = Depends(get_ns_egress_ip_service),
    _: None = Depends(require_rbac(
        obj=lambda r: f"/apps/{r.path_params.get('appname', '')}/namespaces",
        act="GET",
        app_id=lambda r: r.path_params.get("appname", "")
    ))
):
    """Get egress information for a namespace. Requires viewer or manager role."""
    env = require_env(env)

    base = service.get_egress_info(env, appname, namespace)
    egress_nameid = base.get("egress_nameid")
    if not egress_nameid:
        return {**base, "allocated_egress_ips": []}

    allocated_egress_ips = ns_egress_service.get_allocated_egress_ips_for_namespace(
        env=env,
        appname=appname,
        namespace=namespace,
        egress_nameid=str(egress_nameid),
        namespace_details_service=service,
    )

    return {**base, "allocated_egress_ips": allocated_egress_ips}


@router.get("/apps/{appname}/namespaces/{namespace}/egress_ip")
def get_namespace_egress_info(
    appname: str,
    namespace: str,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service),
    _: None = Depends(require_rbac(
        obj=lambda r: f"/apps/{r.path_params.get('appname', '')}/namespaces",
        act="GET",
        app_id=lambda r: r.path_params.get("appname", "")
    ))
):
    """Get egress IP information for a namespace. Requires viewer or manager role."""
    env = require_env(env)
    return service.get_egress_info(env, appname, namespace)


