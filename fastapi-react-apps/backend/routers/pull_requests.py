from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List, Optional, Set, Tuple
from pathlib import Path
import logging
import os
import re
import subprocess

import requests
import yaml

from backend.models import PullRequestStatus
from backend.dependencies import require_env
from backend.routers.system import _require_workspace_path

router = APIRouter(tags=["pull_requests"])

logger = logging.getLogger("uvicorn.error")


def _require_env(env: Optional[str]) -> str:
    """Wrapper for backward compatibility."""
    return require_env(env)


def _control_repo_root() -> Path:
    workspace_path = _require_workspace_path()
    root = workspace_path / "kselfserv" / "cloned-repositories" / "control"
    if not root.exists() or not root.is_dir():
        raise HTTPException(status_code=400, detail="not initialized")
    return root


def _requests_repo_root() -> Path:
    workspace_path = _require_workspace_path()
    root = workspace_path / "kselfserv" / "cloned-repositories" / "requests"
    if not root.exists() or not root.is_dir():
        raise HTTPException(status_code=400, detail="not initialized")
    return root


def _read_required_approvers(appname: str) -> List[str]:
    base = _control_repo_root() / "pr_approvers" / str(appname) / "approvers.yaml"
    if not base.exists() or not base.is_file():
        return []
    try:
        raw = yaml.safe_load(base.read_text())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read approvers.yaml for {appname}: {e}")

    items: List[str] = []
    if isinstance(raw, list):
        items = [str(x).strip() for x in raw if str(x).strip()]
    elif isinstance(raw, dict):
        v = raw.get("approvers", raw.get("required_approvers", raw.get("users")))
        if isinstance(v, list):
            items = [str(x).strip() for x in v if str(x).strip()]
        elif isinstance(v, str):
            items = [p.strip() for p in v.split(",") if p.strip()]
    elif isinstance(raw, str):
        items = [p.strip() for p in raw.split(",") if p.strip()]

    seen: Set[str] = set()
    out: List[str] = []
    for x in items:
        key = x.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(x)
    return out


def _parse_github_owner_repo(repo_url: str) -> Tuple[str, str]:
    u = str(repo_url or "").strip()
    if not u:
        raise HTTPException(status_code=400, detail="requestsRepo is not configured")

    m = re.search(r"github\.com[:/](?P<owner>[^/]+)/(?P<repo>[^/.]+)(?:\.git)?/?$", u, re.IGNORECASE)
    if not m:
        raise HTTPException(status_code=400, detail=f"Unsupported GitHub repo URL: {u}")
    return m.group("owner"), m.group("repo")


def _github_headers() -> Dict[str, str]:
    token = str(os.environ.get("GITHUB_TOKEN", "") or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="Missing GITHUB_TOKEN environment variable")
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _has_github_token() -> bool:
    return bool(str(os.environ.get("GITHUB_TOKEN", "") or "").strip())


