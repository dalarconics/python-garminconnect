import {
  EVENTS,
  actualToChartPoints,
  buildIdealLine,
  chartWindow,
  logTimeFraction,
  monthAxisTicks,
  toSvgPath,
  type DailyActual,
} from "@/lib/preparation";

type Props = {
  actual: DailyActual[];
  todayIso: string;
};

const W = 640;
const H = 240;
const PAD = 40;

export function PreparationChart({ actual, todayIso }: Props) {
  const { chartStart, chartEnd } = chartWindow(todayIso);
  const actualPoints = actualToChartPoints(actual, chartStart, chartEnd);
  const actualPath = toSvgPath(actualPoints, W, H, PAD);

  const ideals = EVENTS.map((ev) => ({
    ev,
    path: toSvgPath(buildIdealLine(ev, chartStart, chartEnd), W, H, PAD),
  }));

  const todayX = PAD + logTimeFraction(todayIso, chartStart, chartEnd) * (W - PAD * 2);
  const monthTicks = monthAxisTicks(chartStart, chartEnd);

  const scaleX = (x: number) => PAD + x * (W - PAD * 2);
  const scaleY = (y: number) => H - PAD - (y / 100) * (H - PAD * 2);

  return (
    <div className="prep-chart-wrap">
      <p className="muted chart-caption">
        Índice 0–100 (readiness, VO₂, ACWR). Eje temporal log: últimos 3 meses amplios + retos 2027.
        Líneas punteadas = curva logarítmica ideal hacia cada meta.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="prep-chart" role="img" aria-label="Preparación vs retos">
        {[0, 25, 50, 75, 100].map((y) => {
          const yy = scaleY(y);
          return (
            <g key={y}>
              <line x1={PAD} y1={yy} x2={W - PAD} y2={yy} stroke="#334155" strokeWidth="1" />
              <text x={4} y={yy + 4} fill="#64748b" fontSize="10">
                {y}
              </text>
            </g>
          );
        })}
        {monthTicks.map((tick) => (
          <g key={tick.label}>
            <line
              x1={scaleX(tick.x)}
              y1={H - PAD}
              x2={scaleX(tick.x)}
              y2={H - PAD + 4}
              stroke="#475569"
              strokeWidth="1"
            />
            <text x={scaleX(tick.x)} y={H - 6} fill="#64748b" fontSize="8" textAnchor="middle">
              {tick.label}
            </text>
          </g>
        ))}
        {ideals.map(({ ev, path }) => (
          <path
            key={ev.code}
            d={path}
            fill="none"
            stroke={ev.color}
            strokeWidth="1.5"
            strokeDasharray="6 4"
            opacity={0.9}
          />
        ))}
        {actualPath ? (
          <path d={actualPath} fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
        ) : null}
        {actualPoints.map((p) => (
          <circle key={p.date} cx={scaleX(p.x)} cy={scaleY(p.y)} r={4} fill="#f1f5f9" />
        ))}
        {EVENTS.map((ev) => {
          const dx = scaleX(logTimeFraction(ev.eventDate, chartStart, chartEnd));
          return (
            <g key={ev.code}>
              <line x1={dx} y1={PAD} x2={dx} y2={H - PAD} stroke={ev.color} strokeWidth="1" opacity={0.4} />
              <text
                x={dx}
                y={PAD - 6}
                fill={ev.color}
                fontSize="9"
                textAnchor="middle"
              >
                {ev.shortLabel}
              </text>
            </g>
          );
        })}
        <line x1={todayX} y1={PAD} x2={todayX} y2={H - PAD} stroke="#94a3b8" strokeDasharray="4 3" />
        <text x={todayX + 4} y={PAD + 10} fill="#94a3b8" fontSize="9">
          hoy
        </text>
      </svg>
      <ul className="chart-legend">
        <li>
          <span className="legend-line legend-actual" /> Tu estado
        </li>
        {EVENTS.map((ev) => (
          <li key={ev.code}>
            <span className="legend-line" style={{ borderColor: ev.color }} /> Ideal log {ev.shortLabel}
          </li>
        ))}
      </ul>
      <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
        Ventana: {chartStart} → {chartEnd} · hoy {todayIso}
      </p>
    </div>
  );
}
