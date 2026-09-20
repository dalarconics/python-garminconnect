"""Supabase upsert helpers for daily coaching data."""

from __future__ import annotations

import os
from typing import Any

DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"


def get_supabase():
    from supabase import create_client

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
    return create_client(url, key)


def upsert_daily_payload(payload: dict[str, Any], user_id: str = DEFAULT_USER_ID) -> dict[str, str]:
    client = get_supabase()
    ds = payload["date"]
    readiness = payload.get("readiness") or {}
    training = payload.get("training_load") or {}
    session = payload.get("session") or {}

    client.table("readiness_daily").upsert(
        {
            "user_id": user_id,
            "readiness_date": ds,
            "zone": readiness.get("zone"),
            "score_ok": readiness.get("score_ok"),
            "sleep_h": readiness.get("sleep_h"),
            "sleep_score": readiness.get("sleep_score"),
            "hrv": readiness.get("hrv"),
            "stress": readiness.get("stress"),
            "bb_change": readiness.get("bb_change"),
            "hrv_status": readiness.get("hrv_status"),
            "thresholds": payload.get("thresholds"),
            "recommendation": readiness.get("recommendation"),
            "payload": readiness,
        },
        on_conflict="user_id,readiness_date",
    ).execute()

    client.table("training_load").upsert(
        {
            "user_id": user_id,
            "load_date": ds,
            "status_phrase": training.get("status_phrase"),
            "acwr": training.get("acwr"),
            "vo2max": training.get("vo2max"),
            "lthr": training.get("lthr"),
            "payload": training,
        },
        on_conflict="user_id,load_date",
    ).execute()

    client.table("daily_snapshots").upsert(
        {
            "user_id": user_id,
            "snapshot_date": ds,
            "payload": payload,
            "health_score": None,
        },
        on_conflict="user_id,snapshot_date",
    ).execute()

    client.table("session_log").upsert(
        {
            "user_id": user_id,
            "session_date": ds,
            "planned": session,
            "executed": None,
            "confirmed": False,
        },
        on_conflict="user_id,session_date",
    ).execute()

    return {"status": "ok", "date": ds}
