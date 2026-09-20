"""Coaching engine: readiness, macrocycle, session planning, guards."""

from garmin_coaching.guards import apply_guards
from garmin_coaching.macrocycle import active_phase, days_to_milestones
from garmin_coaching.messages import format_whatsapp_message
from garmin_coaching.readiness import (
    DEFAULT_THRESHOLDS,
    build_daily_plan,
    classify,
    derive_thresholds_from_history,
)
from garmin_coaching.session_planner import plan_session

__all__ = [
    "DEFAULT_THRESHOLDS",
    "active_phase",
    "apply_guards",
    "build_daily_plan",
    "classify",
    "days_to_milestones",
    "derive_thresholds_from_history",
    "format_whatsapp_message",
    "plan_session",
]
