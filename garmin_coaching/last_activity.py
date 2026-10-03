"""Compact summary of the most recent Garmin activity for dashboard payloads."""

from __future__ import annotations

from typing import Any

from garmin_coaching.activity_load import _type_key, activity_duration_min, classify_sport


def summarize_last_activity(raw: dict[str, Any] | None) -> dict[str, Any] | None:
    if not raw or not isinstance(raw, dict):
        return None
    activity_id = raw.get("activityId")
    if activity_id is None:
        return None

    type_key = _type_key(raw)
    at = raw.get("activityType")
    type_label = None
    if isinstance(at, dict):
        type_label = at.get("typeName") or at.get("typeKey")

    distance_m = raw.get("distance")
    distance_km = None
    if isinstance(distance_m, (int, float)) and distance_m > 0:
        distance_km = round(float(distance_m) / 1000.0, 2)

    duration_min = round(activity_duration_min(raw), 1)
    if duration_min <= 0:
        duration_min = None

    avg_hr = raw.get("averageHR")
    max_hr = raw.get("maxHR")
    training_load = raw.get("activityTrainingLoad")

    return {
        "activity_id": int(activity_id),
        "name": raw.get("activityName") or "Actividad",
        "sport": classify_sport(raw),
        "type_key": type_key or None,
        "type_label": type_label,
        "start_time_local": raw.get("startTimeLocal"),
        "start_time_gmt": raw.get("startTimeGMT"),
        "duration_min": duration_min,
        "distance_km": distance_km,
        "elevation_gain_m": raw.get("elevationGain"),
        "avg_hr": int(avg_hr) if isinstance(avg_hr, (int, float)) else None,
        "max_hr": int(max_hr) if isinstance(max_hr, (int, float)) else None,
        "calories": int(raw["calories"]) if isinstance(raw.get("calories"), (int, float)) else None,
        "training_load": round(float(training_load), 1)
        if isinstance(training_load, (int, float))
        else None,
    }


def fetch_last_activity(client: Any) -> dict[str, Any] | None:
    try:
        raw = client.get_last_activity()
    except Exception:
        return None
    return summarize_last_activity(raw if isinstance(raw, dict) else None)
