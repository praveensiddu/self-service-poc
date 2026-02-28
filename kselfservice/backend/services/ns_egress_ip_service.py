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
        *, workspace_path: Path, env: str, clustername: str
    ) -> Path:
        return (
            workspace_path
            / "kselfserv"
            / "cloned-repositories"
            / f"rendered_{str(env or '').strip().lower()}"
            / "ip_provisioning"
            / str(clustername).strip()
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

        for clustername in clusters_list:
            allocated_path = self._egress_allocated_file_for_cluster(
                workspace_path=workspace_path,
                env=env,
                clustername=clustername,
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

            ranges = self.cluster_service.get_cluster_egress_ranges(env, clustername)
            if not ranges:
                raise ValueError(
                    f"No egress_ip_ranges configured for cluster {clustername}"
                )

            allocated_all = self._collect_allocated_ips(allocated_yaml)
            new_ip = self._allocate_first_free_ip(ranges=ranges, allocated=allocated_all)
            if not new_ip:
                raise ValueError(f"No free egress IPs remaining for cluster {clustername}")

            allocated_yaml[alloc_key] = [new_ip]
            allocated_path.parent.mkdir(parents=True, exist_ok=True)
            allocated_path.write_text(yaml.safe_dump(allocated_yaml, sort_keys=False))

    def validate_egress_ip_allocations(
        self,
        *,
        env: str,
        appname: str,
        egress_nameid: str,
        clusters_list: List[str],
    ) -> None:
        """Validate that the specified clusters either already have an allocation for this
        app+egress_nameid, or have at least one free IP available in the cluster ranges.

        Does not persist any changes.
        """

        workspace_path = get_workspace_path()
        alloc_key = f"{str(appname or '').strip()}_{str(egress_nameid or '').strip()}"

        clusters_list = [
            str(c).strip() for c in clusters_list if c is not None and str(c).strip()
        ]

        for clustername in clusters_list:
            allocated_path = self._egress_allocated_file_for_cluster(
                workspace_path=workspace_path,
                env=env,
                clustername=clustername,
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

            ranges = self.cluster_service.get_cluster_egress_ranges(env, clustername)
            if not ranges:
                raise ValueError(
                    f"No egress_ip_ranges configured for cluster {clustername}"
                )

            allocated_all = self._collect_allocated_ips(allocated_yaml)
            new_ip = self._allocate_first_free_ip(ranges=ranges, allocated=allocated_all)
            if not new_ip:
                raise ValueError(f"No free egress IPs remaining for cluster {clustername}")


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
        for clustername in clusters_list:
            allocated_path = self._egress_allocated_file_for_cluster(
                workspace_path=workspace_path,
                env=env,
                clustername=clustername,
            )
            allocated_yaml = read_yaml_dict(allocated_path)
            existing = allocated_yaml.get(alloc_key)
            existing_list = (
                [str(x).strip() for x in existing] if isinstance(existing, list) else []
            )
            existing_list = [x for x in existing_list if x]
            ip = existing_list[0] if existing_list else ""
            allocated_egress_ips.append({str(clustername).strip(): str(ip).strip()})

        return allocated_egress_ips
