#!/usr/bin/env python3
"""Daily readiness report based on Garmin sleep, stress, HRV and Body Battery.

Usage:
  ./.venv/bin/python scripts/readiness_daily.py
  ./.venv/bin/python scripts/readiness_daily.py --days 14 --json
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

# Ensure repository root and scripts dir are importable when running directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from garmin_auth import login_client
from garminconnect import Garmin


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Garmin daily readiness report")
    parser.add_argument("--days", type=int, default=14, help="Days to include in history")
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print raw JSON output instead of human summary",
    )
    parser.add_argument("--sleep-hours", type=float, default=7.5, help="Sleep hours threshold")
    parser.add_argument("--sleep-score", type=float, default=84, help="Sleep score threshold")
    parser.add_argument("--hrv", type=float, default=45, help="Overnight HRV threshold")
    parser.add_argument("--stress-max", type=float, default=27, help="Max average stress threshold")
    parser.add_argument(
        "--bb-change",
        type=float,
        default=61,
        help="Body Battery overnight change threshold",
    )
    parser.add_argument(
        "--short",
        action="store_true",
        help="Print one-line semaphore summary",
    )
    parser.add_argument(
        "--save-history",
        action="store_true",
        help="Append today's readiness snapshot to CSV and JSONL history files",
    )
    parser.add_argument(
        "--history-dir",
        default=".readiness_history",
        help="Directory used for history files",
    )
    parser.add_argument(
        "--auto-thresholds",
        action="store_true",
        help="Compute thresholds from recent personal medians",
    )
    parser.add_argument(
        "--auto-days",
        type=int,
        default=60,
        help="Days used to compute automatic thresholds",
    )
    parser.add_argument(
        "--plan",
        action="store_true",
        help="Print daily training plan based on current readiness zone",
    )
    return parser.parse_args()


def get_client() -> Garmin:
    return login_client()


def get_sleep_bb_for_day(client: Garmin, ds: str) -> dict[str, Any]:
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


def day_metrics(client: Garmin, ds: str) -> dict[str, Any]:
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


def classify(m: dict[str, Any], th: dict[str, float]) -> tuple[str, int, str]:
    checks = [
        m["sleep_h"] is not None and m["sleep_h"] >= th["sleep_h"],
        m["sleep_score"] is not None and m["sleep_score"] >= th["sleep_score"],
        m["hrv"] is not None and m["hrv"] >= th["hrv"],
        m["stress"] is not None and m["stress"] <= th["stress_max"],
        m["bb_change"] is not None and m["bb_change"] >= th["bb_change"],
    ]
    score_ok = sum(checks)

    red_flag = m["hrv_status"] == "UNBALANCED" and (m["sleep_h"] or 0) < th["sleep_h"]

    if red_flag or score_ok <= 2:
        return "ROJO", score_ok, "Solo recuperacion/Z1-Z2 30-60 min o descanso."
    if score_ok == 3:
        return "AMARILLO", score_ok, "Mantener entrenamiento pero recortar 15-25% o bajar intensidad."
    return "VERDE", score_ok, "Apto para calidad (tempo/VO2) o fondo >2h segun agenda."


def collect_recent_metrics(client: Garmin, days: int) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for i in range(days, 0, -1):
        ds = (date.today() - timedelta(days=i)).isoformat()
        try:
            rows.append(day_metrics(client, ds))
        except Exception:
            continue
    return rows


def _median_numeric(values: list[Any]) -> float | None:
    nums = [float(v) for v in values if isinstance(v, (int, float))]
    if not nums:
        return None
    nums_sorted = sorted(nums)
    mid = len(nums_sorted) // 2
    if len(nums_sorted) % 2:
        return nums_sorted[mid]
    return (nums_sorted[mid - 1] + nums_sorted[mid]) / 2.0


def derive_thresholds_from_history(metrics: list[dict[str, Any]], base: dict[str, float]) -> dict[str, float]:
    if not metrics:
        return base

    sleep_h = _median_numeric([m.get("sleep_h") for m in metrics])
    sleep_score = _median_numeric([m.get("sleep_score") for m in metrics])
    hrv = _median_numeric([m.get("hrv") for m in metrics])
    stress = _median_numeric([m.get("stress") for m in metrics])
    bb_change = _median_numeric([m.get("bb_change") for m in metrics])

    auto = dict(base)
    if sleep_h is not None:
        auto["sleep_h"] = round(sleep_h, 2)
    if sleep_score is not None:
        auto["sleep_score"] = round(sleep_score, 1)
    if hrv is not None:
        auto["hrv"] = round(hrv, 1)
    if stress is not None:
        auto["stress_max"] = round(stress, 1)
    if bb_change is not None:
        auto["bb_change"] = round(bb_change, 1)
    return auto


def build_summary(client: Garmin, days: int, th: dict[str, float]) -> dict[str, Any]:
    sleep_bb_today = None
    for ds in [date.today().isoformat(), (date.today() - timedelta(days=1)).isoformat()]:
        try:
            sleep_bb_today = get_sleep_bb_for_day(client, ds)
            break
        except Exception:
            continue

    rows: list[dict[str, Any]] = []
    for i in range(days, 0, -1):
        ds = (date.today() - timedelta(days=i)).isoformat()
        try:
            m = day_metrics(client, ds)
            zone, n, rec = classify(m, th)
            m.update({"score_ok": n, "zone": zone, "recommendation": rec})
            rows.append(m)
        except Exception:
            continue

    today_readiness = None
    for ds in [date.today().isoformat(), (date.today() - timedelta(days=1)).isoformat()]:
        try:
            m = day_metrics(client, ds)
            zone, n, rec = classify(m, th)
            m.update({"score_ok": n, "zone": zone, "recommendation": rec})
            today_readiness = m
            break
        except Exception:
            continue

    return {
        "counts": {
            "VERDE": sum(1 for r in rows if r["zone"] == "VERDE"),
            "AMARILLO": sum(1 for r in rows if r["zone"] == "AMARILLO"),
            "ROJO": sum(1 for r in rows if r["zone"] == "ROJO"),
        },
        "today_sleep_body_battery": sleep_bb_today,
        "today_readiness": today_readiness,
        "rows_last_nd": rows,
        "thresholds": th,
    }


def build_daily_plan(today_readiness: dict[str, Any] | None) -> dict[str, Any]:
    if not today_readiness:
        return {
            "zone": None,
            "session": "No data",
            "details": ["No readiness data available for today."],
        }

    zone = today_readiness.get("zone")
    if zone == "VERDE":
        return {
            "zone": zone,
            "session": "Calidad",
            "details": [
                "Option A Tempo: 3x10 min @ tempo, 3 min recoveries.",
                "Option B VO2: 5x3 min hard, 3 min recoveries.",
                "If schedule allows: long ride >2h in Z2.",
            ],
        }
    if zone == "AMARILLO":
        return {
            "zone": zone,
            "session": "Carga ajustada",
            "details": [
                "Keep planned session but cut volume 15-25%.",
                "Prefer tempo over VO2.",
                "Cap total duration at 60-90 min.",
            ],
        }
    return {
        "zone": zone,
        "session": "Recuperacion",
        "details": [
            "Z1-Z2 30-60 min easy or full rest.",
            "Prioritize sleep and hydration.",
            "Re-evaluate tomorrow before quality work.",
        ],
    }


def save_history(summary: dict[str, Any], history_dir: str) -> tuple[str, str]:
    root = Path(history_dir)
    root.mkdir(parents=True, exist_ok=True)
    jsonl_path = root / "readiness_history.jsonl"
    csv_path = root / "readiness_history.csv"

    tsb = summary.get("today_sleep_body_battery") or {}
    tr = summary.get("today_readiness") or {}
    counts = summary.get("counts") or {}
    th = summary.get("thresholds") or {}

    row = {
        "saved_at": datetime.now().isoformat(timespec="seconds"),
        "date": tr.get("date") or tsb.get("date"),
        "zone": tr.get("zone"),
        "score_ok": tr.get("score_ok"),
        "sleep_h": tr.get("sleep_h"),
        "sleep_score": tr.get("sleep_score"),
        "hrv": tr.get("hrv"),
        "stress": tr.get("stress"),
        "bb_change": tr.get("bb_change"),
        "hrv_status": tr.get("hrv_status"),
        "bb_current": tsb.get("body_battery_current"),
        "count_verde": counts.get("VERDE", 0),
        "count_amarillo": counts.get("AMARILLO", 0),
        "count_rojo": counts.get("ROJO", 0),
        "th_sleep_h": th.get("sleep_h"),
        "th_sleep_score": th.get("sleep_score"),
        "th_hrv": th.get("hrv"),
        "th_stress_max": th.get("stress_max"),
        "th_bb_change": th.get("bb_change"),
    }

    with jsonl_path.open("a", encoding="utf-8") as jf:
        jf.write(json.dumps(row, ensure_ascii=False) + "\n")

    write_header = not csv_path.exists()
    with csv_path.open("a", encoding="utf-8", newline="") as cf:
        writer = csv.DictWriter(cf, fieldnames=list(row.keys()))
        if write_header:
            writer.writeheader()
        writer.writerow(row)

    return str(jsonl_path), str(csv_path)


def print_human(summary: dict[str, Any]) -> None:
    tsb = summary.get("today_sleep_body_battery") or {}
    tr = summary.get("today_readiness") or {}
    c = summary.get("counts") or {}

    print("Resultado de sueno + Body Battery (hoy)")
    print(f"- Fecha: {tsb.get('date')}")
    print(f"- Sueno (h): {tsb.get('sleep_hours')}")
    print(f"- Sleep score: {tsb.get('sleep_score')}")
    print(f"- Sleep stress avg: {tsb.get('sleep_stress_avg')}")
    print(f"- Body Battery change: {tsb.get('body_battery_change')}")
    print(f"- Body Battery actual: {tsb.get('body_battery_current')}")
    print(f"- Stress dia avg: {tsb.get('stress_day_avg')}")

    print("\nReadiness de hoy")
    print(f"- Zona: {tr.get('zone')} ({tr.get('score_ok')}/5)")
    print(f"- Recomendacion: {tr.get('recommendation')}")

    print("\nConteo periodo")
    print(f"- VERDE: {c.get('VERDE', 0)}")
    print(f"- AMARILLO: {c.get('AMARILLO', 0)}")
    print(f"- ROJO: {c.get('ROJO', 0)}")


def print_short(summary: dict[str, Any]) -> None:
    tsb = summary.get("today_sleep_body_battery") or {}
    tr = summary.get("today_readiness") or {}
    print(
        f"{tr.get('date')} | {tr.get('zone')} ({tr.get('score_ok')}/5)"
        f" | sleep={tsb.get('sleep_hours')}h score={tsb.get('sleep_score')}"
        f" | bb+={tsb.get('body_battery_change')}"
        f" | {tr.get('recommendation')}"
    )


def print_plan(summary: dict[str, Any]) -> None:
    plan = summary.get("daily_plan") or {}
    print("\nPlan diario")
    print(f"- Zona: {plan.get('zone')}")
    print(f"- Tipo: {plan.get('session')}")
    for step in plan.get("details") or []:
        print(f"- {step}")


def main() -> None:
    args = parse_args()
    base_th = {
        "sleep_h": float(args.sleep_hours),
        "sleep_score": float(args.sleep_score),
        "hrv": float(args.hrv),
        "stress_max": float(args.stress_max),
        "bb_change": float(args.bb_change),
    }

    client = get_client()
    th = dict(base_th)
    if args.auto_thresholds:
        metrics = collect_recent_metrics(client, max(7, int(args.auto_days)))
        th = derive_thresholds_from_history(metrics, base_th)

    summary = build_summary(client, args.days, th)
    summary["daily_plan"] = build_daily_plan(summary.get("today_readiness"))

    if args.save_history:
        jsonl_path, csv_path = save_history(summary, args.history_dir)
        summary["history_files"] = {"jsonl": jsonl_path, "csv": csv_path}

    if args.json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    elif args.short:
        print_short(summary)
    else:
        print_human(summary)
        if args.plan:
            print_plan(summary)

    if args.save_history and not args.json:
        files = summary.get("history_files") or {}
        print("\nHistorial guardado")
        print(f"- JSONL: {files.get('jsonl')}")
        print(f"- CSV: {files.get('csv')}")


if __name__ == "__main__":
    main()
