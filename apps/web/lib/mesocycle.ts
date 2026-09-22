/** Client-side mesocycle plan (mirrors garmin_coaching/mesocycle.py). */

export const MESOCYCLE_ANCHOR = "2026-09-21";

const PHASE_WEEKLY_BASE: Record<string, Record<string, number>> = {
  R0: { run: 60, bike: 30, swim: 0, walk: 120 },
  R1: { run: 200, bike: 150, swim: 0, walk: 45 },
  R2: { run: 280, bike: 60, swim: 0, walk: 30 },
  R3: { run: 320, bike: 40, swim: 0, walk: 30 },
  R4: { run: 180, bike: 0, swim: 0, walk: 60 },
  R5: { run: 90, bike: 280, swim: 0, walk: 30 },
  R6: { run: 60, bike: 320, swim: 0, walk: 30 },
  R7: { run: 150, bike: 200, swim: 120, walk: 30 },
};

const PHASES: { code: string; start: string; end: string; name: string }[] = [
  { code: "R0", start: "2026-09-20", end: "2026-10-05", name: "Recuperacion" },
  { code: "R1", start: "2026-10-06", end: "2026-12-31", name: "Base aerobica" },
  { code: "R2", start: "2027-01-01", end: "2027-03-31", name: "Construccion" },
  { code: "R3", start: "2027-04-01", end: "2027-07-24", name: "Especifico 21K" },
  { code: "R4", start: "2027-07-25", end: "2027-07-25", name: "Carrera mmB" },
  { code: "R5", start: "2027-08-01", end: "2027-08-31", name: "Transicion ciclismo" },
  { code: "R6", start: "2027-09-01", end: "2027-09-13", name: "Reto Letras" },
  { code: "R7", start: "2027-10-01", end: "2027-11-28", name: "Especifico 70.3" },
];

const LOAD_WEEK_SCALE = [0.85, 1.0, 1.1];
const RECOVERY_WEEK_SCALE = 0.65;

export function mondayOf(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function activePhaseCode(isoDate: string): string {
  for (const p of PHASES) {
    if (isoDate >= p.start && isoDate <= p.end) return p.code;
  }
  if (isoDate < PHASES[0].start) return PHASES[0].code;
  return PHASES[PHASES.length - 1].code;
}

export function weekMeta(weekStart: string) {
  const ws = mondayOf(weekStart);
  const anchor = new Date(MESOCYCLE_ANCHOR + "T12:00:00");
  const cur = new Date(ws + "T12:00:00");
  const days = Math.floor((cur.getTime() - anchor.getTime()) / 86400000);
  let blockIndex = 0;
  let weekInBlock = 0;
  if (days >= 0) {
    const weekIndex = Math.floor(days / 7);
    blockIndex = Math.floor(weekIndex / 4);
    weekInBlock = weekIndex % 4;
  }
  const kind = weekInBlock === 3 ? "recovery" : "load";
  return { week_start: ws, block_index: blockIndex, week_in_block: weekInBlock, kind, phase_code: activePhaseCode(ws) };
}

export function plannedWeeklySports(weekStart: string) {
  const meta = weekMeta(weekStart);
  const base = { ...(PHASE_WEEKLY_BASE[meta.phase_code] ?? PHASE_WEEKLY_BASE.R0) };
  const scale = meta.week_in_block === 3 ? RECOVERY_WEEK_SCALE : LOAD_WEEK_SCALE[meta.week_in_block];
  return {
    run: Math.round(base.run * scale * 10) / 10,
    bike: Math.round(base.bike * scale * 10) / 10,
    swim: Math.round(base.swim * scale * 10) / 10,
    walk: Math.round(base.walk * scale * 10) / 10,
  };
}

export type WeeklySportRow = {
  week_start: string;
  block_index: number | null;
  week_in_block: number | null;
  kind: string | null;
  phase_code: string | null;
  planned_run_min: number | null;
  planned_bike_min: number | null;
  planned_swim_min: number | null;
  planned_walk_min: number | null;
  planned_total_min: number | null;
  executed_run_min: number | null;
  executed_bike_min: number | null;
  executed_swim_min: number | null;
  executed_walk_min: number | null;
  executed_total_min: number | null;
};

export function mergePlannedExecuted(row: WeeklySportRow): WeeklySportRow {
  const planned = plannedWeeklySports(row.week_start);
  const plannedTotal = planned.run + planned.bike + planned.swim + planned.walk;
  const meta = weekMeta(row.week_start);
  return {
    ...row,
    ...meta,
    planned_run_min: row.planned_run_min ?? planned.run,
    planned_bike_min: row.planned_bike_min ?? planned.bike,
    planned_swim_min: row.planned_swim_min ?? planned.swim,
    planned_walk_min: row.planned_walk_min ?? planned.walk,
    planned_total_min: row.planned_total_min ?? plannedTotal,
    executed_run_min: row.executed_run_min ?? 0,
    executed_bike_min: row.executed_bike_min ?? 0,
    executed_swim_min: row.executed_swim_min ?? 0,
    executed_walk_min: row.executed_walk_min ?? 0,
    executed_total_min: row.executed_total_min ?? 0,
  };
}
