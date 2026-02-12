from __future__ import annotations

import os
from pathlib import Path
from threading import RLock
from typing import Any, Dict, List

import yaml


class RoleMgmtImpl:
    _instance: "RoleMgmtImpl | None" = None
    _instance_lock = RLock()

    def __init__(self) -> None:
        self._lock = RLock()
        self._rbac_dir = Path.home() / "workspace" / "kselfserv" / "cloned-repositories" / "control" / "rbac"
        self._demo_mode = os.getenv("DEMO_MODE", "").lower() == "true"
        self._legacy_store_path = self._rbac_dir / "role_assignments.yaml"
        self._store_paths: Dict[str, Path] = {}
        self._demo_users_path = self._rbac_dir / "demo_users.yaml"
        self._refresh_paths()
        self._data: Dict[str, Any] = {
            "group_app_roles": {},
            "group_global_roles": {},
            "user_global_roles": {},
            "user_groups": {},
        }
        # Always load from files - never create dummy data
        self._load()

    @classmethod
    def get_instance(cls) -> "RoleMgmtImpl":
        with cls._instance_lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def update_roles(self, *, force: bool = False) -> None:
        if force:
            self._refresh_paths()
            self._load()

    def _refresh_paths(self) -> None:
        demo_mode = os.getenv("DEMO_MODE", "").lower() == "true"

        workspace_raw = str(os.getenv("WORKSPACE", "")).strip()
        if workspace_raw:
            workspace = Path(workspace_raw).expanduser()
        else:
            workspace = Path.home() / "workspace"

        rbac_dir = workspace / "kselfserv" / "cloned-repositories" / "control" / "rbac"
        if demo_mode:
            rbac_dir = rbac_dir / "demo_mode"

        with self._lock:
            self._demo_mode = demo_mode
            self._rbac_dir = rbac_dir
            self._legacy_store_path = self._rbac_dir / "role_assignments.yaml"
            self._store_paths = {
                "group_app_roles": self._rbac_dir / "group_app_roles.yaml",
                "group_global_roles": self._rbac_dir / "group_global_roles.yaml",
                "user_global_roles": self._rbac_dir / "user_global_roles.yaml",
                "user_groups": self._rbac_dir / "user_groups.yaml",
            }
            self._demo_users_path = self._rbac_dir / "demo_users.yaml"

    def _load(self) -> None:
        with self._lock:
            try:
                keys = ["group_app_roles", "group_global_roles", "user_global_roles", "user_groups"]
                loaded_any = False
                for key in keys:
                    p = self._store_paths.get(key)
                    if not p or not p.exists() or not p.is_file():
                        continue
                    raw = yaml.safe_load(p.read_text())
                    if isinstance(raw, dict):
                        self._data[key] = raw
                        loaded_any = True

                if loaded_any:
                    return

                if not self._legacy_store_path.exists() or not self._legacy_store_path.is_file():
                    return
                raw = yaml.safe_load(self._legacy_store_path.read_text())
                if not isinstance(raw, dict):
                    return

                for key in keys:
                    val = raw.get(key)
                    if isinstance(val, dict):
                        self._data[key] = val

                self._flush()
            except Exception:
                # Best effort: keep in-memory defaults
                return

    def _flush(self) -> None:
        with self._lock:
            self._rbac_dir.mkdir(parents=True, exist_ok=True)
            for key, path in self._store_paths.items():
                data = self._data.get(key)
                if not isinstance(data, dict):
                    data = {}
                path.write_text(yaml.safe_dump(data, sort_keys=False))


    def _norm(self, s: str | None) -> str:
        return str(s or "").strip()

    def get_grp2apps2roles(self) -> dict:
        with self._lock:
            return dict(self._data.get("group_app_roles") or {})

    def add_grp2apps2roles(self, grantor: str | None, group: str, app: str, role: str) -> None:
        group = self._norm(group)
        app = self._norm(app)
        role = self._norm(role)
        if not group or not app or not role:
            raise ValueError("group, app, and role are required")

        with self._lock:
            gmap = self._data.setdefault("group_app_roles", {})
            amap = gmap.setdefault(group, {})
            roles = amap.setdefault(app, [])
            if role not in roles:
                roles.append(role)
            self._flush()

    def del_grp2apps2roles(self, grantor: str | None, group: str, app: str, role: str) -> None:
        group = self._norm(group)
        app = self._norm(app)
        role = self._norm(role)
        if not group or not app or not role:
            raise ValueError("group, app, and role are required")

        with self._lock:
            gmap = self._data.get("group_app_roles") or {}
            amap = (gmap.get(group) or {})
            roles = (amap.get(app) or [])
            if role in roles:
                roles.remove(role)
            if not roles and app in amap:
                amap.pop(app, None)
            if not amap and group in gmap:
                gmap.pop(group, None)
            self._flush()

    def get_grps2globalroles(self) -> dict:
        with self._lock:
            return dict(self._data.get("group_global_roles") or {})

    def add_grps2globalroles(self, grantor: str | None, group: str, role: str) -> None:
        group = self._norm(group)
        role = self._norm(role)
        if not group or not role:
            raise ValueError("group and role are required")

        with self._lock:
            gmap = self._data.setdefault("group_global_roles", {})
            roles = gmap.setdefault(group, [])
            if role not in roles:
                roles.append(role)
            self._flush()

    def del_grps2globalroles(self, grantor: str | None, group: str, role: str) -> None:
        group = self._norm(group)
        role = self._norm(role)
        if not group or not role:
            raise ValueError("group and role are required")

        with self._lock:
            gmap = self._data.get("group_global_roles") or {}
            roles = (gmap.get(group) or [])
            if role in roles:
                roles.remove(role)
            if not roles and group in gmap:
                gmap.pop(group, None)
            self._flush()

    def get_users2globalroles(self) -> dict:
        with self._lock:
            return dict(self._data.get("user_global_roles") or {})

    def add_users2globalroles(self, grantor: str | None, user: str, role: str) -> None:
        user = self._norm(user)
        role = self._norm(role)
        if not user or not role:
            raise ValueError("user and role are required")

        with self._lock:
            umap = self._data.setdefault("user_global_roles", {})
            roles = umap.setdefault(user, [])
            if role not in roles:
                roles.append(role)
            self._flush()

    def del_users2globalroles(self, grantor: str | None, user: str, role: str) -> None:
        user = self._norm(user)
        role = self._norm(role)
        if not user or not role:
            raise ValueError("user and role are required")

        with self._lock:
            umap = self._data.get("user_global_roles") or {}
            roles = (umap.get(user) or [])
            if role in roles:
                roles.remove(role)
            if not roles and user in umap:
                umap.pop(user, None)
            self._flush()

    def get_user_groups(self, user_id: str) -> List[str]:
        user_id = self._norm(user_id)
        if not user_id:
            return []
        with self._lock:
            ug = self._data.get("user_groups") or {}
            groups = ug.get(user_id)
            if isinstance(groups, list):
                return [self._norm(g) for g in groups if self._norm(g)]
            return []

    def get_user_roles(self, user_id: str, groups: List[str]) -> List[str]:
        roles: List[str] = []
        user_id = self._norm(user_id)
        with self._lock:
            umap = self._data.get("user_global_roles") or {}
            uroles = umap.get(user_id)
            if isinstance(uroles, list):
                roles.extend([self._norm(r) for r in uroles if self._norm(r)])

            gmap = self._data.get("group_global_roles") or {}
            for g in groups or []:
                groles = gmap.get(g)
                if isinstance(groles, list):
                    roles.extend([self._norm(r) for r in groles if self._norm(r)])

        # de-dupe preserving order
        seen = set()
        out: List[str] = []
        for r in roles:
            if r not in seen:
                seen.add(r)
                out.append(r)
        return out

    def get_app_roles(self, groups: List[str]) -> Dict[str, List[str]]:
        app_roles: Dict[str, List[str]] = {}
        with self._lock:
            gmap = self._data.get("group_app_roles") or {}
            for g in groups or []:
                amap = gmap.get(g)
                if not isinstance(amap, dict):
                    continue
                for app, roles in amap.items():
                    if not isinstance(roles, list):
                        continue
                    for r in roles:
                        rr = self._norm(r)
                        if not rr:
                            continue
                        app_roles.setdefault(str(app), [])
                        if rr not in app_roles[str(app)]:
                            app_roles[str(app)].append(rr)
        return app_roles
