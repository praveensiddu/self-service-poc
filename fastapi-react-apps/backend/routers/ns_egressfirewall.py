from fastapi import APIRouter, Depends, HTTPException, Response
from typing import Any, Dict, List, Optional

import yaml

from backend.dependencies import require_env, require_initialized_workspace
from backend.routers import pull_requests
from backend.models import EgressPort, EgressFirewallRule, EgressFirewallUpdate
from backend.services.namespace_details_service import NamespaceDetailsService
from backend.utils.enforcement import load_enforcement_settings

router = APIRouter(tags=["egressfirewall"])


def get_namespace_details_service() -> NamespaceDetailsService:
    """Dependency injection for NamespaceDetailsService."""
    return NamespaceDetailsService()


def _extract_egress_entries_from_template(path) -> List[Dict[str, Any]]:
    """Extract egress entries from a template file."""
    import yaml
    from pathlib import Path

    if not isinstance(path, Path):
        path = Path(path)

    if not path.exists() or not path.is_file():
        return []

    try:
        raw = yaml.safe_load(path.read_text())
    except Exception:
        return []

    if isinstance(raw, list):
        return [x for x in raw if isinstance(x, dict)]

    if isinstance(raw, dict):
        # Allow either a full EgressFirewall object or a shorthand object
        spec = raw.get("spec") if isinstance(raw.get("spec"), dict) else None
        if isinstance(spec, dict) and isinstance(spec.get("egress"), list):
            return [x for x in spec.get("egress") if isinstance(x, dict)]
        if isinstance(raw.get("egress"), list):
            return [x for x in raw.get("egress") if isinstance(x, dict)]

    return []


@router.get("/apps/{appname}/namespaces/{namespace}/egressfirewall")
def get_egressfirewall(
    appname: str,
    namespace: str,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service)
):
    """Get egress firewall rules for a namespace."""
    env = require_env(env)
    return service.get_egressfirewall(env, appname, namespace)


@router.put("/apps/{appname}/namespaces/{namespace}/egressfirewall")
def put_egressfirewall(
    appname: str,
    namespace: str,
    payload: EgressFirewallUpdate,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service)
):
    """Update egress firewall rules for a namespace."""
    env = require_env(env)

    rules_in = payload.rules or []
    rules_data = []

    for r in rules_in:
        rule_dict = {
            "egressType": r.egressType,
            "egressValue": r.egressValue,
        }
        if r.ports:
            rule_dict["ports"] = [{"protocol": p.protocol, "port": p.port} for p in r.ports]
        rules_data.append(rule_dict)

    return service.update_egressfirewall(env, appname, namespace, rules_data)


@router.delete("/apps/{appname}/namespaces/{namespace}/egressfirewall")
def delete_egressfirewall(
    appname: str,
    namespace: str,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service)
):
    """Delete egress firewall rules for a namespace."""
    env = require_env(env)
    return service.delete_egressfirewall(env, appname, namespace)


@router.post("/apps/{appname}/namespaces/{namespace}/egressfirewall/egressfirewall_yaml")
def get_egressfirewall_yaml(appname: str, namespace: str, payload: EgressFirewallUpdate, env: Optional[str] = None):
    """
    Generate an EgressFirewall YAML definition from the provided egress firewall rules.
    This endpoint creates a Kubernetes EgressFirewall resource in the k8s.ovn.org/v1 format.
    """
    env = require_env(env)

    enforcement = load_enforcement_settings()
    egress_firewall_enforced = str(enforcement.enforce_egress_firewall or "yes").strip().lower() != "no"
    if not egress_firewall_enforced:
        return Response(content="", media_type="text/yaml")

    rules_in = payload.rules or []
    egress_entries = []

    for idx, r in enumerate(rules_in):
        egress_type = str(r.egressType or "").strip()
        egress_value = str(r.egressValue or "").strip()

        if egress_type not in {"dnsName", "cidrSelector"}:
            raise HTTPException(status_code=400, detail=f"Egress rule #{idx + 1}: egressType must be dnsName or cidrSelector")
        if not egress_value:
            raise HTTPException(status_code=400, detail=f"Egress rule #{idx + 1}: egressValue is required")

        # Build egress entry
        egress_entry: Dict[str, Any] = {
            "type": "Allow",
            "to": {}
        }

        if egress_type == "dnsName":
            egress_entry["to"]["dnsName"] = egress_value
        elif egress_type == "cidrSelector":
            egress_entry["to"]["cidrSelector"] = egress_value

            # Add ports if specified for cidrSelector
            if r.ports is not None and len(r.ports) > 0:
                ports_list = []
                for pidx, p in enumerate(r.ports):
                    protocol = str(p.protocol or "").strip()
                    if not protocol:
                        raise HTTPException(status_code=400, detail=f"Egress rule #{idx + 1} port #{pidx + 1}: protocol is required")
                    if p.port is None:
                        raise HTTPException(status_code=400, detail=f"Egress rule #{idx + 1} port #{pidx + 1}: port is required")
                    try:
                        port_int = int(p.port)
                    except Exception:
                        raise HTTPException(status_code=400, detail=f"Egress rule #{idx + 1} port #{pidx + 1}: port must be an integer")

                    ports_list.append({
                        "protocol": protocol,
                        "port": port_int
                    })

                if ports_list:
                    egress_entry["ports"] = ports_list

        egress_entries.append(egress_entry)

    # Append allowlist/common template rules if present (before deny-all)
    try:
        requests_root = require_initialized_workspace()
        cloned_repos_root = requests_root.parents[1]
        templates_root = cloned_repos_root / "templates"
        env_key = str(env or "").strip()

        ns_allowlist_path = templates_root / "egress_firewall" / env_key / "namespace_allowlist" / f"{namespace}.yaml"
        common_path = templates_root / "egress_firewall" / env_key / "egress_firewall_common.yaml"

        egress_entries.extend(_extract_egress_entries_from_template(ns_allowlist_path))
        egress_entries.extend(_extract_egress_entries_from_template(common_path))
    except Exception:
        # Best-effort only; ignore template loading errors
        pass

    # Add a Deny All rule at the end to explicitly deny all other traffic
    egress_entries.append({
        "type": "Deny",
        "to": {
            "cidrSelector": "0.0.0.0/0"
        }
    })

    # Build the EgressFirewall resource
    egressfirewall_obj = {
        "kind": "EgressFirewall",
        "apiVersion": "k8s.ovn.org/v1",
        "metadata": {
            "name": "default",
            "namespace": namespace,
        },
        "spec": {
            "egress": egress_entries
        }
    }

    yaml_text = yaml.safe_dump(egressfirewall_obj, sort_keys=False, default_flow_style=False)
    return Response(content=yaml_text, media_type="text/yaml")

