"""Tests for T-0017: collector privacy, warning logging, restore traceability, and SemVer 0.3.1.

Verifies:
- DEC-004: Workflow payload sanitization (only upsert, tokens_persisted, source; no health metrics, activity, or guards).
- REQ-005: login_client logs warnings on exceptions instead of silent pass.
- Restore source traceability (supabase | b64_fallback).
- scripts/deploy_web_vercel.sh prebuilt configuration for Root Directory = apps/web.
- SemVer 0.3.1 consistency in apps/web package.json, package-lock.json, and CHANGELOG.md.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from unittest.mock import MagicMock, patch
import yaml


REPO_ROOT = Path(__file__).resolve().parents[1]


def test_workflow_coaching_daily_collect_privacy_and_source(monkeypatch):
    """Test that coaching-daily-collect.yml conforms to DEC-004 privacy rules."""
    wf_path = REPO_ROOT / ".github/workflows/coaching-daily-collect.yml"
    assert wf_path.is_file()
    wf_text = wf_path.read_text(encoding="utf-8")
    data = yaml.safe_load(wf_text)

    steps = data["jobs"]["collect"]["steps"]
    step_dict = {s.get("name"): s for s in steps}

    # 1. Restore step records source
    restore_step = step_dict.get("Restore Garmin tokens")
    assert restore_step is not None
    restore_run = restore_step.get("run", "")
    assert "RESTORE_SOURCE" in restore_run
    assert "Token restore source:" in restore_run
    assert "b64_fallback" in restore_run
    assert "supabase" in restore_run

    # 2. Collect step sanitization (DEC-004)
    collect_step = step_dict.get("Collect and upsert to Supabase")
    assert collect_step is not None
    collect_run = collect_step.get("run", "")

    # Ensure prohibited fields are NOT printed
    assert "readiness" not in collect_run or "readiness" not in collect_run.split("print")[1]
    assert '"zone"' not in collect_run
    assert '"acwr"' not in collect_run
    assert '"guards"' not in collect_run
    assert '"last_activity"' not in collect_run
    assert "last_activity" not in collect_run

    # Ensure required technical fields ARE present in the printed JSON
    assert '"upsert"' in collect_run
    assert '"tokens_persisted"' in collect_run
    assert '"source"' in collect_run


def test_collector_tree_no_leak_of_health_metrics_or_activities():
    """Verify no print statements in garmin_coaching, services/collector, or scripts/garmin_auth."""
    scan_targets = [
        REPO_ROOT / "garmin_coaching",
        REPO_ROOT / "services/collector",
        REPO_ROOT / "scripts/garmin_auth.py",
    ]
    for target in scan_targets:
        if target.is_file():
            files = [target]
        else:
            files = list(target.rglob("*.py"))

        for py_file in files:
            content = py_file.read_text(encoding="utf-8")
            # print( should not be used in collector or library modules
            assert "print(" not in content, f"Found print statement in {py_file}"


def test_restore_tokens_from_supabase_records_restore_source(tmp_path, monkeypatch):
    """Test that restore_tokens_from_supabase sets RESTORE_SOURCE in os.environ."""
    monkeypatch.delenv("RESTORE_SOURCE", raising=False)
    store_dir = tmp_path.resolve() / "tokens"

    tokens = {
        "di_token": "valid_token",
        "di_refresh_token": "valid_refresh",
        "di_client_id": "cid",
    }

    with patch(
        "services.collector.supabase_client.get_garmin_tokens_from_supabase",
        return_value=tokens,
    ):
        from scripts.garmin_auth import restore_tokens_from_supabase
        success = restore_tokens_from_supabase(dest_store=str(store_dir))

    assert success is True
    assert os.environ.get("RESTORE_SOURCE") == "supabase"


def test_login_client_logs_warning_on_token_login_failure(tmp_path):
    """Verify that exceptions in login_client are logged with _LOGGER.warning (REQ-005)."""
    store_dir = tmp_path.resolve() / "tokens"
    token_file = store_dir / "garmin_tokens.json"
    token_file.parent.mkdir(parents=True, exist_ok=True)
    token_file.write_text("{}", encoding="utf-8")

    mock_client = MagicMock()
    mock_client.login.side_effect = Exception("Token expired")

    mock_cred_client = MagicMock()
    mock_cred_client.login.return_value = (None, None)

    with (
        patch("scripts.garmin_auth.tokenstore_path", return_value=str(store_dir)),
        patch("scripts.garmin_auth.restore_tokens_from_supabase", return_value=False),
        patch("scripts.garmin_auth.persist_tokens_to_supabase", return_value=True),
        patch("scripts.garmin_auth.Garmin", side_effect=[mock_client, mock_cred_client]),
        patch("scripts.garmin_auth.get_credentials", return_value=("test@example.com", "secret")),
        patch("scripts.garmin_auth._LOGGER.warning") as mock_warning,
    ):
        from scripts.garmin_auth import login_client
        client = login_client(prompt=False)

    assert client is mock_cred_client
    # Must have logged at least one warning about login failure
    assert mock_warning.call_count >= 1
    warning_messages = [call.args[0] for call in mock_warning.call_args_list]
    assert any("Could not login with stored tokens" in msg for msg in warning_messages)


def test_login_client_logs_warning_on_persist_failure(tmp_path):
    """Verify that exceptions during token persist inside login_client are logged with _LOGGER.warning."""
    store_dir = tmp_path.resolve() / "tokens"
    token_file = store_dir / "garmin_tokens.json"
    token_file.parent.mkdir(parents=True, exist_ok=True)
    token_file.write_text("{}", encoding="utf-8")

    mock_client = MagicMock()
    mock_client.login.return_value = (None, None)

    with (
        patch("scripts.garmin_auth.tokenstore_path", return_value=str(store_dir)),
        patch("scripts.garmin_auth.restore_tokens_from_supabase", return_value=True),
        patch("scripts.garmin_auth.persist_tokens_to_supabase", side_effect=RuntimeError("Supabase connection down")),
        patch("scripts.garmin_auth.Garmin", return_value=mock_client),
        patch("scripts.garmin_auth._LOGGER.warning") as mock_warning,
    ):
        from scripts.garmin_auth import login_client
        client = login_client(prompt=False)

    assert client is mock_client
    assert mock_warning.call_count == 1
    assert "Could not persist tokens after login" in mock_warning.call_args[0][0]


def test_deploy_web_vercel_script_configured_for_root_directory():
    """Verify deploy_web_vercel.sh handles Root Directory = apps/web via prebuilt deploy."""
    deploy_script = REPO_ROOT / "scripts/deploy_web_vercel.sh"
    assert deploy_script.is_file()
    assert os.access(deploy_script, os.X_OK)

    content = deploy_script.read_text(encoding="utf-8")
    assert "cd \"$ROOT/apps/web\"" in content
    assert "build --prod" in content
    assert "deploy --prebuilt --prod --yes" in content


def test_semver_031_package_json_and_changelog():
    """Verify SemVer 0.3.1 bump in package.json, package-lock.json, and CHANGELOG.md (ADR-009)."""
    pkg_path = REPO_ROOT / "apps/web/package.json"
    lock_path = REPO_ROOT / "apps/web/package-lock.json"
    changelog_path = REPO_ROOT / "apps/web/CHANGELOG.md"

    pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
    assert pkg["version"] == "0.3.1"

    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    assert lock["version"] == "0.3.1"
    if "packages" in lock and "" in lock["packages"]:
        assert lock["packages"][""]["version"] == "0.3.1"

    changelog = changelog_path.read_text(encoding="utf-8")
    assert "## [0.3.1]" in changelog
    assert "DEC-004" in changelog
    assert "REQ-005" in changelog
