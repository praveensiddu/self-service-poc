from fastapi import APIRouter, HTTPException, Response
from typing import Any, Dict, List, Optional

from pathlib import Path
import yaml
from pydantic import BaseModel

from backend.routers.apps import _require_env, _require_initialized_workspace
from backend.routers.general import load_enforcement_settings

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


def _egress_entry_to_rule(entry: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Convert an OVN EgressFirewall spec.egress entry to UI rule shape."""
    if not isinstance(entry, dict):
        return None

    entry_type = str(entry.get("type", "") or "").strip()
    if entry_type != "Allow":
        return None

    to = entry.get("to")
    if not isinstance(to, dict):
        return None

    if "dnsName" in to:
        egress_type = "dnsName"
        egress_value = str(to.get("dnsName", "") or "").strip()
    elif "cidrSelector" in to:
        egress_type = "cidrSelector"
        egress_value = str(to.get("cidrSelector", "") or "").strip()
    else:
        return None

    if not egress_value:
        return None

    out: Dict[str, Any] = {"egressType": egress_type, "egressValue": egress_value}

    ports = entry.get("ports")
    if egress_type == "cidrSelector" and isinstance(ports, list):
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


def _rule_to_egress_entry(rule: Dict[str, Any]) -> Dict[str, Any]:
    """Convert UI rule shape to an OVN EgressFirewall spec.egress entry."""
    egress_type = str(rule.get("egressType", "") or "").strip()
    egress_value = str(rule.get("egressValue", "") or "").strip()

    entry: Dict[str, Any] = {"type": "Allow", "to": {}}
    if egress_type == "dnsName":
        entry["to"]["dnsName"] = egress_value
    elif egress_type == "cidrSelector":
        entry["to"]["cidrSelector"] = egress_value

        ports = rule.get("ports")
        if isinstance(ports, list) and ports:
            ports_out: List[Dict[str, Any]] = []
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
                    ports_out.append({"protocol": protocol, "port": port_int})
            if ports_out:
                entry["ports"] = ports_out

    return entry


def _extract_egress_entries_from_template(path: Path) -> List[Dict[str, Any]]:
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
def get_egressfirewall(appname: str, namespace: str, env: Optional[str] = None):
    env = _require_env(env)

    enforcement = load_enforcement_settings()
    egress_firewall_enforced = str(enforcement.enforce_egress_firewall or "yes").strip().lower() != "no"
    if not egress_firewall_enforced:
        return {"exists": False, "rules": []}

    requests_root = _require_initialized_workspace()

    ns_dir = requests_root / env / appname / namespace
    if not ns_dir.exists() or not ns_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Namespace folder not found: {ns_dir}")

    path = _egress_firewall_path(ns_dir)
    rules = _read_yaml_list(path)

    normalized: List[Dict[str, Any]] = []
    for r in rules:
        if not isinstance(r, dict):
            continue

        # Backward-compat: older stored format was UI rules.
        if "egressType" in r or "egressValue" in r:
            normalized.append(_normalize_rule(r))
            continue

        # New stored format: OVN spec.egress entries.
        converted = _egress_entry_to_rule(r)
        if converted is not None:
            normalized.append(converted)

    return {"exists": path.exists() and path.is_file(), "rules": normalized}


@router.put("/apps/{appname}/namespaces/{namespace}/egressfirewall")
def put_egressfirewall(appname: str, namespace: str, payload: EgressFirewallUpdate, env: Optional[str] = None):
    env = _require_env(env)

    enforcement = load_enforcement_settings()
    egress_firewall_enforced = str(enforcement.enforce_egress_firewall or "yes").strip().lower() != "no"
    if not egress_firewall_enforced:
        raise HTTPException(status_code=400, detail="Egress firewall enforcement is disabled")

    requests_root = _require_initialized_workspace()

    ns_dir = requests_root / env / appname / namespace
    if not ns_dir.exists() or not ns_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Namespace folder not found: {ns_dir}")

    rules_in = payload.rules or []
    out_rules: List[Dict[str, Any]] = []
    out_egress_entries: List[Dict[str, Any]] = []

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
        out_egress_entries.append(_rule_to_egress_entry(rule_out))

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
        path.write_text(yaml.safe_dump(out_egress_entries, sort_keys=False, default_flow_style=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write egress_firewall_requests.yaml: {e}")

    return {"rules": out_rules}


@router.delete("/apps/{appname}/namespaces/{namespace}/egressfirewall")
def delete_egressfirewall(appname: str, namespace: str, env: Optional[str] = None):
    env = _require_env(env)

    enforcement = load_enforcement_settings()
    egress_firewall_enforced = str(enforcement.enforce_egress_firewall or "yes").strip().lower() != "no"
    if not egress_firewall_enforced:
        raise HTTPException(status_code=400, detail="Egress firewall enforcement is disabled")

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
        requests_root = _require_initialized_workspace()
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

