"""Build unified daily coaching payload from Garmin API."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from garmin_coaching.guards import apply_guards
from garmin_coaching.last_activity import fetch_last_activity
from garmin_coaching.macrocycle import active_phase, milestones_as_dict, phase_as_dict
from garmin_coaching.mesocycle import plan_week
from garmin_coaching.messages import format_whatsapp_message
from garmin_coaching.readiness import (
    DEFAULT_THRESHOLDS,
    build_daily_plan,
    classify,
    derive_thresholds_from_history,
)
from garmin_coaching.session_planner import plan_session
from garmin_coaching.weekly_sync import build_weekly_sport_rows


def day_metrics(client: Any, ds: str) -> dict[str, Any]:
    st = client.get_stress_data(ds)
    sl = client.get_sleep_data(ds)
    h = client.get_hrv_data(ds)

    dsd = sl.get("dailySleepDTO") or {}
    sh = dsd.get("sleepTimeSeconds")
    sleep_h = (sh / 3600.0) if isinstance(sh, (int, float)) else None
    sleep_score = ((dsd.get("sleepScores") or {}).get("overall") or {}).get("value")
    hrv = sl.get("avgOvernightHrv")
    stress = st.get("avgStressLevel")
    bb_change = sl.get("bodyBatteryChange")
    hrv_status = ((h or {}).get("hrvSummary") or {}).get("status")

    return {
        "date": ds,
        "sleep_h": sleep_h,
        "sleep_score": sleep_score,
        "hrv": hrv,
        "stress": stress,
        "bb_change": bb_change,
        "hrv_status": hrv_status,
    }


def get_sleep_bb_for_day(client: Any, ds: str) -> dict[str, Any]:
    sl = client.get_sleep_data(ds)
    st = client.get_stress_data(ds)
    bb = client.get_body_battery(ds)

    dsd = sl.get("dailySleepDTO") or {}
    sh = dsd.get("sleepTimeSeconds")
    sleep_h = (sh / 3600.0) if isinstance(sh, (int, float)) else None
    sleep_score = ((dsd.get("sleepScores") or {}).get("overall") or {}).get("value")
    bb_change = sl.get("bodyBatteryChange")

    bb_current = None
    if isinstance(bb, list) and bb:
        vals = bb[0].get("bodyBatteryValuesArray") or []
        if vals and isinstance(vals[-1], (list, tuple)) and len(vals[-1]) >= 3:
            bb_current = vals[-1][2]

    return {
        "date": ds,
        "sleep_hours": round(sleep_h, 2) if sleep_h is not None else None,
        "sleep_score": sleep_score,
        "sleep_stress_avg": dsd.get("avgSleepStress"),
        "body_battery_change": bb_change,
        "body_battery_current": bb_current,
        "stress_day_avg": st.get("avgStressLevel"),
    }


def _first_device_entry(data: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(data, dict):
        return None
    latest = data.get("latestTrainingStatusData") or data.get(
        "metricsTrainingLoadBalanceDTOMap"
    )
    if isinstance(latest, dict) and latest:
        return next(iter(latest.values()))
    return None


def fetch_training_load(client: Any, cdate: str | None = None) -> dict[str, Any]:
    ds = cdate or date.today().isoformat()
    out: dict[str, Any] = {}
    try:
        status = client.get_training_status(ds)
        if isinstance(status, dict):
            device = _first_device_entry(status.get("mostRecentTrainingStatus"))
            if device:
                phrase = device.get("trainingStatusFeedbackPhrase") or ""
                out["status_phrase"] = phrase.split("_")[0] if phrase else None
                acute = device.get("acuteTrainingLoadDTO") or {}
                out["acwr"] = acute.get("dailyAcuteChronicWorkloadRatio")
                out["acwr_status"] = acute.get("acwrStatus")
                out["acute_load"] = acute.get("dailyTrainingLoadAcute")
                out["chronic_load"] = acute.get("dailyTrainingLoadChronic")
            vo2_block = status.get("mostRecentVO2Max") or {}
            generic = vo2_block.get("generic") or {}
            cycling = vo2_block.get("cycling") or {}
            out["vo2max"] = generic.get("vo2MaxPreciseValue") or generic.get(
                "vo2MaxValue"
            )
            out["vo2max_cycling"] = cycling.get("vo2MaxPreciseValue") or cycling.get(
                "vo2MaxValue"
            )
            out["load_balance"] = status.get("mostRecentTrainingLoadBalance")
            out["raw"] = status
    except Exception as exc:
        out["status_error"] = str(exc)

    try:
        lthr = client.get_lactate_threshold(latest=True)
        if isinstance(lthr, dict):
            out["lthr"] = lthr
    except Exception as exc:
        out["lthr_error"] = str(exc)

    ftp_raw: Any = None
    try:
        if hasattr(client, "get_cycling_ftp"):
            ftp_raw = client.get_cycling_ftp()
    except Exception as exc:
        out["ftp_error"] = str(exc)

    ftp_entry: dict[str, Any] = {}
    if isinstance(ftp_raw, list) and ftp_raw and isinstance(ftp_raw[0], dict):
        ftp_entry = ftp_raw[0]
    elif isinstance(ftp_raw, dict):
        ftp_entry = ftp_raw

    ftp_val = (
        ftp_entry.get("functionalThresholdPower")
        if ftp_entry.get("functionalThresholdPower") is not None
        else ftp_entry.get("ftp")
        if ftp_entry.get("ftp") is not None
        else ftp_entry.get("value")
    )
    w_kg_val = (
        ftp_entry.get("powerToWeight")
        if ftp_entry.get("powerToWeight") is not None
        else ftp_entry.get("wPerKg")
        if ftp_entry.get("wPerKg") is not None
        else ftp_entry.get("w_per_kg")
    )

    lthr_dict = out.get("lthr") if isinstance(out.get("lthr"), dict) else {}
    shr = (
        lthr_dict.get("speed_and_heart_rate")
        if isinstance(lthr_dict.get("speed_and_heart_rate"), dict)
        else {}
    )
    lthr_cycling_val = (
        shr.get("heartRateCycling")
        if shr.get("heartRateCycling") is not None
        else lthr_dict.get("heartRateCycling")
        if lthr_dict.get("heartRateCycling") is not None
        else lthr_dict.get("cyclingHeartRate")
    )

    vo2_cyc = out.get("vo2max_cycling")

    out["cycling_power"] = {
        "ftp_watts": round(float(ftp_val))
        if isinstance(ftp_val, (int, float)) and ftp_val > 0
        else None,
        "w_per_kg": round(float(w_kg_val), 2)
        if isinstance(w_kg_val, (int, float)) and w_kg_val > 0
        else None,
        "vo2max_cycling": round(float(vo2_cyc), 1)
        if isinstance(vo2_cyc, (int, float)) and vo2_cyc > 0
        else None,
        "lthr_cycling": round(float(lthr_cycling_val))
        if isinstance(lthr_cycling_val, (int, float)) and lthr_cycling_val > 0
        else None,
    }

    return out


def collect_recent_metrics(client: Any, days: int) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for i in range(days, 0, -1):
        ds = (date.today() - timedelta(days=i)).isoformat()
        try:
            rows.append(day_metrics(client, ds))
        except Exception:  # noqa: S112 - best effort: a day without Garmin data is skipped
            continue
    return rows


def build_daily_payload(
    client: Any,
    target_day: str | None = None,
    auto_thresholds: bool = True,
    auto_days: int = 60,
) -> dict[str, Any]:
    on_day = date.fromisoformat(target_day) if target_day else date.today()
    ds = on_day.isoformat()

    th = dict(DEFAULT_THRESHOLDS)
    if auto_thresholds:
        metrics = collect_recent_metrics(client, max(7, auto_days))
        th = derive_thresholds_from_history(metrics, th)

    readiness_raw = None
    for candidate in [ds, (on_day - timedelta(days=1)).isoformat()]:
        try:
            m = day_metrics(client, candidate)
            zone, score_ok, rec = classify(m, th)
            m.update({"score_ok": score_ok, "zone": zone, "recommendation": rec})
            readiness_raw = m
            break
        except Exception:  # noqa: S112 - best effort: a day without Garmin data is skipped
            continue

    sleep_bb = None
    for candidate in [ds, (on_day - timedelta(days=1)).isoformat()]:
        try:
            sleep_bb = get_sleep_bb_for_day(client, candidate)
            break
        except Exception:  # noqa: S112 - best effort: a day without Garmin data is skipped
            continue

    phase = active_phase(on_day)
    training_load = fetch_training_load(client, ds)
    session = plan_session(readiness_raw, on_day, phase)
    session = apply_guards(readiness_raw or {}, training_load, session)
    daily_plan = build_daily_plan(readiness_raw)

    mesocycle_week = plan_week(on_day)
    weekly_sport_load = build_weekly_sport_rows(
        client, through=on_day, lookback_days=120
    )
    last_activity = fetch_last_activity(client)

    return {
        "date": ds,
        "mesocycle_week": mesocycle_week,
        "weekly_sport_load": weekly_sport_load,
        "readiness": readiness_raw,
        "sleep_body_battery": sleep_bb,
        "thresholds": th,
        "daily_plan": daily_plan,
        "macrocycle": phase_as_dict(phase),
        "milestones": milestones_as_dict(on_day),
        "training_load": training_load,
        "last_activity": last_activity,
        "session": session,
        "whatsapp_message": format_whatsapp_message(
            {
                "date": ds,
                "readiness": readiness_raw,
                "session": session,
                "macrocycle": phase_as_dict(phase),
                "milestones": milestones_as_dict(on_day),
                "training_load": training_load,
            }
        ),
    }