def _get_requests_repo_url_from_config() -> str:
    cfg_path = Path.home() / ".kselfserve" / "kselfserveconfig.yaml"
    if not cfg_path.exists():
        raise HTTPException(status_code=400, detail="not initialized")
    try:
        raw_cfg = yaml.safe_load(cfg_path.read_text()) or {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read config: {e}")
    if not isinstance(raw_cfg, dict):
        raise HTTPException(status_code=400, detail="not initialized")
    return str(raw_cfg.get("requestsRepo", "") or "")


def _run_git(repo_dir: Path, args: List[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", "-C", str(repo_dir), *args],
        check=True,
        capture_output=True,
        text=True,
    )


def _git_has_changes(repo_dir: Path) -> bool:
    res = _run_git(repo_dir, ["status", "--porcelain"])  # empty output => clean
    return bool((res.stdout or "").strip())


def _git_current_branch(repo_dir: Path) -> str:
    res = _run_git(repo_dir, ["rev-parse", "--abbrev-ref", "HEAD"])
    return str((res.stdout or "").strip())


def _git_branch_exists(repo_dir: Path, branch: str) -> bool:
    try:
        _run_git(repo_dir, ["show-ref", "--verify", f"refs/heads/{branch}"])
        return True
    except subprocess.CalledProcessError:
        return False


def _git_remote_branch_exists(repo_dir: Path, remote: str, branch: str) -> bool:
    try:
        _run_git(repo_dir, ["show-ref", "--verify", f"refs/remotes/{remote}/{branch}"])
        return True
    except subprocess.CalledProcessError:
        return False


def _ensure_branch_committed_and_pushed(repo_dir: Path, head_branch: str, base_branch: str) -> bool:
    has_github_token = bool(str(os.environ.get("GITHUB_TOKEN", "") or "").strip())

    if not has_github_token:
        logger.warning("GITHUB_TOKEN not set; skipping git remote operations (fetch/pull/push).")

    remote_head_exists = False
    if has_github_token:
        try:
            _run_git(repo_dir, ["fetch", "origin", base_branch])
        except subprocess.CalledProcessError:
            _run_git(repo_dir, ["fetch", "--all"])

        # Make sure we have remote refs for the head branch too (it may already exist).
        try:
            _run_git(repo_dir, ["fetch", "origin", head_branch])
        except subprocess.CalledProcessError:
            pass

        remote_head_exists = _git_remote_branch_exists(repo_dir, "origin", head_branch)

    # If the working tree is dirty (common right after app/namespace edits), do NOT attempt to
    # checkout/pull the base branch first: that can fail due to local changes.
    # Instead, switch/create the head branch in-place, preserving local changes, then commit.
    if _git_has_changes(repo_dir):
        current = _git_current_branch(repo_dir)
        if current != head_branch:
            if _git_branch_exists(repo_dir, head_branch):
                _run_git(repo_dir, ["checkout", head_branch])
            else:
                if remote_head_exists:
                    _run_git(repo_dir, ["checkout", "-b", head_branch, f"origin/{head_branch}"])
                else:
                    _run_git(repo_dir, ["checkout", "-b", head_branch])
    else:
        # Clean working tree: update base branch, then create/switch head branch based on origin/base.
        try:
            _run_git(repo_dir, ["checkout", base_branch])
        except subprocess.CalledProcessError:
            if has_github_token:
                _run_git(repo_dir, ["checkout", "-B", base_branch, f"origin/{base_branch}"])
            else:
                _run_git(repo_dir, ["checkout", "-B", base_branch])

        if has_github_token:
            try:
                _run_git(repo_dir, ["pull", "--ff-only"])
            except subprocess.CalledProcessError:
                # If ff-only fails (diverged), don't auto-merge; just proceed.
                pass

        if _git_branch_exists(repo_dir, head_branch):
            _run_git(repo_dir, ["checkout", head_branch])
        else:
            if remote_head_exists:
                _run_git(repo_dir, ["checkout", "-b", head_branch, f"origin/{head_branch}"])
            else:
                if has_github_token:
                    _run_git(repo_dir, ["checkout", "-b", head_branch, f"origin/{base_branch}"])
                else:
                    _run_git(repo_dir, ["checkout", "-b", head_branch, base_branch])

    # If the remote head exists, rebase on top of it so our push is fast-forward.
    if has_github_token and remote_head_exists:
        try:
            _run_git(repo_dir, ["pull", "--rebase", "origin", head_branch])
        except subprocess.CalledProcessError:
            pass

    if not _git_has_changes(repo_dir):
        return False

    _run_git(repo_dir, ["add", "-A"])
    try:
        _run_git(repo_dir, ["commit", "-m", f"Update {head_branch}"])
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or "").strip()
        raise HTTPException(status_code=500, detail=f"Failed to commit changes on {head_branch}: {stderr}")

    try:
        if not has_github_token:
            return True
        _run_git(repo_dir, ["push", "-u", "origin", head_branch])
    except subprocess.CalledProcessError as e:
        # If the remote branch exists and advanced, rebase and retry once.
        try:
            _run_git(repo_dir, ["pull", "--rebase", "origin", head_branch])
            _run_git(repo_dir, ["push", "-u", "origin", head_branch])
        except subprocess.CalledProcessError as e2:
            stderr = (e2.stderr or e.stderr or "").strip()
            raise HTTPException(status_code=500, detail=f"Failed to push branch {head_branch}: {stderr}")
    return True


def _find_open_pr(owner: str, repo: str, head_branch: str, base_branch: str) -> Optional[Dict[str, Any]]:
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls"
    params = {"state": "open", "head": f"{owner}:{head_branch}", "base": base_branch}
    r = requests.get(url, headers=_github_headers(), params=params, timeout=30)
    if r.status_code != 200:
        raise HTTPException(status_code=500, detail=f"GitHub list PRs failed: {r.status_code} {r.text}")
    items = r.json() if isinstance(r.json(), list) else []
    if not items:
        return None
    return items[0]


def _create_pr(owner: str, repo: str, head_branch: str, base_branch: str, title: str, body: str) -> Dict[str, Any]:
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls"
    payload = {"title": title, "head": head_branch, "base": base_branch, "body": body}
    r = requests.post(url, headers=_github_headers(), json=payload, timeout=30)
    if r.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail=f"GitHub create PR failed: {r.status_code} {r.text}")
    return r.json()


def _list_approvals(owner: str, repo: str, pr_number: int) -> Set[str]:
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/reviews"
    r = requests.get(url, headers=_github_headers(), timeout=30)
    if r.status_code != 200:
        raise HTTPException(status_code=500, detail=f"GitHub list reviews failed: {r.status_code} {r.text}")

    items = r.json() if isinstance(r.json(), list) else []
    latest_state_by_user: Dict[str, str] = {}
    for it in items:
        user = (it.get("user") or {}).get("login")
        state = str(it.get("state") or "").upper()
        if not user:
            continue
        latest_state_by_user[str(user)] = state

    approved: Set[str] = set()
    for user, state in latest_state_by_user.items():
        if state == "APPROVED":
            approved.add(user)
    return approved


def _merge_pr(owner: str, repo: str, pr_number: int) -> Dict[str, Any]:
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/merge"
    payload = {"merge_method": "merge"}
    r = requests.put(url, headers=_github_headers(), json=payload, timeout=30)
    if r.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail=f"GitHub merge PR failed: {r.status_code} {r.text}")
    return r.json() if isinstance(r.json(), dict) else {"merged": True}


