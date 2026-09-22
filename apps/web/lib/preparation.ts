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

/** Posición lineal uniforme (0 = chartStart, 1 = chartEnd). */
export function timeFraction(dateIso: string, chartStart: string, chartEnd: string): number {
  const t0 = parseDate(chartStart);
  const t1 = parseDate(chartEnd);
  const t = parseDate(dateIso);
  const span = Math.max(1, t1 - t0);
  return Math.max(0, Math.min(1, (t - t0) / span));
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
    const x = timeFraction(date, chartStart, chartEnd);
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
      x: timeFraction(a.date, chartStart, chartEnd),
      y: a.index,
      date: a.date,
    }));
}

export function toSvgPath(
  points: ChartPoint[],
  scaleX: (x: number) => number,
  scaleY: (y: number) => number
): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.x).toFixed(1)} ${scaleY(p.y).toFixed(1)}`)
    .join(" ");
}

export type ProjectionAtEvent = {
  event: EventDef;
  projected: number;
  target: number;
  gap: number;
};

function clampIndex(y: number): number {
  return Math.max(0, Math.min(100, y));
}

function linearRegression(points: { day: number; y: number }[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 50 };
  if (n === 1) return { slope: 0, intercept: points[0].y };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const p of points) {
    sumX += p.day;
    sumY += p.y;
    sumXY += p.day * p.y;
    sumXX += p.day * p.day;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/** Proyección lineal desde tu ritmo reciente (regresión + tope realista). */
export function buildProjection(
  actual: DailyActual[],
  chartStart: string,
  chartEnd: string,
  todayIso: string
): { forecast: ChartPoint[]; atEvents: ProjectionAtEvent[]; slopePerDay: number } {
  if (actual.length === 0) {
    const flat = 45;
    const atEvents = EVENTS.map((event) => ({
      event,
      projected: flat,
      target: event.targetIndex,
      gap: event.targetIndex - flat,
    }));
    return { forecast: [], atEvents, slopePerDay: 0 };
  }

  const sorted = [...actual].sort((a, b) => a.date.localeCompare(b.date));
  const samples = sorted.map((a) => ({
    day: daysBetween(chartStart, a.date),
    y: a.index,
  }));

  let { slope } = linearRegression(samples);
  const maxSlope = 0.1;
  const minSlope = -0.06;
  slope = Math.max(minSlope, Math.min(maxSlope, slope));

  const last = sorted[sorted.length - 1];
  const lastDay = daysBetween(chartStart, last.date);
  const lastY = last.index;

  const totalDays = daysBetween(chartStart, chartEnd);
  const forecast: ChartPoint[] = [];
  for (let day = lastDay; day <= totalDays; day += Math.max(7, Math.floor((totalDays - lastDay) / 40))) {
    const date = addDays(chartStart, day);
    const y = clampIndex(lastY + slope * (day - lastDay));
    forecast.push({
      x: timeFraction(date, chartStart, chartEnd),
      y,
      date,
    });
  }
  const endDate = chartEnd;
  if (forecast.length === 0 || forecast[forecast.length - 1].date !== endDate) {
    const yEnd = clampIndex(lastY + slope * (totalDays - lastDay));
    forecast.push({
      x: timeFraction(endDate, chartStart, chartEnd),
      y: yEnd,
      date: endDate,
    });
  }

  const atEvents: ProjectionAtEvent[] = EVENTS.map((event) => {
    const day = daysBetween(chartStart, event.eventDate);
    const projected = Math.round(clampIndex(lastY + slope * (day - lastDay)));
    return {
      event,
      projected,
      target: event.targetIndex,
      gap: event.targetIndex - projected,
    };
  });

  return { forecast, atEvents, slopePerDay: slope };
}

export function monthAxisTicks(
  chartStart: string,
  chartEnd: string
): { label: string; x: number }[] {
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const raw: { label: string; x: number }[] = [];
  const start = new Date(parseDate(chartStart));
  start.setDate(1);
  const endMs = parseDate(chartEnd);
  const cur = new Date(start);
  while (cur.getTime() <= endMs) {
    const iso = cur.toISOString().slice(0, 10);
    if (parseDate(iso) >= parseDate(chartStart)) {
      raw.push({
        label: `${months[cur.getMonth()]} ${String(cur.getFullYear()).slice(-2)}`,
        x: timeFraction(iso, chartStart, chartEnd),
      });
    }
    cur.setMonth(cur.getMonth() + 2);
  }
  const minGap = 0.055;
  const ticks: { label: string; x: number }[] = [];
  let lastX = -1;
  for (const tick of raw) {
    if (ticks.length === 0 || tick.x - lastX >= minGap) {
      ticks.push(tick);
      lastX = tick.x;
    }
  }
  return ticks;
}
