from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List, Optional

router = APIRouter(tags=["apps"])


APPS_BY_ENV: Dict[str, Dict[str, Dict[str, Any]]] = {
    "dev": {
        "app1": {"appname": "app1", "description": "", "managedby": "ldapgrp-dev", "totalns": 2},
        "app2": {"appname": "app2", "description": "", "managedby": "ldapgrp-dev", "totalns": 1},
    },
    "qa": {
        "app1": {"appname": "app1", "description": "", "managedby": "ldapgrp-qa", "totalns": 3},
        "app2": {"appname": "app2", "description": "", "managedby": "ldapgrp-qa", "totalns": 2},
    },
    "prd": {
        "app1": {"appname": "app1", "description": "", "managedby": "ldapgrp1,ldapgrp2", "totalns": 8},
        "app2": {"appname": "app2", "description": "", "managedby": "ldapgrp1", "totalns": 2},
    }
}


NAMESPACES_BY_ENV_AND_APP: Dict[str, Dict[str, Dict[str, Any]]] = {
    "dev": {
        "app1": {
            "app1-dev-ns1": {
                "name": "app1-dev-ns1",
                "description": "",
                "clusters": ["01"],
                "egress_nameid": None,
                "enable_pod_based_egress_ip": False,
                "allow_all_egress": True,
                "need_argo": False,
                "generate_argo_app": False,
                "status": "Argo not used",
                "resources": {
                    "requests": {"cpu": "10", "memory": "10Gi"},
                    "limits": {"cpu": None, "memory": "10Gi"},
                },
                "rbac": {"roles": []},
                "file_index": {"crb": [], "rb": [], "limits": [], "requestsquotas": [], "egress": [], "role": []},
            },
            "app1-dev-ns2": {
                "name": "app1-dev-ns2",
                "description": "",
                "clusters": ["04"],
                "egress_nameid": None,
                "enable_pod_based_egress_ip": False,
                "allow_all_egress": True,
                "need_argo": False,
                "generate_argo_app": False,
                "status": "Argo not used",
                "resources": {
                    "requests": {"cpu": "10", "memory": "10Gi"},
                    "limits": {"cpu": None, "memory": "10Gi"},
                },
                "rbac": {"roles": []},
                "file_index": {"crb": [], "rb": [], "limits": [], "requestsquotas": [], "egress": [], "role": []},
            },
        },
        "app2": {
            "app2-dev-ns1": {
                "name": "app2-dev-ns1",
                "description": "",
                "clusters": ["07"],
                "egress_nameid": None,
                "enable_pod_based_egress_ip": False,
                "allow_all_egress": True,
                "need_argo": False,
                "generate_argo_app": False,
                "status": "Argo not used",
                "resources": {
                    "requests": {"cpu": "5", "memory": "5Gi"},
                    "limits": {"cpu": None, "memory": "5Gi"},
                },
                "rbac": {"roles": []},
                "file_index": {"crb": [], "rb": [], "limits": [], "requestsquotas": [], "egress": [], "role": []},
            }
        },
    },
    "qa": {
        "app1": {
            "app1-qa-ns1": {
                "name": "app1-qa-ns1",
                "description": "",
                "clusters": ["11"],
                "egress_nameid": None,
                "enable_pod_based_egress_ip": False,
                "allow_all_egress": True,
                "need_argo": False,
                "generate_argo_app": False,
                "status": "Argo not used",
                "resources": {
                    "requests": {"cpu": "20", "memory": "20Gi"},
                    "limits": {"cpu": None, "memory": "20Gi"},
                },
                "rbac": {"roles": []},
                "file_index": {"crb": [], "rb": [], "limits": [], "requestsquotas": [], "egress": [], "role": []},
            },
            "app1-qa-ns2": {
                "name": "app1-qa-ns2",
                "description": "",
                "clusters": ["12"],
                "egress_nameid": None,
                "enable_pod_based_egress_ip": False,
                "allow_all_egress": True,
                "need_argo": False,
                "generate_argo_app": False,
                "status": "Argo not used",
                "resources": {
                    "requests": {"cpu": "20", "memory": "20Gi"},
                    "limits": {"cpu": None, "memory": "20Gi"},
                },
                "rbac": {"roles": []},
                "file_index": {"crb": [], "rb": [], "limits": [], "requestsquotas": [], "egress": [], "role": []},
            },
            "app1-qa-ns3": {
                "name": "app1-qa-ns3",
                "description": "",
                "clusters": ["06"],
                "egress_nameid": None,
                "enable_pod_based_egress_ip": False,
                "allow_all_egress": True,
                "need_argo": False,
                "generate_argo_app": False,
                "status": "Argo not used",
                "resources": {
                    "requests": {"cpu": "20", "memory": "20Gi"},
                    "limits": {"cpu": None, "memory": "20Gi"},
                },
                "rbac": {"roles": []},
                "file_index": {"crb": [], "rb": [], "limits": [], "requestsquotas": [], "egress": [], "role": []},
            },
        },
        "app2": {
            "app2-qa-ns1": {
                "name": "app2-qa-ns1",
                "description": "",
                "clusters": ["01"],
                "egress_nameid": None,
                "enable_pod_based_egress_ip": False,
                "allow_all_egress": True,
                "need_argo": False,
                "generate_argo_app": False,
                "status": "Argo not used",
                "resources": {
                    "requests": {"cpu": "10", "memory": "10Gi"},
                    "limits": {"cpu": None, "memory": "10Gi"},
                },
                "rbac": {"roles": []},
                "file_index": {"crb": [], "rb": [], "limits": [], "requestsquotas": [], "egress": [], "role": []},
            },
            "app2-qa-ns2": {
                "name": "app2-qa-ns2",
                "description": "",
                "clusters": ["04"],
                "egress_nameid": None,
                "enable_pod_based_egress_ip": False,
                "allow_all_egress": True,
                "need_argo": False,
                "generate_argo_app": False,
                "status": "Argo not used",
                "resources": {
                    "requests": {"cpu": "10", "memory": "10Gi"},
                    "limits": {"cpu": None, "memory": "10Gi"},
                },
                "rbac": {"roles": []},
                "file_index": {"crb": [], "rb": [], "limits": [], "requestsquotas": [], "egress": [], "role": []},
            },
        },
    },
    "prd": {
        "app1": {
            "app1-ns1": {
                "name": "app1-ns1",
                "description": "",
                "clusters": ["01", "04", "07"],
                "egress_nameid": None,
                "enable_pod_based_egress_ip": False,
                "allow_all_egress": True,
                "need_argo": False,
                "generate_argo_app": False,
                "status": "Argo not used",
                "resources": {
                    "requests": {"cpu": "80", "memory": "400Gi"},
                    "limits": {"cpu": None, "memory": "400Gi"},
                },
                "rbac": {"roles": []},
                "file_index": {
                    "crb": [],
                    "rb": [],
                    "limits": ["ocp-prov-requests/c01/app-ns/app1/app1-ns1/limitrange.yaml"],
                    "requestsquotas": ["ocp-prov-requests/c01/app-ns/app1/app1-ns1/resourcequota.yaml"],
                    "egress": ["ocp-prov-requests/c01/app-ns/app1/app1-ns1/egressfirewall.yaml"],
                    "role": [],
                },
            },
            "app1-ns2": {
                "name": "app1-ns2",
                "description": "",
                "clusters": ["12", "11", "06"],
                "egress_nameid": None,
                "enable_pod_based_egress_ip": False,
                "allow_all_egress": True,
                "need_argo": False,
                "generate_argo_app": False,
                "status": "Argo not used",
                "resources": {
                    "requests": {"cpu": "80", "memory": "400Gi"},
                    "limits": {"cpu": None, "memory": "400Gi"},
                },
                "rbac": {"roles": []},
                "file_index": {
                    "crb": [],
                    "rb": [],
                    "limits": ["ocp-prov-requests/c12/app-ns/app1/app1-ns2/limitrange.yaml"],
                    "requestsquotas": ["ocp-prov-requests/c12/app-ns/app1/app1-ns2/resourcequota.yaml"],
                    "egress": ["ocp-prov-requests/c12/app-ns/app1/app1-ns2/egressfirewall.yaml"],
                    "role": [],
                },
            },
        }
    }
}


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
    apps = APPS_BY_ENV.get(env, {})
    namespaces_by_app = NAMESPACES_BY_ENV_AND_APP.get(env, {})

    enriched: Dict[str, Dict[str, Any]] = {}
    for appname, app in apps.items():
        ns_obj = namespaces_by_app.get(appname, {})
        clusters: List[str] = []
        seen: set = set()
        for ns in ns_obj.values():
            for c in (ns.get("clusters") or []):
                cs = str(c)
                if cs not in seen:
                    seen.add(cs)
                    clusters.append(cs)

        enriched[appname] = {**app, "clusters": clusters}

    return enriched


