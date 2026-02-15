from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Set

import ipaddress
import yaml

from backend.dependencies import get_workspace_path
from backend.dependencies import get_requests_root
from backend.services.cluster_service import ClusterService
from backend.services.namespace_details_service import NamespaceDetailsService
from backend.utils.yaml_utils import read_yaml_dict


class NsEgressIpService:
    def __init__(self):
        self.cluster_service = ClusterService()

    @staticmethod
    def _egress_allocated_file_for_cluster(
        *, workspace_path: Path, env: str, cluster_no: str
    ) -> Path:
        return (
            workspace_path
            / "kselfserv"
            / "cloned-repositories"
            / f"rendered_{str(env or '').strip().lower()}"
            / "ip_provisioning"
            / str(cluster_no).strip()
            / "egressip-allocated.yaml"
        )

    @staticmethod
    def _collect_allocated_ips(allocated_yaml: Dict[str, Any]) -> Set[int]:
        out: Set[int] = set()
        if not isinstance(allocated_yaml, dict):
            return out
        for v in allocated_yaml.values():
            if not isinstance(v, list):
                continue
            for ip_s in v:
                try:
                    out.add(int(ipaddress.ip_address(str(ip_s).strip())))
                except Exception:
                    continue
        return out

    @staticmethod
    def _allocate_first_free_ip(*, ranges: List[Dict[str, str]], allocated: Set[int]) -> str:
        for r in ranges:
            try:
                lo = int(ipaddress.ip_address(str(r.get("start_ip") or "").strip()))
                hi = int(ipaddress.ip_address(str(r.get("end_ip") or "").strip()))
            except Exception:
                continue
            if hi < lo:
                lo, hi = hi, lo

            for ip_i in range(lo, hi + 1):
                if ip_i in allocated:
                    continue
                try:
                    return str(ipaddress.ip_address(ip_i))
                except Exception:
                    continue
        return ""

    def ensure_egress_ip_allocations(
        self,
        *,
        env: str,
        appname: str,
        egress_nameid: str,
        clusters_list: List[str],
    ) -> None:
        workspace_path = get_workspace_path()
        alloc_key = f"{str(appname or '').strip()}_{str(egress_nameid or '').strip()}"

        clusters_list = [
            str(c).strip() for c in clusters_list if c is not None and str(c).strip()
        ]

        for cluster_no in clusters_list:
            allocated_path = self._egress_allocated_file_for_cluster(
                workspace_path=workspace_path,
                env=env,
                cluster_no=cluster_no,
            )
            allocated_yaml = read_yaml_dict(allocated_path)

            existing_ips_for_key = allocated_yaml.get(alloc_key)
            existing_ip_list = (
                [str(x).strip() for x in existing_ips_for_key]
                if isinstance(existing_ips_for_key, list)
                else []
            )
            existing_ip_list = [x for x in existing_ip_list if x]
            if existing_ip_list:
                continue

            ranges = self.cluster_service.get_cluster_egress_ranges(env, cluster_no)
            if not ranges:
                raise ValueError(
                    f"No egress_ip_ranges configured for cluster {cluster_no}"
                )

            allocated_all = self._collect_allocated_ips(allocated_yaml)
            new_ip = self._allocate_first_free_ip(ranges=ranges, allocated=allocated_all)
            if not new_ip:
                raise ValueError(f"No free egress IPs remaining for cluster {cluster_no}")

            allocated_yaml[alloc_key] = [new_ip]
            allocated_path.parent.mkdir(parents=True, exist_ok=True)
            allocated_path.write_text(yaml.safe_dump(allocated_yaml, sort_keys=False))

    def reconcile_app_egress_ip_allocations(self, *, env: str, appname: str) -> None:
        env_key = str(env or "").strip().lower()
        app_key = str(appname or "").strip()
        if not env_key:
            raise ValueError("env is required")
        if not app_key:
            raise ValueError("appname is required")

        requests_root = get_requests_root()
        app_dir = requests_root / env_key / app_key
        if not app_dir.exists() or not app_dir.is_dir():
            return

        required_keys_by_cluster: Dict[str, Set[str]] = {}
        cluster_union: Set[str] = set()

        for ns_dir in app_dir.iterdir():
            if not ns_dir.is_dir():
                continue
            ns_info_path = ns_dir / "namespace_info.yaml"
            if not ns_info_path.exists() or not ns_info_path.is_file():
                continue

            parsed = read_yaml_dict(ns_info_path)
            if not isinstance(parsed, dict):
                continue

            egress_nameid = str(parsed.get("egress_nameid") or "").strip()
            if not egress_nameid:
                continue

            alloc_key = f"{app_key}_{egress_nameid}"

            clusters_list = parsed.get("clusters")
            if not isinstance(clusters_list, list):
                clusters_list = []
            clusters = [str(c).strip() for c in clusters_list if c is not None and str(c).strip()]

            for cluster_no in clusters:
                cluster_union.add(cluster_no)
                required_keys_by_cluster.setdefault(cluster_no, set()).add(alloc_key)

        workspace_path = get_workspace_path()
        rendered_ip_prov_root = (
            workspace_path
            / "kselfserv"
            / "cloned-repositories"
            / f"rendered_{env_key}"
            / "ip_provisioning"
        )

        if rendered_ip_prov_root.exists() and rendered_ip_prov_root.is_dir():
            for cluster_dir in rendered_ip_prov_root.iterdir():
                if not cluster_dir.is_dir():
                    continue
                cluster_union.add(cluster_dir.name)

        app_prefix = f"{app_key}_"

        for cluster_no in sorted(cluster_union, key=lambda s: str(s).lower()):
            required_keys = required_keys_by_cluster.get(cluster_no, set())

            allocated_path = self._egress_allocated_file_for_cluster(
                workspace_path=workspace_path,
                env=env_key,
                cluster_no=cluster_no,
            )

            allocated_yaml = read_yaml_dict(allocated_path)
            if not isinstance(allocated_yaml, dict):
                allocated_yaml = {}

            changed = False

            # Remove unused allocation keys for this app in this cluster.
            for k in list(allocated_yaml.keys()):
                if not isinstance(k, str):
                    continue
                if not k.startswith(app_prefix):
                    continue
                if k not in required_keys:
                    allocated_yaml.pop(k, None)
                    changed = True

            # Ensure required keys exist.
            allocated_all = self._collect_allocated_ips(allocated_yaml)
            for alloc_key in sorted(required_keys, key=lambda s: str(s).lower()):
                existing = allocated_yaml.get(alloc_key)
                existing_list = [str(x).strip() for x in existing] if isinstance(existing, list) else []
                existing_list = [x for x in existing_list if x]
                if existing_list:
                    continue

                ranges = self.cluster_service.get_cluster_egress_ranges(env_key, cluster_no)
                if not ranges:
                    raise ValueError(
                        f"No egress_ip_ranges configured for cluster {cluster_no}"
                    )

                new_ip = self._allocate_first_free_ip(ranges=ranges, allocated=allocated_all)
                if not new_ip:
                    raise ValueError(
                        f"No free egress IPs remaining for cluster {cluster_no}"
                    )

                allocated_yaml[alloc_key] = [new_ip]
                try:
                    allocated_all.add(int(ipaddress.ip_address(new_ip)))
                except Exception:
                    pass
                changed = True

            if not changed:
                continue

            allocated_path.parent.mkdir(parents=True, exist_ok=True)
            allocated_path.write_text(yaml.safe_dump(allocated_yaml, sort_keys=False))

    def get_allocated_egress_ips_for_namespace(
        self,
        *,
        env: str,
        appname: str,
        namespace: str,
        egress_nameid: str,
        namespace_details_service: NamespaceDetailsService,
    ) -> List[Dict[str, str]]:
        clusters_list: List[str] = []
        try:
            ns_dir = namespace_details_service.repo.get_namespace_dir(env, appname, namespace)
            ns_info_path = ns_dir / "namespace_info.yaml"
            if ns_info_path.exists() and ns_info_path.is_file():
                parsed = yaml.safe_load(ns_info_path.read_text()) or {}
                if isinstance(parsed, dict):
                    raw_clusters = parsed.get("clusters")
                    if isinstance(raw_clusters, list):
                        clusters_list = [
                            str(c).strip()
                            for c in raw_clusters
                            if c is not None and str(c).strip()
                        ]
        except Exception:
            clusters_list = []

        workspace_path = get_workspace_path()
        alloc_key = f"{str(appname or '').strip()}_{str(egress_nameid or '').strip()}"

        allocated_egress_ips: List[Dict[str, str]] = []
        for cluster_no in clusters_list:
            allocated_path = self._egress_allocated_file_for_cluster(
                workspace_path=workspace_path,
                env=env,
                cluster_no=cluster_no,
            )
            allocated_yaml = read_yaml_dict(allocated_path)
            existing = allocated_yaml.get(alloc_key)
            existing_list = (
                [str(x).strip() for x in existing] if isinstance(existing, list) else []
            )
            existing_list = [x for x in existing_list if x]
            ip = existing_list[0] if existing_list else ""
            allocated_egress_ips.append({str(cluster_no).strip(): str(ip).strip()})

        return allocated_egress_ips
