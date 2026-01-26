from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List, Optional
from pathlib import Path
import shutil

import yaml

router = APIRouter(tags=["apps"])


def _config_path() -> Path:
    return Path.home() / ".kselfserve" / "kselfserveconfig.yaml"


def _require_initialized_workspace() -> Path:
    cfg_path = _config_path()
    if not cfg_path.exists():
        raise HTTPException(status_code=400, detail="not initialized")

    try:
        raw_cfg = yaml.safe_load(cfg_path.read_text()) or {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read config: {e}")

    if not isinstance(raw_cfg, dict):
        raise HTTPException(status_code=400, detail="not initialized")

    workspace = str(raw_cfg.get("workspace", "") or "").strip()
    if not workspace:
        raise HTTPException(status_code=400, detail="not initialized")

    workspace_path = Path(workspace).expanduser()
    if not workspace_path.exists() or not workspace_path.is_dir():
        raise HTTPException(status_code=400, detail="not initialized")

    requests_root = (
        workspace_path
        / "kselfserv"
        / "cloned-repositories"
        / "requests"
        / "app-requests"
    )
    if not requests_root.exists() or not requests_root.is_dir():
        raise HTTPException(status_code=400, detail="not initialized")

    return requests_root


L4_INGRESS_BY_ENV_AND_APP: Dict[str, Dict[str, List[Dict[str, Any]]]] = {
    "dev": {
        "app1": [
            {
                "cluster_no": "01",
                "requested_total": 2,
                "allocated_total": 2,
                "allocated_ips": ["1.10.1.10", "1.10.1.11"],
                "allocations": [
                    {
                        "name": "l4ingress_app1_dev",
                        "purpose": "app1",
                        "app": "app1",
                        "ips": ["1.10.1.10", "1.10.1.11"],
                        "count": 2,
                        "url": "https://mygitserver.com/dev/app1/l4ingressip-allocated.yaml",
                    }
                ],
                "links": {"requestFileUrl": "https://mygitserver.com/dev/app1/l4_ingress_request.yaml", "allocatedFileUrl": "https://mygitserver.com/dev/app1/l4ingressip-allocated.yaml"},
            }
        ],
        "app2": [
            {
                "cluster_no": "04",
                "requested_total": 1,
                "allocated_total": 1,
                "allocated_ips": ["1.1.20.10"],
                "allocations": [
                    {
                        "name": "l4ingress_app2_dev",
                        "purpose": "app2",
                        "app": "app2",
                        "ips": ["1.1.20.10"],
                        "count": 1,
                        "url": "https://mygitserver.com/dev/app2/l4ingressip-allocated.yaml",
                    }
                ],
                "links": {"requestFileUrl": "https://mygitserver.com/dev/app2/l4_ingress_request.yaml", "allocatedFileUrl": "https://mygitserver.com/dev/app2/l4ingressip-allocated.yaml"},
            }
        ],
    },
    "qa": {
        "app1": [
            {
                "cluster_no": "11",
                "requested_total": 2,
                "allocated_total": 2,
                "allocated_ips": ["1.20.1.10", "1.20.1.11"],
                "allocations": [
                    {
                        "name": "l4ingress_app1_qa",
                        "purpose": "app1",
                        "app": "app1",
                        "ips": ["1.20.1.10", "1.20.1.11"],
                        "count": 2,
                        "url": "https://mygitserver.com/qa/app1/l4ingressip-allocated.yaml",
                    }
                ],
                "links": {"requestFileUrl": "https://mygitserver.com/qa/app1/l4_ingress_request.yaml", "allocatedFileUrl": "https://mygitserver.com/qa/app1/l4ingressip-allocated.yaml"},
            }
        ],
        "app2": [
            {
                "cluster_no": "12",
                "requested_total": 2,
                "allocated_total": 2,
                "allocated_ips": ["1.20.20.10", "1.20.20.11"],
                "allocations": [
                    {
                        "name": "l4ingress_app2_qa",
                        "purpose": "app2",
                        "app": "app2",
                        "ips": ["1.20.20.10", "1.20.20.11"],
                        "count": 2,
                        "url": "https://mygitserver.com/qa/app2/l4ingressip-allocated.yaml",
                    }
                ],
                "links": {"requestFileUrl": "https://mygitserver.com/qa/app2/l4_ingress_request.yaml", "allocatedFileUrl": "https://mygitserver.com/qa/app2/l4ingressip-allocated.yaml"},
            }
        ],
    },
    "prd": {
        "app1": [
            {
                "cluster_no": "01",
                "requested_total": 66,
                "allocated_total": 66,
                "allocated_ips": ["1.1.21.150", "1.1.21.151"],
                "allocations": [
                    {
                        "name": "l4ingress_app1_app1",
                        "purpose": "app1",
                        "app": "app1",
                        "ips": ["1.1.21.150", "1.1.21.151"],
                        "count": 66,
                        "url": "https://mygitserver.com/projects/openshiftautomation/repos/ocp-app-prov-generated/browse/ip_provisioning/c01/l4ingressip-allocated.yaml?at=refs/heads/prd",
                    }
                ],
                "links": {
                    "requestFileUrl": "https://mygitserver.com/projects/openshiftautomation/repos/ocp-ocp-prov-requests/browse/apprequests/prd/app1/l4_ingress_request.yaml?at=refs/heads/master",
                    "allocatedFileUrl": "https://mygitserver.com/projects/openshiftautomation/repos/ocp-app-prov-generated/browse/ip_provisioning/c01/l4ingressip-allocated.yaml?at=refs/heads/prd",
                },
            },
            {
                "cluster_no": "04",
                "requested_total": 66,
                "allocated_total": 66,
                "allocated_ips": ["1.1.12.150", "1.1.12.151"],
                "purpose": "",
                "url": "https://mygitserver.com/projects/openshiftautomation/repos/ocp-app-prov-generated/browse/ip_provisioning/c04/l4ingressip-allocated.yaml?at=refs/heads/prd",
                   
                "allocations": [
                    {
                        "name": "l4ingress_app1_app1",
                    }
                ],
                "links": {
                    "requestFileUrl": "https://mygitserver.com/projects/openshiftautomation/repos/ocp-ocp-prov-requests/browse/apprequests/prd/app1/l4_ingress_request.yaml?at=refs/heads/master",
                    "allocatedFileUrl": "https://mygitserver.com/projects/openshiftautomation/repos/ocp-app-prov-generated/browse/ip_provisioning/c04/l4ingressip-allocated.yaml?at=refs/heads/prd",
                },
            },
        ]
    }
}


PULL_REQUESTS_BY_ENV_AND_APP: Dict[str, Dict[str, List[Dict[str, Any]]]] = {
    "prd": {
        "app1": [
            {
                "appname": "app1",
                "clusterno": "06",
                "description": "prd-dc4--06-app1-update",
                "createdby": "psiddu",
                "link": "https://mygitserver.com/projects/openshiftautomation/repos/ocp-app-prov-generated/prs/7041/overview",
            },
            {
                "appname": "app1",
                "clusterno": "11",
                "description": "prd-dc2--11-app1-update",
                "createdby": "psiddu",
                "link": "https://mygitserver.com/projects/openshiftautomation/repos/ocp-app-prov-generated/prs/7040/overview",
            },
            {
                "appname": "app1",
                "clusterno": "12",
                "description": "prd-dc3--12-app1-update",
                "createdby": "psiddu",
                "link": "https://mygitserver.com/projects/openshiftautomation/repos/ocp-app-prov-generated/prs/7039/overview",
            },
            {
                "appname": "app1",
                "clusterno": "07",
                "description": "prd-dc4--07-app1-update",
                "createdby": "psiddu",
                "link": "https://mygitserver.com/projects/openshiftautomation/repos/ocp-app-prov-generated/prs/7038/overview",
            },
        ]
    }
}


EGRESS_IPS_BY_ENV_AND_APP: Dict[str, Dict[str, List[Dict[str, Any]]]] = {
    "dev": {
        "app1": [
            {
                "selector": "app=app1-dev",
                "cluster": "01",
                "allocation_id": "egress-ip-01-dev-001",
                "allocated_ips": ["10.0.1.100", "10.0.1.101"],
                "link": "https://console.dev-cluster-01.com/egress/egress-ip-01-dev-001"
            },
            {
                "selector": "app=app1-dev-ns2",
                "cluster": "04",
                "allocation_id": "egress-ip-04-dev-002",
                "allocated_ips": ["10.0.4.102"],
                "link": "https://console.dev-cluster-04.com/egress/egress-ip-04-dev-002"
            }
        ],
        "app2": [
            {
                "selector": "app=app2-dev",
                "cluster": "07",
                "allocation_id": "egress-ip-07-dev-003",
                "allocated_ips": ["10.0.7.103", "10.0.7.104"],
                "link": "https://console.dev-cluster-07.com/egress/egress-ip-07-dev-003"
            }
        ]
    },
    "qa": {
        "app1": [
            {
                "selector": "app=app1-qa",
                "cluster": "11",
                "allocation_id": "egress-ip-11-qa-001",
                "allocated_ips": ["1.1.11.100"],
                "link": "https://console.qa-cluster-11.com/egress/egress-ip-11-qa-001"
            },
            {
                "selector": "app=app1-qa-ns2",
                "cluster": "12",
                "allocation_id": "egress-ip-12-qa-002",
                "allocated_ips": ["1.1.12.101", "1.1.12.102"],
                "link": "https://console.qa-cluster-12.com/egress/egress-ip-12-qa-002"
            },
            {
                "selector": "app=app1-qa-ns3",
                "cluster": "06",
                "allocation_id": "egress-ip-06-qa-003",
                "allocated_ips": ["1.1.6.103"],
                "link": "https://console.qa-cluster-06.com/egress/egress-ip-06-qa-003"
            }
        ],
        "app2": [
            {
                "selector": "app=app2-qa",
                "cluster": "01",
                "allocation_id": "egress-ip-01-qa-004",
                "allocated_ips": ["1.1.1.104"],
                "link": "https://console.qa-cluster-01.com/egress/egress-ip-01-qa-004"
            },
            {
                "selector": "app=app2-qa-ns2",
                "cluster": "04",
                "allocation_id": "egress-ip-04-qa-005",
                "allocated_ips": ["1.1.4.105", "1.1.4.106"],
                "link": "https://console.qa-cluster-04.com/egress/egress-ip-04-qa-005"
            }
        ]
    },
    "prd": {
        "app1": [
            {
                "selector": "app=app1-prod",
                "cluster": "01",
                "allocation_id": "egress-ip-01-prd-001",
                "allocated_ips": ["1.2.1.100", "1.2.1.101", "1.2.1.102"],
                "link": "https://console.prod-cluster-01.com/egress/egress-ip-01-prd-001"
            },
            {
                "selector": "app=app1-prod-ns2",
                "cluster": "04",
                "allocation_id": "egress-ip-04-prd-002",
                "allocated_ips": ["1.2.4.103", "1.2.4.104"],
                "link": "https://console.prod-cluster-04.com/egress/egress-ip-04-prd-002"
            },
            {
                "selector": "app=app1-prod-ns3",
                "cluster": "07",
                "allocation_id": "egress-ip-07-prd-003",
                "allocated_ips": ["1.2.7.105"],
                "link": "https://console.prod-cluster-07.com/egress/egress-ip-07-prd-003"
            }
        ],
        "app2": [
            {
                "selector": "app=app2-prod",
                "cluster": "12",
                "allocation_id": "egress-ip-12-prd-004",
                "allocated_ips": ["1.2.12.106", "1.2.12.107"],
                "link": "https://console.prod-cluster-12.com/egress/egress-ip-12-prd-004"
            }
        ]
    }
}


def _require_env(env: Optional[str]) -> str:
    if not env:
        raise HTTPException(status_code=400, detail="Missing required query parameter: env")
    return env.strip().lower()


@router.get("/apps")
def list_apps(env: Optional[str] = None):
    env = _require_env(env)
    requests_root = _require_initialized_workspace()

    env_dir = requests_root / env
    if not env_dir.exists() or not env_dir.is_dir():
        raise HTTPException(status_code=400, detail="not initialized")

    apps_out: Dict[str, Dict[str, Any]] = {}
    for child in env_dir.iterdir():
        if not child.is_dir():
            continue

        appname = child.name
        appinfo_path = child / "appinfo.yaml"
        description = ""
        managedby = ""

        if appinfo_path.exists() and appinfo_path.is_file():
            try:
                appinfo = yaml.safe_load(appinfo_path.read_text()) or {}
                if isinstance(appinfo, dict):
                    description = str(appinfo.get("description", "") or "")
                    managedby = str(appinfo.get("managedby", "") or "")
            except Exception:
                description = ""
                managedby = ""

        totalns = 0
        try:
            totalns = sum(1 for p in child.iterdir() if p.is_dir())
        except Exception:
            totalns = 0

        apps_out[appname] = {
            "appname": appname,
            "description": description,
            "managedby": managedby,
            "totalns": totalns,
        }

    return apps_out


@router.delete("/apps/{appname}")
def delete_app(appname: str, env: Optional[str] = None):
    """Delete an application and all its associated data (namespaces, L4 ingress, pull requests)"""
    env = _require_env(env)

    requests_root = _require_initialized_workspace()
    app_dir = requests_root / env / appname
    if not app_dir.exists() or not app_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"App folder not found: {app_dir}")

    deleted_data = {
        "appname": appname,
        "env": env,
        "deleted": False,
        "removed": {}
    }

    try:
        shutil.rmtree(app_dir)
        deleted_data["removed"]["folder"] = True
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete app folder {app_dir}: {e}")



    deleted_data["deleted"] = True
    return deleted_data