@router.get("/apps/{appname}/namespaces")
def get_namespaces(appname: str, env: Optional[str] = None):
    env = _require_env(env)
    return NAMESPACES_BY_ENV_AND_APP.get(env, {}).get(appname, {})


@router.delete("/apps/{appname}/namespaces")
def delete_namespaces(appname: str, env: Optional[str] = None, namespaces: Optional[str] = None):
    """Delete specific namespaces from an application

    Args:
        appname: The application name
        env: The environment (dev/qa/prd)
        namespaces: Comma-separated list of namespace names to delete
    """
    env = _require_env(env)

    if not namespaces:
        raise HTTPException(status_code=400, detail="namespaces parameter is required (comma-separated list)")

    namespace_list = [ns.strip() for ns in namespaces.split(",") if ns.strip()]

    if not namespace_list:
        raise HTTPException(status_code=400, detail="No valid namespaces provided")

    deleted_data = {
        "appname": appname,
        "env": env,
        "requested_deletions": namespace_list,
        "deleted_namespaces": [],
        "not_found": []
    }

    # Check if app exists in this environment
    if env not in NAMESPACES_BY_ENV_AND_APP or appname not in NAMESPACES_BY_ENV_AND_APP[env]:
        deleted_data["not_found"] = namespace_list
        return deleted_data

    app_namespaces = NAMESPACES_BY_ENV_AND_APP[env][appname]

    # Delete each namespace
    for ns_name in namespace_list:
        if ns_name in app_namespaces:
            del app_namespaces[ns_name]
            deleted_data["deleted_namespaces"].append(ns_name)
        else:
            deleted_data["not_found"].append(ns_name)

    # If all namespaces are deleted, remove the app entry
    if len(app_namespaces) == 0:
        del NAMESPACES_BY_ENV_AND_APP[env][appname]
        deleted_data["app_entry_removed"] = True

    # Update totalns count in APPS_BY_ENV
    if env in APPS_BY_ENV and appname in APPS_BY_ENV[env]:
        APPS_BY_ENV[env][appname]["totalns"] = len(app_namespaces)

    return deleted_data


