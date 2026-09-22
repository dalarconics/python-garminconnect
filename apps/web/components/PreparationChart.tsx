import {
  EVENTS,
  actualToChartPoints,
  buildIdealLine,
  chartWindow,
  timeFraction,
  monthAxisTicks,
  toSvgPath,
  type DailyActual,
} from "@/lib/preparation";

type Props = {
  actual: DailyActual[];
  todayIso: string;
};

const W = 960;
const H = 260;
const PAD = { top: 44, right: 12, bottom: 36, left: 36 };

export function PreparationChart({ actual, todayIso }: Props) {
  const { chartStart, chartEnd } = chartWindow(todayIso);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const scaleX = (x: number) => PAD.left + x * plotW;
  const scaleY = (y: number) => PAD.top + plotH - (y / 100) * plotH;

  const actualPoints = actualToChartPoints(actual, chartStart, chartEnd);
  const actualPath = toSvgPath(actualPoints, scaleX, scaleY);

  const ideals = EVENTS.map((ev) => ({
    ev,
    path: toSvgPath(buildIdealLine(ev, chartStart, chartEnd), scaleX, scaleY),
  }));

  const todayX = scaleX(timeFraction(todayIso, chartStart, chartEnd));
  const monthTicks = monthAxisTicks(chartStart, chartEnd);

  const eventLabelY = [PAD.top - 8, PAD.top - 20, PAD.top - 32];

  return (
    <div className="prep-chart-wrap">
      <p className="muted chart-caption">
        Índice 0–100 · eje temporal uniforme (3 meses atrás → 70.3 Cartagena). Curvas ideales =
        progresión logarítmica hacia cada meta.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="prep-chart" role="img" aria-label="Preparación vs retos">
        {[0, 25, 50, 75, 100].map((y) => {
          const yy = scaleY(y);
          return (
            <g key={y}>
              <line x1={PAD.left} y1={yy} x2={W - PAD.right} y2={yy} stroke="#334155" strokeWidth="1" />
              <text x={6} y={yy + 4} fill="#64748b" fontSize="10">
                {y}
              </text>
            </g>
          );
        })}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={plotW}
          height={plotH}
          fill="none"
          stroke="#475569"
          strokeWidth="1"
        />
        {monthTicks.map((tick) => (
          <g key={`${tick.label}-${tick.x}`}>
            <line
              x1={scaleX(tick.x)}
              y1={PAD.top + plotH}
              x2={scaleX(tick.x)}
              y2={PAD.top + plotH + 5}
              stroke="#475569"
              strokeWidth="1"
            />
            <text
              x={scaleX(tick.x)}
              y={H - 8}
              fill="#94a3b8"
              fontSize="9"
              textAnchor="middle"
            >
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
            strokeWidth="2"
            strokeDasharray="8 5"
            opacity={0.95}
          />
        ))}
        {actualPath ? (
          <path d={actualPath} fill="none" stroke="#f1f5f9" strokeWidth="3" strokeLinejoin="round" />
        ) : null}
        {actualPoints.map((p) => (
          <circle key={p.date} cx={scaleX(p.x)} cy={scaleY(p.y)} r={5} fill="#f1f5f9" stroke="#0f172a" strokeWidth="1.5" />
        ))}
        {EVENTS.map((ev, idx) => {
          const dx = scaleX(timeFraction(ev.eventDate, chartStart, chartEnd));
          return (
            <g key={ev.code}>
              <line
                x1={dx}
                y1={PAD.top}
                x2={dx}
                y2={PAD.top + plotH}
                stroke={ev.color}
                strokeWidth="1.5"
                opacity={0.55}
              />
              <text
                x={dx}
                y={eventLabelY[idx] ?? PAD.top - 8}
                fill={ev.color}
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
              >
                {ev.shortLabel}
              </text>
            </g>
          );
        })}
        <line
          x1={todayX}
          y1={PAD.top}
          x2={todayX}
          y2={PAD.top + plotH}
          stroke="#cbd5e1"
          strokeDasharray="4 4"
          strokeWidth="1.5"
        />
        <text x={todayX + 5} y={PAD.top + 14} fill="#cbd5e1" fontSize="10">
          hoy
        </text>
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
        {chartStart} → {chartEnd} · hoy {todayIso}
      </p>
    </div>
  );
}
