"""Unit tests for garmin_coaching.last_activity and cycling power in collector."""

from garmin_coaching.collector import fetch_training_load
from garmin_coaching.last_activity import (
    _first_activity_from_page,
    summarize_last_activity,
)


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
    assert out["avg_power"] is None
    assert out["max_power"] is None
    assert out["norm_power"] is None
    assert out["intensity_factor"] is None
    assert out["training_stress_score"] is None
    assert out["avg_cadence"] is None


def test_summarize_last_activity_maps_cycling_power_fields():
    raw = {
        "activityId": 20261025001,
        "activityName": "Subida a Patios",
        "startTimeLocal": "2026-10-25 06:00:00",
        "activityType": {"typeKey": "road_biking", "typeName": "Road Cycling"},
        "duration": 3600.0,
        "distance": 24500.0,
        "elevationGain": 420.0,
        "averageHR": 154.0,
        "maxHR": 178.0,
        "calories": 680.0,
        "activityTrainingLoad": 112.4,
        "avgPower": 198.4,
        "maxPower": 485.0,
        "normPower": 212.6,
        "intensityFactor": 0.854,
        "trainingStressScore": 73.2,
        "averageBikingCadenceInRevPerMinute": 81.7,
    }
    out = summarize_last_activity(raw)
    assert out is not None
    assert out["sport"] == "bike"
    assert out["avg_power"] == 198
    assert out["max_power"] == 485
    assert out["norm_power"] == 213
    assert out["intensity_factor"] == 0.85
    assert out["training_stress_score"] == 73.2
    assert out["avg_cadence"] == 82


def test_summarize_last_activity_returns_none_without_id():
    assert summarize_last_activity({"activityName": "Ghost"}) is None
    assert summarize_last_activity(None) is None


def test_first_activity_from_page_prefers_most_recent_index():
    act = {"activityId": 1, "activityName": "Latest"}
    assert _first_activity_from_page([act]) == act
    assert _first_activity_from_page({"activityList": [act]}) == act


def test_fetch_training_load_consolidates_cycling_power():
    class FakeGarminClient:
        def get_training_status(self, cdate: str):
            return {
                "mostRecentTrainingStatus": {
                    "latestTrainingStatusData": {
                        "1": {
                            "trainingStatusFeedbackPhrase": "PRODUCTIVE_2",
                            "acuteTrainingLoadDTO": {
                                "dailyAcuteChronicWorkloadRatio": 1.1,
                                "acwrStatus": "OPTIMAL",
                                "dailyTrainingLoadAcute": 420,
                                "dailyTrainingLoadChronic": 380,
                            },
                        }
                    }
                },
                "mostRecentVO2Max": {
                    "generic": {"vo2MaxPreciseValue": 44.2},
                    "cycling": {"vo2MaxPreciseValue": 46.8},
                },
            }

        def get_lactate_threshold(self, latest: bool = True):
            return {
                "speed_and_heart_rate": {
                    "heartRate": 168,
                    "heartRateCycling": 162,
                }
            }

        def get_cycling_ftp(self):
            return [{"functionalThresholdPower": 238, "powerToWeight": 3.31}]

    load = fetch_training_load(FakeGarminClient(), "2026-10-25")
    assert load["vo2max"] == 44.2
    assert load["vo2max_cycling"] == 46.8
    assert "cycling_power" in load
    cp = load["cycling_power"]
    assert cp["ftp_watts"] == 238
    assert cp["w_per_kg"] == 3.31
    assert cp["vo2max_cycling"] == 46.8
    assert cp["lthr_cycling"] == 162
