"""Unit tests for garmin_coaching.last_activity."""

from garmin_coaching.last_activity import _first_activity_from_page, summarize_last_activity


def test_summarize_last_activity_maps_garmin_fields():
    raw = {
        "activityId": 19876543210,
        "activityName": "Morning Run",
        "startTimeLocal": "2026-04-21 06:30:00",
        "activityType": {"typeKey": "running", "typeName": "Running"},
        "duration": 2400.0,
        "distance": 6200.0,
        "elevationGain": 45.0,
        "averageHR": 148.0,
        "maxHR": 172.0,
        "calories": 512.0,
        "activityTrainingLoad": 98.5,
    }
    out = summarize_last_activity(raw)
    assert out is not None
    assert out["activity_id"] == 19876543210
    assert out["name"] == "Morning Run"
    assert out["sport"] == "run"
    assert out["duration_min"] == 40.0
    assert out["distance_km"] == 6.2
    assert out["avg_hr"] == 148
    assert out["training_load"] == 98.5


def test_summarize_last_activity_returns_none_without_id():
    assert summarize_last_activity({"activityName": "Ghost"}) is None
    assert summarize_last_activity(None) is None


def test_first_activity_from_page_prefers_most_recent_index():
    act = {"activityId": 1, "activityName": "Latest"}
    assert _first_activity_from_page([act]) == act
    assert _first_activity_from_page({"activityList": [act]}) == act
