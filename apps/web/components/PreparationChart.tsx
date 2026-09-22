import {
  EVENTS,
  PLAN_START,
  actualToChartPoints,
  buildIdealLine,
  chartMaxX,
  eventDaysFromPlan,
  toSvgPath,
  type DailyActual,
} from "@/lib/preparation";

type Props = {
  actual: DailyActual[];
  todayIso: string;
};

const W = 640;
const H = 220;
const PAD = 36;
const MAX_X = chartMaxX();

export function PreparationChart({ actual, todayIso }: Props) {
  const actualPoints = actualToChartPoints(actual);
  const actualPath = toSvgPath(actualPoints, W, H, MAX_X, PAD);

  const ideals = EVENTS.map((ev) => ({
    ev,
    points: buildIdealLine(ev, "2027-11-29"),
    path: toSvgPath(buildIdealLine(ev, "2027-11-29"), W, H, MAX_X, PAD),
  }));

  const todayX = PAD + (Math.min(MAX_X, Math.max(0, actualPoints.at(-1)?.x ?? 0)) / MAX_X) * (W - PAD * 2);

  return (
    <div className="prep-chart-wrap">
      <p className="muted chart-caption">
        Índice de preparación (0–100): readiness, VO₂max y ACWR. Línea sólida = tu estado real;
        líneas punteadas = rampa ideal hacia cada reto.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="prep-chart" role="img" aria-label="Preparación vs retos">
        {[0, 25, 50, 75, 100].map((y) => {
          const yy = H - PAD - (y / 100) * (H - PAD * 2);
          return (
            <g key={y}>
              <line x1={PAD} y1={yy} x2={W - PAD} y2={yy} stroke="#334155" strokeWidth="1" />
              <text x={4} y={yy + 4} fill="#64748b" fontSize="10">
                {y}
              </text>
            </g>
          );
        })}
        {ideals.map(({ ev, path }) => (
          <path
            key={ev.code}
            d={path}
            fill="none"
            stroke={ev.color}
            strokeWidth="1.5"
            strokeDasharray="6 4"
            opacity={0.85}
          />
        ))}
        {actualPath ? (
          <path d={actualPath} fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
        ) : null}
        {actualPoints.map((p) => (
          <circle
            key={p.date}
            cx={PAD + (p.x / MAX_X) * (W - PAD * 2)}
            cy={H - PAD - (p.y / 100) * (H - PAD * 2)}
            r={4}
            fill="#f1f5f9"
          />
        ))}
        {EVENTS.map((ev) => {
          const dx = PAD + (Math.min(MAX_X, eventDaysFromPlan(ev.eventDate)) / MAX_X) * (W - PAD * 2);
          return (
            <g key={ev.code}>
              <line x1={dx} y1={PAD} x2={dx} y2={H - PAD} stroke={ev.color} strokeWidth="1" opacity={0.35} />
              <text
                x={dx}
                y={H - 8}
                fill={ev.color}
                fontSize="9"
                textAnchor="middle"
                transform={`rotate(-35, ${dx}, ${H - 8})`}
              >
                {ev.shortLabel}
              </text>
            </g>
          );
        })}
        <line x1={todayX} y1={PAD} x2={todayX} y2={H - PAD} stroke="#94a3b8" strokeDasharray="3 3" />
      </svg>
      <ul className="chart-legend">
        <li>
          <span className="legend-line legend-actual" /> Tu estado
        </li>
        {EVENTS.map((ev) => (
          <li key={ev.code}>
            <span className="legend-line" style={{ borderColor: ev.color }} /> Ideal {ev.shortLabel}
          </li>
        ))}
      </ul>
      <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
        Hoy: {todayIso} · plan desde {PLAN_START}
      </p>
    </div>
  );
}