@router.get("/apps/{appname}/l4_ingress")
def get_l4_ingress(appname: str, env: Optional[str] = None):
    env = _require_env(env)
    return L4_INGRESS_BY_ENV_AND_APP.get(env, {}).get(appname, [])


@router.get("/apps/{appname}/pull_requests")
def get_pull_requests(appname: str, env: Optional[str] = None):
    env = _require_env(env)
    return PULL_REQUESTS_BY_ENV_AND_APP.get(env, {}).get(appname, [])


@router.delete("/apps/{appname}")
def delete_app(appname: str, env: Optional[str] = None):
    """Delete an application and all its associated data (namespaces, L4 ingress, pull requests)"""
    env = _require_env(env)

    deleted_data = {
        "appname": appname,
        "env": env,
        "deleted": False,
        "removed": {}
    }

    # Delete from APPS_BY_ENV
    if env in APPS_BY_ENV and appname in APPS_BY_ENV[env]:
        del APPS_BY_ENV[env][appname]
        deleted_data["removed"]["app"] = True

    # Delete from NAMESPACES_BY_ENV_AND_APP
    if env in NAMESPACES_BY_ENV_AND_APP and appname in NAMESPACES_BY_ENV_AND_APP[env]:
        namespaces = list(NAMESPACES_BY_ENV_AND_APP[env][appname].keys())
        del NAMESPACES_BY_ENV_AND_APP[env][appname]
        deleted_data["removed"]["namespaces"] = namespaces

    # Delete from L4_INGRESS_BY_ENV_AND_APP
    if env in L4_INGRESS_BY_ENV_AND_APP and appname in L4_INGRESS_BY_ENV_AND_APP[env]:
        del L4_INGRESS_BY_ENV_AND_APP[env][appname]
        deleted_data["removed"]["l4_ingress"] = True

    # Delete from PULL_REQUESTS_BY_ENV_AND_APP
    if env in PULL_REQUESTS_BY_ENV_AND_APP and appname in PULL_REQUESTS_BY_ENV_AND_APP[env]:
        del PULL_REQUESTS_BY_ENV_AND_APP[env][appname]
        deleted_data["removed"]["pull_requests"] = True

    deleted_data["deleted"] = True
    return deleted_data

@router.get("/apps/{appname}/egress_ips")
def get_egress_ips(appname: str, env: Optional[str] = None):
    env = _require_env(env)
    return EGRESS_IPS_BY_ENV_AND_APP.get(env, {}).get(appname, [])