@router.post("/apps/{appname}/pull_request/ensure", response_model=PullRequestStatus)
def ensure_pull_request(appname: str, env: Optional[str] = None):
    env_key = _require_env(env)
    head_branch = f"{env_key.upper()}_{appname}_update"
    base_branch = "main"

    repo_dir = _requests_repo_root()
    _ensure_branch_committed_and_pushed(repo_dir, head_branch=head_branch, base_branch=base_branch)

    if not _has_github_token():
        required = _read_required_approvers(appname)
        return PullRequestStatus(
            env=env_key,
            appname=appname,
            head_branch=head_branch,
            base_branch=base_branch,
            pr_number=None,
            pr_url="",
            required_approvers=required,
            approved_by=[],
            missing_approvers=required,
            merge_allowed=False,
        )

    repo_url = _get_requests_repo_url_from_config()
    owner, repo = _parse_github_owner_repo(repo_url)

    pr = _find_open_pr(owner, repo, head_branch, base_branch)
    if not pr:
        pr = _create_pr(
            owner,
            repo,
            head_branch,
            base_branch,
            title=f"{env_key.upper()} {appname} update",
            body=f"Automated update PR for {env_key.upper()}/{appname}.",
        )

    pr_number = int(pr.get("number")) if pr.get("number") else None
    pr_url = str(pr.get("html_url") or "")

    required = _read_required_approvers(appname)
    approved = sorted(_list_approvals(owner, repo, pr_number)) if pr_number else []
    approved_lower = {a.lower() for a in approved}
    missing = [r for r in required if r.lower() not in approved_lower]

    return PullRequestStatus(
        env=env_key,
        appname=appname,
        head_branch=head_branch,
        base_branch=base_branch,
        pr_number=pr_number,
        pr_url=pr_url,
        required_approvers=required,
        approved_by=approved,
        missing_approvers=missing,
        merge_allowed=(len(missing) == 0 and pr_number is not None),
    )


@router.get("/apps/{appname}/pull_request/status", response_model=PullRequestStatus)
def get_pull_request_status(appname: str, env: Optional[str] = None):
    env_key = _require_env(env)
    head_branch = f"{env_key.upper()}_{appname}_update"
    base_branch = "main"

    if not _has_github_token():
        required = _read_required_approvers(appname)
        return PullRequestStatus(
            env=env_key,
            appname=appname,
            head_branch=head_branch,
            base_branch=base_branch,
            pr_number=None,
            pr_url="",
            required_approvers=required,
            approved_by=[],
            missing_approvers=required,
            merge_allowed=False,
        )

    repo_url = _get_requests_repo_url_from_config()
    owner, repo = _parse_github_owner_repo(repo_url)

    pr = _find_open_pr(owner, repo, head_branch, base_branch)
    pr_number = int(pr.get("number")) if pr and pr.get("number") else None
    pr_url = str(pr.get("html_url") or "") if pr else ""

    required = _read_required_approvers(appname)
    approved = sorted(_list_approvals(owner, repo, pr_number)) if pr_number else []
    approved_lower = {a.lower() for a in approved}
    missing = [r for r in required if r.lower() not in approved_lower]

    return PullRequestStatus(
        env=env_key,
        appname=appname,
        head_branch=head_branch,
        base_branch=base_branch,
        pr_number=pr_number,
        pr_url=pr_url,
        required_approvers=required,
        approved_by=approved,
        missing_approvers=missing,
        merge_allowed=(len(missing) == 0 and pr_number is not None),
    )


@router.post("/apps/{appname}/pull_request/merge", response_model=PullRequestStatus)
def merge_pull_request(appname: str, env: Optional[str] = None):
    if not _has_github_token():
        raise HTTPException(status_code=400, detail="Missing GITHUB_TOKEN environment variable")
    status = get_pull_request_status(appname=appname, env=env)
    if not status.pr_number:
        raise HTTPException(status_code=404, detail="No open pull request found")
    if not status.merge_allowed:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Missing required approvals",
                "required_approvers": status.required_approvers,
                "approved_by": status.approved_by,
                "missing_approvers": status.missing_approvers,
            },
        )

    repo_url = _get_requests_repo_url_from_config()
    owner, repo = _parse_github_owner_repo(repo_url)
    _merge_pr(owner, repo, int(status.pr_number))
    return get_pull_request_status(appname=appname, env=env)


@router.get("/apps/{appname}/pull_requests")
def get_pull_requests(appname: str, env: Optional[str] = None):
    # Backward-compatible endpoint for existing UI/tests.
    status = get_pull_request_status(appname=appname, env=env)
    if not status.pr_number:
        return []
    return [
        {
            "appname": status.appname,
            "description": f"{status.head_branch} -> {status.base_branch}",
            "link": status.pr_url,
            "required_approvers": status.required_approvers,
            "approved_by": status.approved_by,
            "missing_approvers": status.missing_approvers,
            "merge_allowed": status.merge_allowed,
        }
    ]
