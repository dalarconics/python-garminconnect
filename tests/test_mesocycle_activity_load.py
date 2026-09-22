from datetime import date, timedelta

from garmin_coaching.activity_load import aggregate_activities_by_week, classify_sport
from garmin_coaching.mesocycle import MESOCYCLE_ANCHOR, plan_week, week_meta


def test_classify_sport_running():
    assert classify_sport({"activityType": {"typeKey": "running"}}) == "run"


def test_aggregate_by_week_monday_bucket():
    activities = [
        {
            "startTimeLocal": "2026-09-22 07:00:00",
            "activityType": {"typeKey": "running"},
            "movingDuration": 3600,
        },
        {
            "startTimeLocal": "2026-09-24 07:00:00",
            "activityType": {"typeKey": "cycling"},
            "duration": 1800,
        },
    ]
    by_week = aggregate_activities_by_week(activities)
    ws = date(2026, 9, 21)
    assert ws in by_week
    assert by_week[ws]["run"] == 60.0
    assert by_week[ws]["bike"] == 30.0


def test_mesocycle_monday_recovery_in_plan():
    ws = MESOCYCLE_ANCHOR
    plan = plan_week(ws)
    monday = plan["daily"][0]
    assert monday["date"] == ws.isoformat()
    assert monday["sports"]["walk"] == 30
    assert monday["sports"]["run"] == 0


def test_week_in_block_recovery_every_fourth():
    meta = week_meta(MESOCYCLE_ANCHOR + timedelta(days=21))
    assert meta.week_in_block == 3
    assert meta.kind == "recovery"
