/** Preparation index (0–100): actual, phase-aware ideals, and constrained projection. */

export type EventDef = {
  code: string;
  shortLabel: string;
  eventDate: string;
  targetIndex: number;
  color: string;
  href?: string;
};

/** Edad para VO₂ esperado (Garmin no expone edad en el dashboard MVP). */
export const ATHLETE_AGE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_ATHLETE_AGE
    ? Number(process.env.NEXT_PUBLIC_ATHLETE_AGE)
    : 38;

export const PLAN_START = "2026-09-20";
export const RECOVERY_LOCAL_END = "2026-10-05";
export const CHART_HISTORY_DAYS = 90;

export const EVENTS: EventDef[] = [
  {
    code: "bogota_21k_2026",
    shortLabel: "vChallenges 21K",
    eventDate: "2026-12-26",
    targetIndex: 78,
    color: "#f59e0b",
    href: "https://www.vchallenges.co/2026/challenge/details/vchallenges21k",
  },
  {
    code: "mmb_2027",
    shortLabel: "mmB 21K",
    eventDate: "2027-07-25",
    targetIndex: 86,
    color: "#22c55e",
  },
  {
    code: "reto_letras_2027",
    shortLabel: "Letras",
    eventDate: "2027-09-13",
    targetIndex: 84,
    color: "#38bdf8",
  },
  {
    code: "cartagena_703_2027",
    shortLabel: "70.3 Cartagena",
    eventDate: "2027-11-29",
    targetIndex: 90,
    color: "#f97316",
  },
];

export type DailyActual = {
  date: string;
  index: number;
};

export type ChartPoint = { x: number; y: number; date: string };

export type PreparationInput = {
  zone?: string | null;
  scoreOk?: number | null;
  sleepH?: number | null;
  sleepScore?: number | null;
  hrv?: number | null;
  stress?: number | null;
  bbChange?: number | null;
  acwr?: number | null;
  vo2max?: number | null;
  statusPhrase?: string | null;
  hrvThreshold?: number;
  sleepHThreshold?: number;
  sleepScoreThreshold?: number;
  bbChangeThreshold?: number;
  stressMaxThreshold?: number;
};

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

export function timeFraction(dateIso: string, chartStart: string, chartEnd: string): number {
  const t0 = parseDate(chartStart);
  const t1 = parseDate(chartEnd);
  const t = parseDate(dateIso);
  const span = Math.max(1, t1 - t0);
  return Math.max(0, Math.min(1, (t - t0) / span));
}

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

/** VO₂ “bueno” de referencia por edad (hombre, running Garmin). */
export function expectedVo2ForAge(age: number): number {
  return Math.max(36, 48 - (age - 25) * 0.35);
}

/** Techo de índice alcanzable sin meses de estímulo (capacidad + carga actuales). */
export function ceilingIndex(vo2max: number | null | undefined, age: number): number {
  const vo2 = vo2max ?? expectedVo2ForAge(age);
  const expected = expectedVo2ForAge(age);
  const delta = vo2 - expected;
  return Math.round(Math.max(42, Math.min(88, 52 + delta * 2.2)));
}

function pillarReadiness(zone: string | null | undefined, scoreOk: number): number {
  const base =
    zone === "VERDE" ? 16 : zone === "AMARILLO" ? 11 : zone === "ROJO" ? 4 : 8;
  const fine = Math.max(0, Math.min(4, scoreOk - 2));
  return base + fine;
}

function pillarLoad(acwr: number | null | undefined, status: string | null | undefined): number {
  let pts = 10;
  if (acwr != null) {
    if (acwr <= 0.85) pts = 18;
    else if (acwr <= 1.0) pts = 16;
    else if (acwr <= 1.2) pts = 11;
    else if (acwr <= 1.4) pts = 6;
    else if (acwr <= 1.7) pts = 3;
    else pts = 0;
  }
  const st = (status || "").toUpperCase();
  if (st.includes("OVERREACHING") || st.includes("UNPRODUCTIVE")) pts = Math.min(pts, 4);
  if (st.includes("DETRAINING")) pts = Math.min(pts, 8);
  if (st.includes("PRODUCTIVE") && acwr != null && acwr <= 1.15) pts = Math.min(20, pts + 2);
  return pts;
}

