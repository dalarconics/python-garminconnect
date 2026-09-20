"""Unit tests for garmin_coaching guards and macrocycle."""

from __future__ import annotations

from datetime import date

from garmin_coaching.guards import apply_guards
from garmin_coaching.macrocycle import active_phase, days_to_milestones
from garmin_coaching.readiness import classify, DEFAULT_THRESHOLDS


def test_classify_rojo():
    m = {"sleep_h": 6.0, "sleep_score": 70, "hrv": 30, "stress": 35, "bb_change": 20, "hrv_status": "LOW"}
    zone, score, _ = classify(m, DEFAULT_THRESHOLDS)
    assert zone == "ROJO"
    assert score <= 2


def test_classify_verde():
    m = {"sleep_h": 8.0, "sleep_score": 90, "hrv": 55, "stress": 20, "bb_change": 70, "hrv_status": "BALANCED"}
    zone, score, _ = classify(m, DEFAULT_THRESHOLDS)
    assert zone == "VERDE"
    assert score >= 4


def test_guard_rojo_forces_rest():
    readiness = {"zone": "ROJO", "score_ok": 2}
    session = {"action": "train", "sport": "run", "duration_min": 60, "hr_cap": 141, "title": "Run Z2"}
    out = apply_guards(readiness, {"acwr": 0.8}, session)
    assert out["action"] == "rest"
    assert "readiness_rojo" in out["guard_flags"]


def test_guard_acwr_high_cuts_volume():
    readiness = {"zone": "VERDE", "score_ok": 5}
    session = {"action": "train", "sport": "run", "duration_min": 80, "hr_cap": 141, "title": "Run Z2"}
    out = apply_guards(readiness, {"acwr": 1.4}, session)
    assert out["duration_min"] < 80
    assert "acwr_high" in out["guard_flags"]


def test_guard_overreaching():
    readiness = {"zone": "AMARILLO", "score_ok": 3}
    session = {"action": "train", "sport": "run", "duration_min": 60, "hr_cap": 141, "title": "Run Z2"}
    out = apply_guards(readiness, {"acwr": 2.2, "status_phrase": "OVERREACHING"}, session)
    assert out["action"] == "rest"
    assert "overreaching" in out["guard_flags"]


def test_active_phase_r0():
    phase = active_phase(date(2026, 9, 25))
    assert phase.code == "R0"


def test_days_to_milestones():
    days = days_to_milestones(date(2026, 9, 20))
    assert days["mmb_2027"] == (date(2027, 7, 25) - date(2026, 9, 20)).days
