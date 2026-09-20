#!/usr/bin/env python3
"""Render a sleep behavior chart from a sleep-gap CSV report."""

from __future__ import annotations

import argparse
import csv
from datetime import datetime
from pathlib import Path

try:
    import matplotlib.dates as mdates
    import matplotlib.pyplot as plt
except ImportError as exc:  # pragma: no cover - runtime dependency guidance
    raise SystemExit(
        "matplotlib is required. Install it with: pip install matplotlib"
    ) from exc


def _load_rows(path: Path) -> tuple[list[datetime], list[float | None], list[datetime]]:
    dates: list[datetime] = []
    hours: list[float | None] = []
    missing_dates: list[datetime] = []

    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            day = datetime.strptime(row["date"], "%Y-%m-%d")
            dates.append(day)

            raw_hours = row.get("sleep_hours")
            sleep_hours = float(raw_hours) if raw_hours not in (None, "") else None
            hours.append(sleep_hours)

            missing = str(row.get("missing_sleep", "")).strip().lower() == "true"
            if missing:
                missing_dates.append(day)

    return dates, hours, missing_dates


def main() -> int:
    parser = argparse.ArgumentParser(description="Plot sleep behavior from CSV")
    parser.add_argument(
        "--input",
        default="your_data/sleep_gap_report_july.csv",
        help="Input CSV path from sleep_gap_report.py",
    )
    parser.add_argument(
        "--output",
        default="your_data/sleep_behavior_july.png",
        help="Output PNG path",
    )
    parser.add_argument(
        "--title",
        default="Sleep behavior and missing-day detection",
        help="Chart title",
    )
    args = parser.parse_args()

    in_path = Path(args.input).expanduser()
    out_path = Path(args.output).expanduser()

    if not in_path.exists():
        print(f"ERROR: input CSV not found: {in_path}")
        return 2

    dates, hours, missing_dates = _load_rows(in_path)
    if not dates:
        print("ERROR: no rows found in CSV")
        return 3

    valid_dates = [d for d, h in zip(dates, hours, strict=True) if h is not None]
    valid_hours = [h for h in hours if h is not None]

    fig, ax = plt.subplots(figsize=(12, 5))
    if valid_dates:
        ax.plot(valid_dates, valid_hours, marker="o", linewidth=2, label="Sleep hours")
    if missing_dates:
        ax.scatter(
            missing_dates,
            [0.0] * len(missing_dates),
            color="red",
            marker="x",
            s=70,
            label="Missing sleep record",
        )

    ax.axhspan(7.0, 9.0, alpha=0.12, color="green", label="Recommended range (7-9h)")
    ax.set_title(args.title)
    ax.set_ylabel("Hours slept")
    ax.set_xlabel("Date")
    ax.set_ylim(bottom=0)
    ax.grid(alpha=0.25)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m-%d"))
    fig.autofmt_xdate()
    ax.legend(loc="upper right")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)

    print("SLEEP_GAP_PLOT_OK")
    print(f"input={in_path}")
    print(f"output={out_path}")
    print(f"days={len(dates)}")
    print(f"missing_days={len(missing_dates)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