function pillarAerobic(vo2max: number | null | undefined, age: number): number {
  const vo2 = vo2max ?? expectedVo2ForAge(age);
  const expected = expectedVo2ForAge(age);
  const ratio = (vo2 - (expected - 8)) / 12;
  return Math.max(0, Math.min(20, Math.round(ratio * 20)));
}

function pillarRecovery(input: PreparationInput): number {
  let pts = 0;
  let parts = 0;
  if (input.sleepH != null && input.sleepHThreshold != null) {
    parts++;
    pts += input.sleepH >= input.sleepHThreshold ? 5 : input.sleepH >= input.sleepHThreshold - 0.5 ? 3 : 1;
  }
  if (input.sleepScore != null && input.sleepScoreThreshold != null) {
    parts++;
    pts += input.sleepScore >= input.sleepScoreThreshold ? 5 : 2;
  }
  if (input.hrv != null && input.hrvThreshold != null) {
    parts++;
    pts += input.hrv >= input.hrvThreshold ? 5 : input.hrv >= input.hrvThreshold - 5 ? 3 : 1;
  }
  if (input.bbChange != null && input.bbChangeThreshold != null) {
    parts++;
    pts += input.bbChange >= input.bbChangeThreshold ? 5 : input.bbChange >= input.bbChangeThreshold - 8 ? 3 : 1;
  }
  if (input.stress != null && input.stressMaxThreshold != null) {
    parts++;
    pts += input.stress <= input.stressMaxThreshold ? 5 : 2;
  }
  if (parts === 0) return 10;
  return Math.round((pts / parts) * (20 / 5));
}

/**
 * Índice 0–100: readiness, carga, aeróbico (edad), recuperación.
 * Diseñado para que R0 + AMARILLO + ACWR>1 no parezca “listo para 21K”.
 */
export function preparationIndex(input: PreparationInput): number {
  const scoreOk = input.scoreOk ?? 0;
  const age = ATHLETE_AGE;

  let total =
    pillarReadiness(input.zone, scoreOk) +
    pillarLoad(input.acwr, input.statusPhrase) +
    pillarAerobic(input.vo2max, age) +
    pillarRecovery(input);

  const st = (input.statusPhrase || "").toUpperCase();
  if (st.includes("OVERREACHING")) total = Math.min(total, 52);
  if (input.zone === "ROJO") total = Math.min(total, 45);
  if (input.acwr != null && input.acwr > 1.5) total = Math.min(total, 48);

  const cap = ceilingIndex(input.vo2max, age);
  if (input.acwr != null && input.acwr > 1.0) {
    total = Math.min(total, cap - 6);
  }

  return Math.round(Math.max(0, Math.min(100, total)));
}

type IdealAnchor = { date: string; index: number };

