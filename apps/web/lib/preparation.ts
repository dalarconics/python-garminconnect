/** Preparation index (0–100) and ideal trajectories per event. */

export type EventDef = {
  code: string;
  shortLabel: string;
  eventDate: string;
  targetIndex: number;
  color: string;
};

export const PLAN_START = "2026-09-20";
export const RECOVERY_LOCAL_END = "2026-10-05";
export const CHART_HISTORY_DAYS = 90;

export const EVENTS: EventDef[] = [
  {
    code: "mmb_2027",
    shortLabel: "mmB 21K",
    eventDate: "2027-07-25",
    targetIndex: 88,
    color: "#22c55e",
  },
  {
    code: "reto_letras_2027",
    shortLabel: "Letras",
    eventDate: "2027-09-13",
    targetIndex: 85,
    color: "#38bdf8",
  },
  {
    code: "cartagena_703_2027",
    shortLabel: "70.3 Cartagena",
    eventDate: "2027-11-29",
    targetIndex: 92,
    color: "#f97316",
  },
];

export type DailyActual = {
  date: string;
  index: number;
};

/** x is 0–1 on log-scaled time axis */
export type ChartPoint = { x: number; y: number; date: string };

function parseDate(iso: string): number {
  return new Date(iso + "T12:00:00").getTime();
}

function addDays(iso: string, days: number): string {
  return new Date(parseDate(iso) + days * 86400000).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

export function chartEndDate(): string {
  return EVENTS.reduce((max, e) => (e.eventDate > max ? e.eventDate : max), "2027-11-29");
}

export function chartWindow(todayIso: string): { chartStart: string; chartEnd: string } {
  const chartEnd = chartEndDate();
  const startMs = parseDate(todayIso) - CHART_HISTORY_DAYS * 86400000;
  const chartStart = new Date(startMs).toISOString().slice(0, 10);
  return { chartStart, chartEnd };
}

/** Log-scaled position on chart (0 = chartStart, 1 = chartEnd). */
export function logTimeFraction(dateIso: string, chartStart: string, chartEnd: string): number {
  const t0 = parseDate(chartStart);
  const t1 = parseDate(chartEnd);
  const t = parseDate(dateIso);
  const spanMs = Math.max(86400000, t1 - t0);
  const offsetMs = Math.max(0, Math.min(spanMs, t - t0));
  const logSpan = Math.log1p(spanMs / 86400000);
  if (logSpan <= 0) return 0;
  return Math.log1p(offsetMs / 86400000) / logSpan;
}

/** Logarithmic progress: base sólida al inicio, acercamiento al target al final. */
export function logProgressY(t: number, startY: number, endY: number, steepness = 14): number {
  const clamped = Math.max(0, Math.min(1, t));
  const curve = Math.log(1 + steepness * clamped) / Math.log(1 + steepness);
  return startY + (endY - startY) * curve;
}

export function recoveryLocalDaysRemaining(todayIso: string): number {
  const d = daysBetween(todayIso, RECOVERY_LOCAL_END);
  return d < 0 ? 0 : d;
}

export function daysUntilAcwrTarget(
  acwr: number | null | undefined,
  target = 1.0
): number | null {
  if (acwr == null || acwr <= target) return 0;
  return Math.ceil((acwr - target) / 0.15);
}

export function preparationIndex(input: {
  zone?: string | null;
  scoreOk?: number | null;
  hrv?: number | null;
  acwr?: number | null;
  vo2max?: number | null;
  hrvThreshold?: number;
}): number {
  const scoreOk = input.scoreOk ?? 0;
  const readinessPart = (scoreOk / 5) * 40;

  const vo2 = input.vo2max ?? 43;
  const vo2Part = Math.min(35, (vo2 / 48) * 35);

  let acwrPart = 25;
  const acwr = input.acwr;
  if (acwr != null) {
    if (acwr <= 1.0) acwrPart = 25;
    else if (acwr <= 1.3) acwrPart = 18;
    else if (acwr <= 1.5) acwrPart = 10;
    else acwrPart = 4;
  }

  let hrvBonus = 0;
  if (input.hrv != null && input.hrvThreshold != null && input.hrv >= input.hrvThreshold) {
    hrvBonus = 5;
  }

  return Math.round(Math.min(100, readinessPart + vo2Part + acwrPart + hrvBonus));
}

export function buildIdealLine(
  event: EventDef,
  chartStart: string,
  chartEnd: string
): ChartPoint[] {
  const curveOrigin = PLAN_START;
  const end = event.eventDate;
  if (parseDate(end) < parseDate(chartStart)) return [];

  const startIndex = 38;
  const totalDays = daysBetween(curveOrigin, end);
  if (totalDays <= 0) return [];

  const points: ChartPoint[] = [];
  const samples = 64;
  for (let i = 0; i <= samples; i++) {
    const d = Math.round((i / samples) * totalDays);
    const date = addDays(curveOrigin, d);
    if (parseDate(date) > parseDate(chartEnd)) break;
    const t = d / totalDays;
    const y = logProgressY(t, startIndex, event.targetIndex);
    const x = logTimeFraction(date, chartStart, chartEnd);
    points.push({ x, y, date });
  }
  return points;
}

export function buildActualSeries(
  rows: {
    date: string;
    zone?: string | null;
    score_ok?: number | null;
    hrv?: number | null;
    acwr?: number | null;
    vo2max?: number | null;
    hrv_threshold?: number;
  }[]
): DailyActual[] {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((r) => ({
    date: r.date,
    index: preparationIndex({
      zone: r.zone,
      scoreOk: r.score_ok,
      hrv: r.hrv,
      acwr: r.acwr,
      vo2max: r.vo2max,
      hrvThreshold: r.hrv_threshold,
    }),
  }));
}

export function actualToChartPoints(
  actual: DailyActual[],
  chartStart: string,
  chartEnd: string
): ChartPoint[] {
  return actual
    .filter((a) => parseDate(a.date) >= parseDate(chartStart) && parseDate(a.date) <= parseDate(chartEnd))
    .map((a) => ({
      x: logTimeFraction(a.date, chartStart, chartEnd),
      y: a.index,
      date: a.date,
    }));
}

export function toSvgPath(
  points: ChartPoint[],
  width: number,
  height: number,
  pad: number
): string {
  if (points.length === 0) return "";
  const scaleX = (x: number) => pad + x * (width - pad * 2);
  const scaleY = (y: number) => height - pad - (y / 100) * (height - pad * 2);
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.x).toFixed(1)} ${scaleY(p.y).toFixed(1)}`)
    .join(" ");
}

export function monthAxisTicks(
  chartStart: string,
  chartEnd: string
): { label: string; x: number }[] {
  const ticks: { label: string; x: number }[] = [];
  const start = new Date(parseDate(chartStart));
  start.setDate(1);
  const endMs = parseDate(chartEnd);
  const cur = new Date(start);
  while (cur.getTime() <= endMs) {
    const iso = cur.toISOString().slice(0, 10);
    if (parseDate(iso) >= parseDate(chartStart)) {
      const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
      ticks.push({
        label: `${months[cur.getMonth()]} ${cur.getFullYear() % 100}`,
        x: logTimeFraction(iso, chartStart, chartEnd),
      });
    }
    cur.setMonth(cur.getMonth() + 1);
  }
  return ticks;
}
