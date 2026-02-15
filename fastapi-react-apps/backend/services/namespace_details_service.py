"""Namespace details service for managing namespace-specific resources.

This service handles rolebindings, resourcequota, limitrange, and egress firewall
configurations for namespaces. It centralizes the business logic for namespace
detail page operations.
"""

from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import yaml

from backend.models import (
    NamespaceResourcesCpuMem,
    NamespaceResourcesQuotaLimits,
    NamespaceResourcesLimits,
    RBSubject,
    RBRoleRef,
)
from backend.repositories.namespace_repository import NamespaceRepository
from backend.utils.helpers import is_set, as_trimmed_str
from backend.utils.yaml_utils import read_yaml_dict, read_yaml_list
from backend.utils.enforcement import load_enforcement_settings
from backend.config.logging_config import get_logger
from backend.exceptions.custom import (
    ValidationError,
    NotFoundError,
    AppError,
)

logger = get_logger(__name__)


class NamespaceDetailsService:
    """Service for namespace details business logic."""

    def __init__(self):
        self.repo = NamespaceRepository()

    # ============================================
    # RoleBindings Operations
    # ============================================

    def get_rolebindings(self, env: str, appname: str, namespace: str) -> Dict[str, Any]:
        """Get role bindings for a namespace.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name

        Returns:
            Dictionary with bindings list
        """
        ns_dir = self.repo.get_namespace_dir(env, appname, namespace)
        rolebinding_path = ns_dir / "rolebinding_requests.yaml"

        if not rolebinding_path.exists() or not rolebinding_path.is_file():
            return {"bindings": []}

        try:
            parsed = yaml.safe_load(rolebinding_path.read_text())
        except Exception as e:
            logger.error("Failed to read RoleBinding: %s", e, exc_info=True)
            raise AppError(f"Failed to read RoleBinding: {e}")

        if parsed is None:
            return {"bindings": []}

        if isinstance(parsed, list):
            bindings = [b for b in parsed if isinstance(b, dict)]
            return {"bindings": bindings}

        if isinstance(parsed, dict) and parsed.get("subjects"):
            subjects = parsed.get("subjects", [])
            role_ref = parsed.get("roleRef", {})
            bindings = []
            if isinstance(subjects, list):
                bindings.append({
                    "subjects": [s for s in subjects if isinstance(s, dict)],
                    "roleRef": role_ref if isinstance(role_ref, dict) else {},
                })
            return {"bindings": bindings}

        return {"bindings": []}

    def update_rolebindings(
        self,
        env: str,
        appname: str,
        namespace: str,
        bindings: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Update role bindings for a namespace.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name
            bindings: List of role binding configurations

        Returns:
            Dictionary with updated bindings

        Raises:
            ValidationError: If validation fails
            AppError: If write fails
        """
        ns_dir = self.repo.get_namespace_dir(env, appname, namespace)
        rolebinding_path = ns_dir / "rolebinding_requests.yaml"

        logger.info(f"PUT rolebinding_requests for {env}/{appname}/{namespace}")
        logger.info(f"Processing {len(bindings)} role binding(s)")

        rolebindings_data = []
        for idx, binding in enumerate(bindings):
            validated_binding = self._validate_rolebinding(binding, idx)
            rolebindings_data.append(validated_binding)

        try:
            rolebinding_path.write_text(
                yaml.safe_dump(rolebindings_data, sort_keys=False)
            )
            logger.info(
                f"Successfully wrote {len(rolebindings_data)} role binding(s) to {rolebinding_path}"
            )
        except Exception as e:
            logger.error(f"Failed to write RoleBinding to {rolebinding_path}: {e}", exc_info=True)
            raise AppError(f"Failed to write RoleBinding: {e}")

        return {"bindings": rolebindings_data}

    def _validate_rolebinding(
        self,
        binding: Dict[str, Any],
        idx: int
    ) -> Dict[str, Any]:
        """Validate a single role binding.

        Args:
            binding: Role binding configuration
            idx: Index of the binding (for error messages)

        Returns:
            Validated binding dictionary

        Raises:
            ValidationError: If validation fails
        """
        roleref = binding.get("roleRef", {})
        roleref_kind = str(roleref.get("kind", "")).strip() if roleref else ""
        roleref_name = str(roleref.get("name", "")).strip() if roleref else ""

        if not roleref_kind:
            raise ValidationError(
                f"roleBinding[{idx}].roleRef.kind",
                f"Role Binding #{idx + 1}: Role Type is mandatory and cannot be empty"
            )
        if not roleref_name:
            raise ValidationError(
                f"roleBinding[{idx}].roleRef.name",
                f"Role Binding #{idx + 1}: Role Reference is mandatory and cannot be empty"
            )

        subjects = binding.get("subjects", [])
        if not subjects or len(subjects) == 0:
            raise ValidationError(
                f"roleBinding[{idx}].subjects",
                f"Role Binding #{idx + 1}: At least one subject is required"
            )

        validated_subjects = []
        for sub_idx, subject in enumerate(subjects):
            subject_kind = str(subject.get("kind", "")).strip()
            subject_name = str(subject.get("name", "")).strip()

            if not subject_kind:
                raise ValidationError(
                    f"roleBinding[{idx}].subjects[{sub_idx}].kind",
                    f"Role Binding #{idx + 1}, Subject #{sub_idx + 1}: Subject Kind is mandatory and cannot be empty"
                )
            if not subject_name:
                raise ValidationError(
                    f"roleBinding[{idx}].subjects[{sub_idx}].name",
                    f"Role Binding #{idx + 1}, Subject #{sub_idx + 1}: Subject Name is mandatory and cannot be empty"
                )

            validated_subjects.append({
                "kind": subject_kind,
                "name": subject_name,
            })

        return {
            "subjects": validated_subjects,
            "roleRef": {
                "kind": roleref_kind,
                "name": roleref_name,
            }
        }

    def generate_rolebinding_yaml(
        self,
        namespace: str,
        subjects: List[RBSubject],
        role_ref: RBRoleRef,
        binding_index: Optional[int] = None,
        binding_name: Optional[str] = None
    ) -> str:
        """Generate YAML for a role binding.

        Args:
            namespace: Namespace name
            subjects: List of subjects
            role_ref: Role reference
            binding_index: Optional binding index
            binding_name: Optional binding name

        Returns:
            YAML string

        Raises:
            ValidationError: If validation fails
        """
        roleref_kind = str(role_ref.kind).strip() if role_ref and role_ref.kind is not None else ""
        roleref_name = str(role_ref.name).strip() if role_ref and role_ref.name is not None else ""

        if not roleref_kind or not roleref_name:
            raise ValidationError(
                "roleRef",
                "roleRef.kind and roleRef.name are required"
            )

        if not subjects or len(subjects) == 0:
            raise ValidationError(
                "subjects",
                "At least one subject is required"
            )

        # Validate and format subjects
        formatted_subjects = []
        for subject in subjects:
            subject_kind = str(subject.kind).strip() if subject and subject.kind is not None else ""
            subject_name = str(subject.name).strip() if subject and subject.name is not None else ""

            if not subject_kind or not subject_name:
                raise ValidationError(
                    "subject",
                    "Each subject must have kind and name"
                )

            formatted_subjects.append({
                "kind": subject_kind,
                "name": subject_name,
                "apiGroup": "rbac.authorization.k8s.io",
            })

        idx = binding_index if binding_index is not None else 0
        binding_name = str(binding_name).strip() if binding_name is not None else ""
        if not binding_name:
            binding_name = f"{namespace}-binding-{idx}"

        rolebinding_obj = {
            "apiVersion": "rbac.authorization.k8s.io/v1",
            "kind": "RoleBinding",
            "metadata": {
                "name": binding_name,
                "namespace": namespace,
            },
            "subjects": formatted_subjects,
            "roleRef": {
                "kind": roleref_kind,
                "name": roleref_name,
                "apiGroup": "rbac.authorization.k8s.io",
            },
        }

        return yaml.safe_dump(rolebinding_obj, sort_keys=False)

    # ============================================
    # ResourceQuota Operations
    # ============================================

    def get_resourcequota(
        self,
        env: str,
        appname: str,
        namespace: str
    ) -> Dict[str, Any]:
        """Get resource quota for a namespace.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name

        Returns:
            Dictionary with requests and quota_limits
        """
        ns_dir = self.repo.get_namespace_dir(env, appname, namespace)
        resourcequota_path = ns_dir / "resourcequota.yaml"

        rq = read_yaml_dict(resourcequota_path)
        reqs, quota_limits = self._parse_resourcequota(rq)

        return {
            "requests": {
                "cpu": reqs.get("cpu"),
                "memory": reqs.get("memory"),
                "ephemeral-storage": reqs.get("ephemeral-storage"),
            },
            "quota_limits": {
                "memory": quota_limits.get("memory"),
                "ephemeral-storage": quota_limits.get("ephemeral-storage"),
            },
        }

    def update_resourcequota(
        self,
        env: str,
        appname: str,
        namespace: str,
        requests: Optional[NamespaceResourcesCpuMem],
        quota_limits: Optional[NamespaceResourcesQuotaLimits]
    ) -> Dict[str, Any]:
        """Update resource quota for a namespace.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name
            requests: Resource requests
            quota_limits: Quota limits

        Returns:
            Dictionary with updated requests and quota_limits

        Raises:
            AppError: If update fails
        """
        ns_dir = self.repo.get_namespace_dir(env, appname, namespace)
        resourcequota_path = ns_dir / "resourcequota.yaml"

        try:
            rq_obj = self._build_resourcequota_file_obj(requests, quota_limits)
            resourcequota_path.write_text(yaml.safe_dump(rq_obj, sort_keys=False))
        except Exception as e:
            logger.error("Failed to write resourcequota.yaml: %s", e, exc_info=True)
            raise AppError(f"Failed to write resourcequota.yaml: {e}")

        return {
            "requests": {
                "cpu": None if requests is None else requests.cpu,
                "memory": None if requests is None else requests.memory,
                "ephemeral-storage": None if requests is None else requests.ephemeral_storage,
            },
            "quota_limits": {
                "memory": None if quota_limits is None else quota_limits.memory,
                "ephemeral-storage": None if quota_limits is None else quota_limits.ephemeral_storage,
            },
        }

    def generate_resourcequota_yaml(
        self,
        namespace: str,
        requests: Optional[NamespaceResourcesCpuMem],
        quota_limits: Optional[NamespaceResourcesQuotaLimits]
    ) -> str:
        """Generate YAML for resource quota.

        Args:
            namespace: Namespace name
            requests: Resource requests
            quota_limits: Quota limits

        Returns:
            YAML string
        """
        rq_obj = self._build_resourcequota_obj(namespace, requests, quota_limits)
        return yaml.safe_dump(rq_obj, sort_keys=False)

    def _parse_resourcequota(
        self,
        resourcequota: dict
    ) -> Tuple[Dict[str, Optional[str]], Dict[str, Optional[str]]]:
        """Parse resource quota manifest.

        Args:
            resourcequota: Resource quota dictionary

        Returns:
            Tuple of (requests dict, quota_limits dict)
        """
        spec = resourcequota.get("spec") if isinstance(resourcequota, dict) else None
        hard = spec.get("hard") if isinstance(spec, dict) else None
        hard = hard if isinstance(hard, dict) else {}

        requests = {
            "cpu": as_trimmed_str(hard.get("requests.cpu")),
            "memory": as_trimmed_str(hard.get("requests.memory")),
            "ephemeral-storage": as_trimmed_str(hard.get("requests.ephemeral-storage")),
        }
        quota_limits = {
            "memory": as_trimmed_str(hard.get("limits.memory")),
            "ephemeral-storage": as_trimmed_str(hard.get("limits.ephemeral-storage")),
        }

        return requests, quota_limits

    def _build_resourcequota_obj(
        self,
        namespace: str,
        requests: Optional[NamespaceResourcesCpuMem],
        quota_limits: Optional[NamespaceResourcesQuotaLimits],
    ) -> dict:
        """Build resource quota object for namespace.

        Args:
            namespace: Namespace name
            requests: Resource requests
            quota_limits: Quota limits

        Returns:
            Resource quota dictionary
        """
        hard = {}

        if quota_limits is not None:
            if is_set(quota_limits.ephemeral_storage):
                hard["limits.ephemeral-storage"] = str(quota_limits.ephemeral_storage).strip()
            if is_set(quota_limits.memory):
                hard["limits.memory"] = str(quota_limits.memory).strip()

        if requests is not None:
            if is_set(requests.cpu):
                hard["requests.cpu"] = str(requests.cpu).strip()
            if is_set(requests.memory):
                hard["requests.memory"] = str(requests.memory).strip()
            if is_set(requests.ephemeral_storage):
                hard["requests.ephemeral-storage"] = str(requests.ephemeral_storage).strip()

        return {
            "apiVersion": "v1",
            "kind": "ResourceQuota",
            "metadata": {
                "name": f"{namespace}-quota",
                "namespace": namespace,
            },
            "spec": {
                "hard": hard,
            },
        }

    def _build_resourcequota_file_obj(
        self,
        requests: Optional[NamespaceResourcesCpuMem],
        quota_limits: Optional[NamespaceResourcesQuotaLimits],
    ) -> dict:
        """Build resource quota file object (template format).

        Args:
            requests: Resource requests
            quota_limits: Quota limits

        Returns:
            Resource quota dictionary with template namespace
        """
        hard = {}

        if quota_limits is not None:
            if is_set(quota_limits.ephemeral_storage):
                hard["limits.ephemeral-storage"] = str(quota_limits.ephemeral_storage).strip()
            if is_set(quota_limits.memory):
                hard["limits.memory"] = str(quota_limits.memory).strip()

        if requests is not None:
            if is_set(requests.cpu):
                hard["requests.cpu"] = str(requests.cpu).strip()
            if is_set(requests.memory):
                hard["requests.memory"] = str(requests.memory).strip()
            if is_set(requests.ephemeral_storage):
                hard["requests.ephemeral-storage"] = str(requests.ephemeral_storage).strip()

        return {
            "apiVersion": "v1",
            "kind": "ResourceQuota",
            "metadata": {
                "name": "default",
                "namespace": "{{ .Values.namespacename }}",
            },
            "spec": {
                "hard": hard,
            },
        }

    # ============================================
    # LimitRange Operations
    # ============================================

    def get_limitrange(
        self,
        env: str,
        appname: str,
        namespace: str
    ) -> Dict[str, Any]:
        """Get limit range for a namespace.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name

        Returns:
            Dictionary with limits
        """
        ns_dir = self.repo.get_namespace_dir(env, appname, namespace)
        limitrange_path = ns_dir / "limitrange.yaml"

        lr = read_yaml_dict(limitrange_path)
        limits = self._parse_limitrange(lr)

        return {
            "limits": {
                "cpu": limits.get("cpu"),
                "memory": limits.get("memory"),
                "ephemeral-storage": limits.get("ephemeral-storage"),
                "default": limits.get("default"),
            }
        }

    def update_limitrange(
        self,
        env: str,
        appname: str,
        namespace: str,
        limits: Optional[NamespaceResourcesLimits]
    ) -> Dict[str, Any]:
        """Update limit range for a namespace.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name
            limits: Resource limits

        Returns:
            Dictionary with updated limits

        Raises:
            AppError: If update fails
        """
        ns_dir = self.repo.get_namespace_dir(env, appname, namespace)
        limitrange_path = ns_dir / "limitrange.yaml"

        try:
            lr_obj = self._build_limitrange_file_obj(namespace, limits)
            limitrange_path.write_text(yaml.safe_dump(lr_obj, sort_keys=False))
        except Exception as e:
            logger.error("Failed to write limitrange.yaml: %s", e, exc_info=True)
            raise AppError(f"Failed to write limitrange.yaml: {e}")

        return {
            "limits": {
                "cpu": None if limits is None else limits.cpu,
                "memory": None if limits is None else limits.memory,
                "ephemeral-storage": None if limits is None else limits.ephemeral_storage,
                "default": (None if limits is None else (None if limits.default is None else {
                    "cpu": limits.default.cpu,
                    "memory": limits.default.memory,
                    "ephemeral-storage": limits.default.ephemeral_storage,
                })),
            },
        }

    def generate_limitrange_yaml(
        self,
        namespace: str,
        limits: Optional[NamespaceResourcesLimits]
    ) -> str:
        """Generate YAML for limit range.

        Args:
            namespace: Namespace name
            limits: Resource limits

        Returns:
            YAML string
        """
        lr_obj = self._build_limitrange_obj(namespace, limits)
        return yaml.safe_dump(lr_obj, sort_keys=False)

    def _parse_limitrange(self, limitrange: dict) -> Dict[str, Any]:
        """Parse limit range manifest.

        Args:
            limitrange: Limit range dictionary

        Returns:
            Dictionary with parsed limits
        """
        spec = limitrange.get("spec") if isinstance(limitrange, dict) else None
        limits_list = spec.get("limits") if isinstance(spec, dict) else None
        first = limits_list[0] if isinstance(limits_list, list) and len(limits_list) > 0 and isinstance(limits_list[0], dict) else {}

        default_request = first.get("defaultRequest") if isinstance(first, dict) else None
        default_obj = first.get("default") if isinstance(first, dict) else None

        out = {
            "cpu": as_trimmed_str(default_request.get("cpu")) if isinstance(default_request, dict) else None,
            "memory": as_trimmed_str(default_request.get("memory")) if isinstance(default_request, dict) else None,
            "ephemeral-storage": as_trimmed_str(default_request.get("ephemeral-storage")) if isinstance(default_request, dict) else None,
            "default": None,
        }

        default_out = {
            "cpu": as_trimmed_str(default_obj.get("cpu")) if isinstance(default_obj, dict) else None,
            "memory": as_trimmed_str(default_obj.get("memory")) if isinstance(default_obj, dict) else None,
            "ephemeral-storage": as_trimmed_str(default_obj.get("ephemeral-storage")) if isinstance(default_obj, dict) else None,
        }

        if any(v is not None for v in default_out.values()):
            out["default"] = default_out

        return out

    def _build_limitrange_obj(
        self,
        namespace: str,
        limits: Optional[NamespaceResourcesLimits]
    ) -> dict:
        """Build limit range object for namespace.

        Args:
            namespace: Namespace name
            limits: Resource limits

        Returns:
            Limit range dictionary
        """
        default_request = {}
        default = {}

        if limits is not None:
            if is_set(limits.cpu):
                default_request["cpu"] = str(limits.cpu).strip()
            if is_set(limits.memory):
                default_request["memory"] = str(limits.memory).strip()
            if is_set(limits.ephemeral_storage):
                default_request["ephemeral-storage"] = str(limits.ephemeral_storage).strip()

            if limits.default is not None:
                if is_set(limits.default.cpu):
                    default["cpu"] = str(limits.default.cpu).strip()
                if is_set(limits.default.memory):
                    default["memory"] = str(limits.default.memory).strip()
                if is_set(limits.default.ephemeral_storage):
                    default["ephemeral-storage"] = str(limits.default.ephemeral_storage).strip()

        limit_entry = {
            "type": "Container",
        }
        if default:
            limit_entry["default"] = default
        if default_request:
            limit_entry["defaultRequest"] = default_request

        return {
            "apiVersion": "v1",
            "kind": "LimitRange",
            "metadata": {
                "name": "default",
                "namespace": namespace,
            },
            "spec": {
                "limits": [limit_entry],
            },
        }

    def _build_limitrange_file_obj(
        self,
        namespace: str,
        limits: Optional[NamespaceResourcesLimits]
    ) -> dict:
        """Build limit range file object.

        Args:
            namespace: Namespace name
            limits: Resource limits

        Returns:
            Limit range dictionary
        """
        return self._build_limitrange_obj(namespace=namespace, limits=limits)

    # ============================================
    # Egress Firewall Operations
    # ============================================

    def get_egressfirewall(
        self,
        env: str,
        appname: str,
        namespace: str
    ) -> Dict[str, Any]:
        """Get egress firewall rules for a namespace.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name

        Returns:
            Dictionary with exists flag and rules list
        """
        enforcement = load_enforcement_settings()
        egress_firewall_enforced = str(enforcement.enforce_egress_firewall or "yes").strip().lower() != "no"

        if not egress_firewall_enforced:
            return {"exists": False, "rules": []}

        ns_dir = self.repo.get_namespace_dir(env, appname, namespace)
        path = ns_dir / "egress_firewall_requests.yaml"

        # Try to extract from full EgressFirewall object structure first
        egress_entries = self._extract_egress_entries_from_template(path)

        # Fallback to reading as a list (backward compatibility)
        if not egress_entries:
            rules = read_yaml_list(path)
        else:
            rules = egress_entries

        normalized: List[Dict[str, Any]] = []
        for r in rules:
            if not isinstance(r, dict):
                continue

            # Backward-compat: older stored format was UI rules.
            if "egressType" in r or "egressValue" in r:
                normalized.append(self._normalize_egress_rule(r))
                continue

            # New stored format: OVN spec.egress entries.
            converted = self._egress_entry_to_rule(r)
            if converted is not None:
                normalized.append(converted)

        return {"exists": path.exists() and path.is_file(), "rules": normalized}

    def update_egressfirewall(
        self,
        env: str,
        appname: str,
        namespace: str,
        rules: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Update egress firewall rules for a namespace.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name
            rules: List of egress firewall rules

        Returns:
            Dictionary with updated rules

        Raises:
            ValidationError: If validation fails or enforcement is disabled
            AppError: If write/delete fails
        """
        enforcement = load_enforcement_settings()
        egress_firewall_enforced = str(enforcement.enforce_egress_firewall or "yes").strip().lower() != "no"

        if not egress_firewall_enforced:
            raise ValidationError(
                "egressFirewall",
                "Egress firewall enforcement is disabled"
            )

        ns_dir = self.repo.get_namespace_dir(env, appname, namespace)
        path = ns_dir / "egress_firewall_requests.yaml"

        out_rules: List[Dict[str, Any]] = []
        out_egress_entries: List[Dict[str, Any]] = []

        for idx, r in enumerate(rules):
            egress_type = str(r.get("egressType", "")).strip()
            egress_value = str(r.get("egressValue", "")).strip()

            if egress_type not in {"dnsName", "cidrSelector"}:
                raise ValidationError(
                    f"egressRule[{idx}].egressType",
                    f"Egress rule #{idx + 1}: egressType must be dnsName or cidrSelector"
                )
            if not egress_value:
                raise ValidationError(
                    f"egressRule[{idx}].egressValue",
                    f"Egress rule #{idx + 1}: egressValue is required"
                )

            rule_out: Dict[str, Any] = {
                "egressType": egress_type,
                "egressValue": egress_value
            }

            if egress_type == "cidrSelector" and r.get("ports") is not None:
                ports_out: List[Dict[str, Any]] = []
                for pidx, p in enumerate(r.get("ports", [])):
                    protocol = str(p.get("protocol", "")).strip()
                    if not protocol:
                        raise ValidationError(
                            f"egressRule[{idx}].ports[{pidx}].protocol",
                            f"Egress rule #{idx + 1} port #{pidx + 1}: protocol is required"
                        )
                    if p.get("port") is None:
                        raise ValidationError(
                            f"egressRule[{idx}].ports[{pidx}].port",
                            f"Egress rule #{idx + 1} port #{pidx + 1}: port is required"
                        )
                    try:
                        port_int = int(p.get("port"))
                    except Exception:
                        raise ValidationError(
                            f"egressRule[{idx}].ports[{pidx}].port",
                            f"Egress rule #{idx + 1} port #{pidx + 1}: port must be an integer"
                        )
                    ports_out.append({"protocol": protocol, "port": port_int})

                if ports_out:
                    rule_out["ports"] = ports_out

            out_rules.append(rule_out)
            out_egress_entries.append(self._rule_to_egress_entry(rule_out))

        if len(out_rules) == 0:
            existed = path.exists() and path.is_file()
            if existed:
                try:
                    path.unlink()
                except Exception as e:
                    logger.error("Failed to delete egress_firewall_requests.yaml: %s", e, exc_info=True)
                    raise AppError(f"Failed to delete egress_firewall_requests.yaml: {e}")
            return {"rules": []}

        try:
            path.write_text(
                yaml.safe_dump(out_egress_entries, sort_keys=False, default_flow_style=False)
            )
        except Exception as e:
            logger.error("Failed to write egress_firewall_requests.yaml: %s", e, exc_info=True)
            raise AppError(f"Failed to write egress_firewall_requests.yaml: {e}")

        return {"rules": out_rules}

    def delete_egressfirewall(
        self,
        env: str,
        appname: str,
        namespace: str
    ) -> Dict[str, Any]:
        """Delete egress firewall rules for a namespace.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name

        Returns:
            Dictionary with deletion status

        Raises:
            ValidationError: If enforcement is disabled
            AppError: If deletion fails
        """
        enforcement = load_enforcement_settings()
        egress_firewall_enforced = str(enforcement.enforce_egress_firewall or "yes").strip().lower() != "no"

        if not egress_firewall_enforced:
            raise ValidationError(
                "egressFirewall",
                "Egress firewall enforcement is disabled"
            )

        ns_dir = self.repo.get_namespace_dir(env, appname, namespace)
        path = ns_dir / "egress_firewall_requests.yaml"

        if path.exists() and path.is_file():
            try:
                path.unlink()
            except Exception as e:
                logger.error("Failed to delete egress_firewall_requests.yaml: %s", e, exc_info=True)
                raise AppError(f"Failed to delete egress_firewall_requests.yaml: {e}")

        return {"deleted": True, "rules": []}

    def _normalize_egress_rule(self, rule: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize an egress rule.

        Args:
            rule: Egress rule dictionary

        Returns:
            Normalized rule dictionary
        """
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

    def _egress_entry_to_rule(self, entry: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Convert an OVN EgressFirewall spec.egress entry to UI rule shape.

        Args:
            entry: Egress entry dictionary

        Returns:
            Rule dictionary or None if invalid
        """
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

    def _rule_to_egress_entry(self, rule: Dict[str, Any]) -> Dict[str, Any]:
        """Convert UI rule shape to an OVN EgressFirewall spec.egress entry.

        Args:
            rule: Rule dictionary

        Returns:
            Egress entry dictionary
        """
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

    def _extract_egress_entries_from_template(self, path: Path) -> List[Dict[str, Any]]:
        """Extract egress entries from a template file.

        Args:
            path: Path to template file

        Returns:
            List of egress entry dictionaries
        """
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

    # ============================================
    # Egress Info Operations
    # ============================================

    def get_egress_info(
        self,
        env: str,
        appname: str,
        namespace: str
    ) -> Dict[str, Any]:
        """Get egress information for a namespace.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name

        Returns:
            Dictionary with egress information
        """
        ns_dir = self.repo.get_namespace_dir(env, appname, namespace)
        ns_info_path = ns_dir / "namespace_info.yaml"

        enforcement = load_enforcement_settings()
        egress_firewall_enforced = str(enforcement.enforce_egress_firewall or "yes").strip().lower() != "no"

        ns_info = {}
        if ns_info_path.exists() and ns_info_path.is_file():
            try:
                parsed = yaml.safe_load(ns_info_path.read_text()) or {}
                if isinstance(parsed, dict):
                    ns_info = parsed
            except Exception:
                ns_info = {}

        egress_nameid = ns_info.get("egress_nameid")
        egress_nameid = None if egress_nameid in (None, "") else str(egress_nameid)

        from backend.utils.helpers import parse_bool

        return {
            "egress_nameid": egress_nameid,
            "enable_pod_based_egress_ip": parse_bool(ns_info.get("enable_pod_based_egress_ip")),
            "allow_all_egress": (not egress_firewall_enforced) or parse_bool(ns_info.get("allow_all_egress")),
        }

    def update_egress_info(
        self,
        env: str,
        appname: str,
        namespace: str,
        egress_nameid: Optional[str] = None,
        remove_egress_nameid: bool = False,
        enable_pod_based_egress_ip: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """Update egress information for a namespace.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name
            egress_nameid: Egress namespace ID
            enable_pod_based_egress_ip: Enable pod-based egress IP

        Returns:
            Updated egress information

        Raises:
            AppError: If update fails
        """
        ns_dir = self.repo.get_namespace_dir(env, appname, namespace)
        ns_info_path = ns_dir / "namespace_info.yaml"

        try:
            existing = {}
            if ns_info_path.exists() and ns_info_path.is_file():
                parsed = yaml.safe_load(ns_info_path.read_text()) or {}
                if isinstance(parsed, dict):
                    existing = parsed

            if remove_egress_nameid:
                existing.pop("egress_nameid", None)
            elif egress_nameid is not None:
                existing["egress_nameid"] = str(egress_nameid)
            if enable_pod_based_egress_ip is not None:
                existing["enable_pod_based_egress_ip"] = bool(enable_pod_based_egress_ip)

            ns_info_path.write_text(yaml.safe_dump(existing, sort_keys=False))
        except Exception as e:
            logger.error("Failed to update namespace_info.yaml: %s", e, exc_info=True)
            raise AppError(f"Failed to update namespace_info.yaml: {e}")

        from backend.utils.helpers import parse_bool

        egress_nameid_result = existing.get("egress_nameid")
        egress_nameid_result = None if egress_nameid_result in (None, "") else str(egress_nameid_result).strip()

        return {
            "egress_nameid": egress_nameid_result,
            "enable_pod_based_egress_ip": parse_bool(existing.get("enable_pod_based_egress_ip")),
            "clusters": existing.get("clusters", []),
        }

    # ============================================
    # NS ArgoCD Operations
    # ============================================

    def get_nsargocd(
        self,
        env: str,
        appname: str,
        namespace: str
    ) -> Dict[str, Any]:
        """Get ArgoCD configuration for a namespace.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name

        Returns:
            Dictionary with ArgoCD configuration
        """
        ns_dir = self.repo.get_namespace_dir(env, appname, namespace)
        cfg_path = ns_dir / "nsargocd.yaml"

        data = read_yaml_dict(cfg_path)

        exists = False
        try:
            exists = cfg_path.exists() and cfg_path.is_file()
        except Exception:
            exists = False

        from backend.utils.helpers import parse_bool

        return {
            "exists": exists,
            "need_argo": parse_bool(data.get("need_argo")),
            "argocd_sync_strategy": str(data.get("argocd_sync_strategy", "") or ""),
            "gitrepourl": str(data.get("gitrepourl", "") or ""),
        }

    def update_nsargocd(
        self,
        env: str,
        appname: str,
        namespace: str,
        need_argo: Optional[bool] = None,
        argocd_sync_strategy: Optional[str] = None,
        gitrepourl: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Update ArgoCD configuration for a namespace.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name
            need_argo: Whether ArgoCD is needed
            argocd_sync_strategy: ArgoCD sync strategy
            gitrepourl: Git repository URL

        Returns:
            Updated ArgoCD configuration

        Raises:
            AppError: If update fails
        """
        ns_dir = self.repo.get_namespace_dir(env, appname, namespace)
        cfg_path = ns_dir / "nsargocd.yaml"

        out: Dict[str, Any] = {}
        if need_argo is not None:
            out["need_argo"] = "true" if bool(need_argo) else "false"

        sync_strategy = str(argocd_sync_strategy or "").strip()
        if sync_strategy:
            out["argocd_sync_strategy"] = sync_strategy

        repo_url = str(gitrepourl or "").strip()
        if repo_url:
            out["gitrepourl"] = repo_url

        try:
            cfg_path.write_text(yaml.safe_dump(out, sort_keys=False))
        except Exception as e:
            logger.error("Failed to write nsargocd.yaml: %s", e, exc_info=True)
            raise AppError(f"Failed to write nsargocd.yaml: {e}")

        from backend.utils.helpers import parse_bool

        return {
            "need_argo": parse_bool(out.get("need_argo")),
            "argocd_sync_strategy": str(out.get("argocd_sync_strategy", "") or ""),
            "gitrepourl": str(out.get("gitrepourl", "") or ""),
        }

    def delete_nsargocd(
        self,
        env: str,
        appname: str,
        namespace: str
    ) -> Dict[str, bool]:
        """Delete ArgoCD configuration for a namespace.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name

        Returns:
            Dictionary with deletion status

        Raises:
            AppError: If deletion fails
        """
        ns_dir = self.repo.get_namespace_dir(env, appname, namespace)
        cfg_path = ns_dir / "nsargocd.yaml"

        existed = False
        try:
            existed = cfg_path.exists() and cfg_path.is_file()
        except Exception:
            existed = False

        if existed:
            try:
                cfg_path.unlink()
            except Exception as e:
                logger.error("Failed to delete nsargocd.yaml: %s", e, exc_info=True)
                raise AppError(f"Failed to delete nsargocd.yaml: {e}")

        return {"deleted": existed}