function idealAnchors(event: EventDef): IdealAnchor[] {
  switch (event.code) {
    case "bogota_21k_2026":
      return [
        { date: PLAN_START, index: 32 },
        { date: RECOVERY_LOCAL_END, index: 44 },
        { date: "2026-11-01", index: 58 },
        { date: "2026-12-05", index: 70 },
        { date: "2026-12-19", index: 76 },
        { date: event.eventDate, index: event.targetIndex },
      ];
    case "mmb_2027":
      return [
        { date: PLAN_START, index: 30 },
        { date: RECOVERY_LOCAL_END, index: 42 },
        { date: "2027-01-15", index: 52 },
        { date: "2027-04-01", index: 64 },
        { date: "2027-06-01", index: 76 },
        { date: "2027-07-18", index: 84 },
        { date: event.eventDate, index: event.targetIndex },
      ];
    case "reto_letras_2027":
      return [
        { date: PLAN_START, index: 28 },
        { date: "2027-06-01", index: 55 },
        { date: "2027-08-15", index: 68 },
        { date: "2027-09-06", index: 80 },
        { date: event.eventDate, index: event.targetIndex },
      ];
    case "cartagena_703_2027":
      return [
        { date: PLAN_START, index: 26 },
        { date: "2027-04-01", index: 48 },
        { date: "2027-08-01", index: 62 },
        { date: "2027-10-15", index: 78 },
        { date: "2027-11-15", index: 86 },
        { date: event.eventDate, index: event.targetIndex },
      ];
    default:
      return [
        { date: PLAN_START, index: 35 },
        { date: event.eventDate, index: event.targetIndex },
      ];
  }
}

function interpolateIdealIndex(anchors: IdealAnchor[], dateIso: string): number {
  const t = parseDate(dateIso);
  if (t <= parseDate(anchors[0].date)) return anchors[0].index;
  const last = anchors[anchors.length - 1];
  if (t >= parseDate(last.date)) return last.index;

  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    const t0 = parseDate(a.date);
    const t1 = parseDate(b.date);
    if (t >= t0 && t <= t1) {
      const frac = (t - t0) / Math.max(1, t1 - t0);
      return logProgressY(frac, a.index, b.index, 10);
    }
  }
  return last.index;
}

export function buildIdealLine(
  event: EventDef,
  chartStart: string,
  chartEnd: string
): ChartPoint[] {
  const anchors = idealAnchors(event);
  const points: ChartPoint[] = [];
  const totalDays = daysBetween(chartStart, chartEnd);
  const step = Math.max(7, Math.floor(totalDays / 48));
  for (let d = 0; d <= totalDays; d += step) {
    const date = addDays(chartStart, d);
    if (parseDate(date) > parseDate(chartEnd)) break;
    const y = interpolateIdealIndex(anchors, date);
    points.push({ x: timeFraction(date, chartStart, chartEnd), y, date });
  }
  const endY = interpolateIdealIndex(anchors, chartEnd);
  points.push({ x: 1, y: endY, date: chartEnd });
  return points;
}

