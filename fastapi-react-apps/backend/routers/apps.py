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
                "allocated_ips": ["10.10.10.10", "10.10.10.11"],
                "allocations": [
                    {
                        "name": "l4ingress_app1_dev",
                        "purpose": "app1",
                        "app": "app1",
                        "ips": ["10.10.10.10", "10.10.10.11"],
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
                "allocated_ips": ["10.10.20.10"],
                "allocations": [
                    {
                        "name": "l4ingress_app2_dev",
                        "purpose": "app2",
                        "app": "app2",
                        "ips": ["10.10.20.10"],
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
                "allocated_ips": ["10.20.10.10", "10.20.10.11"],
                "allocations": [
                    {
                        "name": "l4ingress_app1_qa",
                        "purpose": "app1",
                        "app": "app1",
                        "ips": ["10.20.10.10", "10.20.10.11"],
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
                "allocated_ips": ["10.20.20.10", "10.20.20.11"],
                "allocations": [
                    {
                        "name": "l4ingress_app2_qa",
                        "purpose": "app2",
                        "app": "app2",
                        "ips": ["10.20.20.10", "10.20.20.11"],
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
                "allocated_ips": ["1.1.210.150", "1.1.210.151"],
                "allocations": [
                    {
                        "name": "l4ingress_app1_app1",
                        "purpose": "app1",
                        "app": "app1",
                        "ips": ["1.1.210.150", "1.1.210.151"],
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


def _require_env(env: Optional[str]) -> str:
    if not env:
        raise HTTPException(status_code=400, detail="Missing required query parameter: env")
    return env.strip().lower()


@router.get("/apps")
def list_apps(env: Optional[str] = None):
    env = _require_env(env)
    return APPS_BY_ENV.get(env, {})


@router.get("/apps/{appname}/namespaces")
def get_namespaces(appname: str, env: Optional[str] = None):
    env = _require_env(env)
    return NAMESPACES_BY_ENV_AND_APP.get(env, {}).get(appname, {})


@router.get("/apps/{appname}/l4_ingress")
def get_l4_ingress(appname: str, env: Optional[str] = None):
    env = _require_env(env)
    return L4_INGRESS_BY_ENV_AND_APP.get(env, {}).get(appname, [])


@router.get("/apps/{appname}/pull_requests")
def get_pull_requests(appname: str, env: Optional[str] = None):
    env = _require_env(env)
    return PULL_REQUESTS_BY_ENV_AND_APP.get(env, {}).get(appname, [])
