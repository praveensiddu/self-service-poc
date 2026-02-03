from fastapi import APIRouter, HTTPException, Response
from typing import Any, Dict, List, Optional

import yaml
from pydantic import BaseModel

from backend.routers.apps import _require_env, _require_initialized_workspace

router = APIRouter(tags=["egressfirewall"])


class EgressPort(BaseModel):
    protocol: Optional[str] = None
    port: Optional[int] = None


class EgressFirewallRule(BaseModel):
    egressType: Optional[str] = None
    egressValue: Optional[str] = None
    ports: Optional[List[EgressPort]] = None


class EgressFirewallUpdate(BaseModel):
    rules: Optional[List[EgressFirewallRule]] = None


def _egress_firewall_path(ns_dir) -> Any:
    return ns_dir / "egress_firewall_requests.yaml"


def _read_yaml_list(path) -> List[Dict[str, Any]]:
    if not path.exists() or not path.is_file():
        return []
    try:
        raw = yaml.safe_load(path.read_text())
        return raw if isinstance(raw, list) else []
    except Exception:
        return []


def _normalize_rule(rule: Dict[str, Any]) -> Dict[str, Any]:
    egress_type = str(rule.get("egressType", "") or "").strip()
    egress_value = str(rule.get("egressValue", "") or "").strip()

    out: Dict[str, Any] = {
        "egressType": egress_type,
        "egressValue": egress_value,
    }

    ports = rule.get("ports")
    if isinstance(ports, list) and egress_type == "cidrSelector":
        normalized_ports: List[Dict[str, Any]] = []
        for p in ports:
            if not isinstance(p, dict):
                continue
            protocol = str(p.get("protocol", "") or "").strip()
            port = p.get("port")
            try:
                port_int = int(port) if port not in (None, "") else None
            except Exception:
                port_int = None

            if protocol and port_int is not None:
                normalized_ports.append({"protocol": protocol, "port": port_int})

        if normalized_ports:
            out["ports"] = normalized_ports

    return out


@router.get("/apps/{appname}/namespaces/{namespace}/egressfirewall")
def get_egressfirewall(appname: str, namespace: str, env: Optional[str] = None):
    env = _require_env(env)
    requests_root = _require_initialized_workspace()

    ns_dir = requests_root / env / appname / namespace
    if not ns_dir.exists() or not ns_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Namespace folder not found: {ns_dir}")

    path = _egress_firewall_path(ns_dir)
    rules = _read_yaml_list(path)
    normalized = [_normalize_rule(r) for r in rules if isinstance(r, dict)]
    return {"exists": path.exists() and path.is_file(), "rules": normalized}


@router.put("/apps/{appname}/namespaces/{namespace}/egressfirewall")
def put_egressfirewall(appname: str, namespace: str, payload: EgressFirewallUpdate, env: Optional[str] = None):
    env = _require_env(env)
    requests_root = _require_initialized_workspace()

    ns_dir = requests_root / env / appname / namespace
    if not ns_dir.exists() or not ns_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Namespace folder not found: {ns_dir}")

    rules_in = payload.rules or []
    out_rules: List[Dict[str, Any]] = []

    for idx, r in enumerate(rules_in):
        egress_type = str(r.egressType or "").strip()
        egress_value = str(r.egressValue or "").strip()

        if egress_type not in {"dnsName", "cidrSelector"}:
            raise HTTPException(status_code=400, detail=f"Egress rule #{idx + 1}: egressType must be dnsName or cidrSelector")
        if not egress_value:
            raise HTTPException(status_code=400, detail=f"Egress rule #{idx + 1}: egressValue is required")

        rule_out: Dict[str, Any] = {"egressType": egress_type, "egressValue": egress_value}

        if egress_type == "cidrSelector" and r.ports is not None:
            ports_out: List[Dict[str, Any]] = []
            for pidx, p in enumerate(r.ports or []):
                protocol = str(p.protocol or "").strip()
                if not protocol:
                    raise HTTPException(status_code=400, detail=f"Egress rule #{idx + 1} port #{pidx + 1}: protocol is required")
                if p.port is None:
                    raise HTTPException(status_code=400, detail=f"Egress rule #{idx + 1} port #{pidx + 1}: port is required")
                try:
                    port_int = int(p.port)
                except Exception:
                    raise HTTPException(status_code=400, detail=f"Egress rule #{idx + 1} port #{pidx + 1}: port must be an integer")
                ports_out.append({"protocol": protocol, "port": port_int})

            if ports_out:
                rule_out["ports"] = ports_out

        out_rules.append(rule_out)

    path = _egress_firewall_path(ns_dir)
    if len(out_rules) == 0:
        existed = False
        try:
            existed = path.exists() and path.is_file()
        except Exception:
            existed = False
        if existed:
            try:
                path.unlink()
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to delete egress_firewall_requests.yaml: {e}")
        return {"rules": []}

    try:
        path.write_text(yaml.safe_dump(out_rules, sort_keys=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write egress_firewall_requests.yaml: {e}")

    return {"rules": out_rules}


@router.delete("/apps/{appname}/namespaces/{namespace}/egressfirewall")
def delete_egressfirewall(appname: str, namespace: str, env: Optional[str] = None):
    env = _require_env(env)
    requests_root = _require_initialized_workspace()

    ns_dir = requests_root / env / appname / namespace
    if not ns_dir.exists() or not ns_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Namespace folder not found: {ns_dir}")

    path = _egress_firewall_path(ns_dir)
    existed = False
    try:
        existed = path.exists() and path.is_file()
    except Exception:
        existed = False

    if existed:
        try:
            path.unlink()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete egress_firewall_requests.yaml: {e}")

    return {"deleted": existed}


@router.post("/apps/{appname}/namespaces/{namespace}/egressfirewall/egressfirewall_yaml")
def get_egressfirewall_yaml(appname: str, namespace: str, payload: EgressFirewallUpdate, env: Optional[str] = None):
    """
    Generate an EgressFirewall YAML definition from the provided egress firewall rules.
    This endpoint creates a Kubernetes EgressFirewall resource in the k8s.ovn.org/v1 format.
    """
    env = _require_env(env)

    rules_in = payload.rules or []
    if not rules_in:
        raise HTTPException(status_code=400, detail="No egress firewall rules provided")

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