export function buildActualSeries(
  rows: {
    date: string;
    zone?: string | null;
    score_ok?: number | null;
    sleep_h?: number | null;
    sleep_score?: number | null;
    hrv?: number | null;
    stress?: number | null;
    bb_change?: number | null;
    acwr?: number | null;
    vo2max?: number | null;
    status_phrase?: string | null;
    hrv_threshold?: number;
    sleep_h_threshold?: number;
    sleep_score_threshold?: number;
    bb_change_threshold?: number;
    stress_max_threshold?: number;
  }[]
): DailyActual[] {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((r) => ({
    date: r.date,
    index: preparationIndex({
      zone: r.zone,
      scoreOk: r.score_ok,
      sleepH: r.sleep_h,
      sleepScore: r.sleep_score,
      hrv: r.hrv,
      stress: r.stress,
      bbChange: r.bb_change,
      acwr: r.acwr,
      vo2max: r.vo2max,
      statusPhrase: r.status_phrase,
      hrvThreshold: r.hrv_threshold,
      sleepHThreshold: r.sleep_h_threshold,
      sleepScoreThreshold: r.sleep_score_threshold,
      bbChangeThreshold: r.bb_change_threshold,
      stressMaxThreshold: r.stress_max_threshold,
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
  idealAtEvent: number;
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

function indexAtDateFromRhythm(
  lastDate: string,
  lastIndex: number,
  targetDate: string,
  slopePerDay: number,
  vo2max: number | null | undefined
): number {
  const days = daysBetween(lastDate, targetDate);
  if (days <= 0) return lastIndex;

  const ceiling = ceilingIndex(vo2max, ATHLETE_AGE);
  let y = lastIndex;
  for (let d = 1; d <= days; d++) {
    const date = addDays(lastDate, d);
    let dailySlope = slopePerDay;

    if (date <= RECOVERY_LOCAL_END) {
      dailySlope = Math.min(dailySlope, 0.06);
    } else if (date <= addDays(RECOVERY_LOCAL_END, 21)) {
      dailySlope = Math.min(Math.max(dailySlope, 0.08), 0.22);
    } else {
      dailySlope = Math.min(dailySlope, 0.14);
    }

    if (y >= ceiling - 2) dailySlope = Math.min(dailySlope, 0.03);

    y = clampIndex(y + dailySlope);
  }
  return Math.round(y);
}

/** Proyección púrpura: ritmo reciente + techo por VO₂/edad + fase R0. */
export function buildProjection(
  actual: DailyActual[],
  chartStart: string,
  chartEnd: string,
  todayIso: string,
  vo2max?: number | null
): { forecast: ChartPoint[]; atEvents: ProjectionAtEvent[]; slopePerDay: number } {
  if (actual.length === 0) {
    const flat = 40;
    const atEvents: ProjectionAtEvent[] = EVENTS.map((event) => {
      const idealAtEvent = Math.round(interpolateIdealIndex(idealAnchors(event), event.eventDate));
      return {
        event,
        projected: flat,
        target: idealAtEvent,
        gap: idealAtEvent - flat,
        idealAtEvent,
      };
    });
    return { forecast: [], atEvents, slopePerDay: 0 };
  }

  const sorted = [...actual].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-21);
  const samples = recent.map((a) => ({
    day: daysBetween(chartStart, a.date),
    y: a.index,
  }));

  let { slope } = linearRegression(samples);
  slope = Math.max(-0.04, Math.min(0.12, slope));

  const last = sorted[sorted.length - 1];
  const lastDay = daysBetween(chartStart, last.date);
  const lastY = last.index;
  const totalDays = daysBetween(chartStart, chartEnd);

  const forecast: ChartPoint[] = [];
  const step = Math.max(7, Math.floor((totalDays - lastDay) / 36));
  for (let day = lastDay; day <= totalDays; day += step) {
    const date = addDays(chartStart, day);
    const y = indexAtDateFromRhythm(last.date, lastY, date, slope, vo2max ?? null);
    forecast.push({
      x: timeFraction(date, chartStart, chartEnd),
      y,
      date,
    });
  }
  const endDate = chartEnd;
  if (forecast.length === 0 || forecast[forecast.length - 1].date !== endDate) {
    forecast.push({
      x: timeFraction(endDate, chartStart, chartEnd),
      y: indexAtDateFromRhythm(last.date, lastY, endDate, slope, vo2max ?? null),
      date: endDate,
    });
  }

  const atEvents: ProjectionAtEvent[] = EVENTS.map((event) => {
    const projected = indexAtDateFromRhythm(last.date, lastY, event.eventDate, slope, vo2max ?? null);
    const idealAtEvent = Math.round(interpolateIdealIndex(idealAnchors(event), event.eventDate));
    return {
      event,
      projected,
      target: idealAtEvent,
      gap: idealAtEvent - projected,
      idealAtEvent,
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

/** Sanity check: índice típico Diego AMARILLO + ACWR 1.1 (para tests manuales). */
export function debugSampleIndex(): number {
  return preparationIndex({
    zone: "AMARILLO",
    scoreOk: 3,
    sleepH: 7.2,
    sleepScore: 89,
    hrv: 52,
    stress: 11,
    bbChange: 59,
    acwr: 1.1,
    vo2max: 43.2,
    statusPhrase: "PRODUCTIVE",
    hrvThreshold: 47,
    sleepHThreshold: 7.72,
    sleepScoreThreshold: 82,
    bbChangeThreshold: 61,
    stressMaxThreshold: 25,
  });
}
