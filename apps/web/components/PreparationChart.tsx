"use client";

import { useState } from "react";
import {
  EVENTS,
  TIME_HORIZONS,
  actualToChartPoints,
  buildIdealLine,
  buildProjection,
  calculateProgressPercent,
  chartWindow,
  getIdealIndexAtDate,
  getProjectedIndexAtDate,
  monthAxisTicks,
  timeFraction,
  toSvgPath,
  type DailyActual,
  type TimeHorizonKey,
} from "@/lib/preparation";
import { formatDateEsCO } from "@/lib/lastUpdated";

type Props = {
  actual: DailyActual[];
  todayIso: string;
  vo2max?: number | null;
};

type HoverData = {
  date: string;
  x: number;
  y: number;
  val: number;
  type: "real" | "proyectado";
  ideal: number;
  gap: number;
  eventName: string;
  eventColor: string;
};

const W = 960;
const H = 310;
const PAD = { top: 56, right: 44, bottom: 36, left: 36 };
const PROJECTION_COLOR = "#c084fc";

export function PreparationChart({ actual, todayIso, vo2max }: Props) {
  const [horizon, setHorizon] = useState<TimeHorizonKey>("full");
  const [focusedEvent, setFocusedEvent] = useState<string | null>(null);
  const [hoverData, setHoverData] = useState<HoverData | null>(null);

  const activeHorizonDef = TIME_HORIZONS[horizon];
  const chartEnd = activeHorizonDef.endDate;
  const { chartStart } = chartWindow(todayIso, chartEnd);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const scaleX = (x: number) => PAD.left + x * plotW;
  const scaleY = (y: number) => PAD.top + plotH - (y / 100) * plotH;

  const actualPoints = actualToChartPoints(actual, chartStart, chartEnd);
  const actualPath = toSvgPath(actualPoints, scaleX, scaleY);

  // Área sombreada con degradado bajo la curva real
  const actualAreaPath =
    actualPoints.length > 0
      ? `${actualPath} L ${scaleX(actualPoints[actualPoints.length - 1].x).toFixed(1)} ${scaleY(0).toFixed(1)} L ${scaleX(actualPoints[0].x).toFixed(1)} ${scaleY(0).toFixed(1)} Z`
      : "";

  const { forecast, atEvents, slopePerDay } = buildProjection(
    actual,
    chartStart,
    chartEnd,
    todayIso,
    vo2max
  );
  const projectionPath = toSvgPath(forecast, scaleX, scaleY);

  // Curvas ideales con atenuación selectiva según reto enfocado
  const ideals = EVENTS.map((ev) => {
    const isFocused = focusedEvent === ev.code;
    const opacity = focusedEvent ? (isFocused ? 1 : 0.16) : 0.85;
    const strokeWidth = isFocused ? 2.75 : 1.75;
    return {
      ev,
      path: toSvgPath(buildIdealLine(ev, chartStart, chartEnd), scaleX, scaleY),
      opacity,
      strokeWidth,
      isFocused,
    };
  });

  const todayFrac = timeFraction(todayIso, chartStart, chartEnd);
  const todayX = scaleX(todayFrac);
  const monthTicks = monthAxisTicks(chartStart, chartEnd);
  const eventLabelY = [PAD.top - 8, PAD.top - 20, PAD.top - 32, PAD.top - 44];

  // Nodos clave de la serie real (evitando nube saturada de ~35 círculos)
  const firstPoint = actualPoints.length > 0 ? actualPoints[0] : null;
  const todayPoint = actualPoints.length > 0 ? actualPoints[actualPoints.length - 1] : null;
  const currentTodayVal = todayPoint?.y ?? (actual[actual.length - 1]?.index ?? 40);

  // Reto de referencia para el estado de reposo (idle)
  const activeTargetDef = focusedEvent
    ? EVENTS.find((ev) => ev.code === focusedEvent)
    : EVENTS.find((ev) => ev.eventDate >= todayIso) || EVENTS[EVENTS.length - 1];
  const activeTargetIdeal = activeTargetDef
    ? getIdealIndexAtDate(activeTargetDef, todayIso)
    : 50;
  const currentGap = activeTargetIdeal - currentTodayVal;

  const slopeLabel =
    slopePerDay >= 0
      ? `+${(slopePerDay * 7).toFixed(2)} pts/semana`
      : `${(slopePerDay * 7).toFixed(2)} pts/semana`;

  // Manejador del inspector interactivo (crosshair)
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * W;

    if (svgX < PAD.left || svgX > W - PAD.right) {
      setHoverData(null);
      return;
    }

    const frac = Math.max(0, Math.min(1, (svgX - PAD.left) / plotW));
    const startMs = new Date(chartStart + "T12:00:00").getTime();
    const endMs = new Date(chartEnd + "T12:00:00").getTime();
    const hoverMs = startMs + frac * (endMs - startMs);
    const hoverDate = new Date(hoverMs).toISOString().slice(0, 10);
    const isFuture = hoverDate > todayIso;

    // Reto contra el cual contrastar el índice ideal
    const targetEvent = focusedEvent
      ? EVENTS.find((ev) => ev.code === focusedEvent) || EVENTS[0]
      : EVENTS.find((ev) => ev.eventDate >= hoverDate) || EVENTS[EVENTS.length - 1];

    const idealVal = getIdealIndexAtDate(targetEvent, hoverDate);

    let val = 0;
    let type: "real" | "proyectado" = "real";

    if (!isFuture) {
      type = "real";
      if (actual.length > 0) {
        let closest = actual[0];
        let minDiff = Math.abs(new Date(closest.date + "T12:00:00").getTime() - hoverMs);
        for (let i = 1; i < actual.length; i++) {
          const diff = Math.abs(new Date(actual[i].date + "T12:00:00").getTime() - hoverMs);
          if (diff < minDiff) {
            minDiff = diff;
            closest = actual[i];
          }
        }
        val = closest.index;
      }
    } else {
      type = "proyectado";
      val = getProjectedIndexAtDate(actual, hoverDate, slopePerDay, vo2max);
    }

    const gap = idealVal - val;

    setHoverData({
      date: hoverDate,
      x: svgX,
      y: scaleY(val),
      val,
      type,
      ideal: idealVal,
      gap,
      eventName: targetEvent.shortLabel,
      eventColor: targetEvent.color,
    });
  };

  const selectEventFocus = (code: string | null) => {
    if (!code) {
      setFocusedEvent(null);
      return;
    }
    const nextCode = focusedEvent === code ? null : code;
    setFocusedEvent(nextCode);
    if (nextCode) {
      const ev = EVENTS.find((item) => item.code === nextCode);
      if (ev && ev.eventDate > chartEnd) {
        if (ev.code === "cartagena_703_2027" || ev.code === "reto_letras_2027") {
          setHorizon("full");
        } else if (ev.code === "mmb_2027") {
          setHorizon("medium");
        }
      }
    }
  };

  return (
    <div className="prep-chart-wrap">
      {/* Controles de Horizonte (Zoom) y Filtro de Reto Enfocado */}
      <div className="prep-controls-header">
        <div className="prep-range-tabs" role="tablist" aria-label="Horizonte temporal de proyección">
          {(Object.keys(TIME_HORIZONS) as TimeHorizonKey[]).map((key) => {
            const def = TIME_HORIZONS[key];
            const isActive = horizon === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`prep-range-tab ${isActive ? "active" : ""}`}
                onClick={() => setHorizon(key)}
              >
                {def.label}
              </button>
            );
          })}
        </div>

        <div className="prep-filter-pills" role="group" aria-label="Filtro de curva por reto">
          <button
            type="button"
            className={`prep-pill ${!focusedEvent ? "active" : ""}`}
            onClick={() => selectEventFocus(null)}
          >
            Todos
          </button>
          {EVENTS.map((ev) => {
            const isActive = focusedEvent === ev.code;
            return (
              <button
                key={ev.code}
                type="button"
                className={`prep-pill ${isActive ? "active" : ""}`}
                style={{
                  borderColor: isActive ? ev.color : undefined,
                  color: isActive ? ev.color : undefined,
                }}
                onClick={() => selectEventFocus(ev.code)}
              >
                <span className="prep-pill-dot" style={{ backgroundColor: ev.color }} />
                {ev.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inspector interactivo en vivo (Crosshair data / Resumen de hoy) */}
      <div className="prep-inspector-bar" aria-live="polite">
        {hoverData ? (
          <div className="prep-inspector-active">
            <div className="prep-inspector-item">
              <span className="prep-inspector-label">Fecha:</span>
              <strong className="prep-inspector-val">{formatDateEsCO(hoverData.date)}</strong>
            </div>
            <div className="prep-inspector-item">
              <span className="prep-inspector-label">
                {hoverData.type === "real" ? "Índice real:" : "Proyección:"}
              </span>
              <strong
                className="prep-inspector-val"
                style={{ color: hoverData.type === "real" ? "#f1f5f9" : PROJECTION_COLOR }}
              >
                {hoverData.val} pts
              </strong>
            </div>
            <div className="prep-inspector-item">
              <span className="prep-inspector-label">Ideal ({hoverData.eventName}):</span>
              <strong className="prep-inspector-val" style={{ color: hoverData.eventColor }}>
                {hoverData.ideal} pts
              </strong>
            </div>
            <div className="prep-inspector-item">
              <span className="prep-inspector-label">Gap:</span>
              <strong
                className={`prep-inspector-val ${hoverData.gap <= 0 ? "gap-ok" : "gap-warn"}`}
              >
                {hoverData.gap <= 0 ? `+${Math.abs(hoverData.gap)}` : `−${hoverData.gap}`} pts
              </strong>
            </div>
          </div>
        ) : (
          <div className="prep-inspector-idle">
            <div className="prep-inspector-item">
              <span className="prep-inspector-label">Hoy:</span>
              <strong className="prep-inspector-val">{formatDateEsCO(todayIso)}</strong>
            </div>
            <div className="prep-inspector-item">
              <span className="prep-inspector-label">Tu índice actual:</span>
              <strong className="prep-inspector-val" style={{ color: "#f1f5f9" }}>
                {currentTodayVal} pts
              </strong>
            </div>
            <div className="prep-inspector-item">
              <span className="prep-inspector-label">
                Meta {activeTargetDef ? activeTargetDef.shortLabel : "reto"}:
              </span>
              <strong
                className="prep-inspector-val"
                style={{ color: activeTargetDef ? activeTargetDef.color : "#38bdf8" }}
              >
                {activeTargetIdeal} pts
              </strong>
            </div>
            <div className="prep-inspector-item">
              <span className="prep-inspector-label">Gap actual:</span>
              <strong className={`prep-inspector-val ${currentGap <= 0 ? "gap-ok" : "gap-warn"}`}>
                {currentGap <= 0 ? `+${Math.abs(currentGap)}` : `−${currentGap}`} pts
              </strong>
            </div>
            <span className="prep-inspector-hint muted">
              (Mueve el cursor o toca el gráfico para inspeccionar fechas)
            </span>
          </div>
        )}
      </div>

      <p className="muted chart-caption">
        Índice 0–100 (readiness, carga, VO₂/edad, recuperación).{" "}
        <span style={{ color: "#f1f5f9" }}>Blanca</span> = real histórico ·{" "}
        <span style={{ color: PROJECTION_COLOR }}>Lila</span> = proyección al ritmo actual ({slopeLabel}
        , con techo VO₂). Punteadas = ideal por fase hasta cada reto.
      </p>

      {/* SVG del Gráfico */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="prep-chart"
        role="img"
        aria-label="Preparación vs retos interactivo"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverData(null)}
      >
        <defs>
          <linearGradient id="prepActualGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f1f5f9" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Líneas horizontales de nivel */}
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

        {/* Marco del área de trazado */}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={plotW}
          height={plotH}
          fill="none"
          stroke="#475569"
          strokeWidth="1"
        />

        {/* Eje de meses */}
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
            <text x={scaleX(tick.x)} y={H - 8} fill="#94a3b8" fontSize="9" textAnchor="middle">
              {tick.label}
            </text>
          </g>
        ))}

        {/* Curvas ideales por reto */}
        {ideals.map(({ ev, path, opacity, strokeWidth }) => (
          <path
            key={ev.code}
            d={path}
            fill="none"
            stroke={ev.color}
            strokeWidth={strokeWidth}
            strokeDasharray="8 5"
            opacity={opacity}
          />
        ))}

        {/* Proyección futura */}
        {projectionPath ? (
          <path
            d={projectionPath}
            fill="none"
            stroke={PROJECTION_COLOR}
            strokeWidth="2.5"
            strokeDasharray="3 5"
            strokeLinecap="round"
            opacity={0.95}
          />
        ) : null}

        {/* Área rellena con gradiente suave bajo la curva real */}
        {actualAreaPath ? <path d={actualAreaPath} fill="url(#prepActualGradient)" /> : null}

        {/* Trazo continuo nítido de la serie real */}
        {actualPath ? (
          <path
            d={actualPath}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {/* Nodos clave serie real: Inicio */}
        {firstPoint && (
          <circle
            cx={scaleX(firstPoint.x)}
            cy={scaleY(firstPoint.y)}
            r={3.5}
            fill="#f1f5f9"
            stroke="#0f172a"
            strokeWidth="1.5"
          />
        )}

        {/* Nodos clave serie real: Hoy (con halo destacado y cápsula de valor actual) */}
        {todayPoint && (
          <g key="today-highlight-node">
            <circle
              cx={scaleX(todayPoint.x)}
              cy={scaleY(todayPoint.y)}
              r={9}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="2"
              opacity={0.45}
            />
            <circle
              cx={scaleX(todayPoint.x)}
              cy={scaleY(todayPoint.y)}
              r={5}
              fill="#f1f5f9"
              stroke="#0f172a"
              strokeWidth="2"
            />
            {/* Cápsula de valor para hoy */}
            {(() => {
              const bx = scaleX(todayPoint.x) - 15;
              const by = scaleY(todayPoint.y) - 24;
              return (
                <g>
                  <rect
                    x={bx}
                    y={by}
                    width={30}
                    height={16}
                    rx={4}
                    fill="#0f172a"
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                  <text
                    x={bx + 15}
                    y={by + 11.5}
                    fill="#f1f5f9"
                    fontSize="9.5"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {todayPoint.y}
                  </text>
                </g>
              );
            })()}
          </g>
        )}

        {/* Puntos y etiquetas proyectadas en cada reto (sin corte en borde derecho) */}
        {atEvents.map(({ event, projected }) => {
          if (event.eventDate > chartEnd) return null;
          const dx = scaleX(timeFraction(event.eventDate, chartStart, chartEnd));
          const dy = scaleY(projected);
          const isNearRight = dx > W - 56;
          const badgeW = 28;
          const badgeH = 16;
          const badgeX = isNearRight ? dx - badgeW - 6 : dx + 6;
          const badgeY = dy - badgeH / 2;
          const isFocused = focusedEvent === event.code;

          return (
            <g key={`proj-${event.code}`} opacity={focusedEvent && !isFocused ? 0.35 : 1}>
              <circle
                cx={dx}
                cy={dy}
                r={isFocused ? 7 : 5.5}
                fill={PROJECTION_COLOR}
                stroke="#0f172a"
                strokeWidth="2"
              />
              <rect
                x={badgeX}
                y={badgeY}
                width={badgeW}
                height={badgeH}
                rx={5}
                fill="#1e1b4b"
                stroke={isFocused ? "#ffffff" : PROJECTION_COLOR}
                strokeWidth={isFocused ? 1.5 : 1}
              />
              <text
                x={badgeX + badgeW / 2}
                y={badgeY + 11.5}
                fill={isFocused ? "#ffffff" : PROJECTION_COLOR}
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
              >
                {projected}
              </text>
            </g>
          );
        })}

        {/* Hitos de reto (líneas verticales y etiquetas superiores) */}
        {EVENTS.map((ev, idx) => {
          if (ev.eventDate > chartEnd) return null;
          const dx = scaleX(timeFraction(ev.eventDate, chartStart, chartEnd));
          const anchor = dx > W - 80 ? "end" : dx < PAD.left + 48 ? "start" : "middle";
          const isFocused = focusedEvent === ev.code;

          return (
            <g key={ev.code} opacity={focusedEvent && !isFocused ? 0.28 : 1}>
              <line
                x1={dx}
                y1={PAD.top}
                x2={dx}
                y2={PAD.top + plotH}
                stroke={ev.color}
                strokeWidth={isFocused ? 2 : 1.5}
                opacity={0.65}
              />
              <text
                x={anchor === "end" ? Math.min(dx, W - 8) : dx}
                y={eventLabelY[idx] ?? PAD.top - 8}
                fill={ev.color}
                fontSize={isFocused ? "10.5" : "10"}
                fontWeight={isFocused ? "700" : "600"}
                textAnchor={anchor}
              >
                {ev.shortLabel}
              </text>
            </g>
          );
        })}

        {/* Línea vertical de hoy */}
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

        {/* Inspector Crosshair interactivo */}
        {hoverData && (
          <g className="prep-crosshair" pointerEvents="none">
            <line
              x1={hoverData.x}
              y1={PAD.top}
              x2={hoverData.x}
              y2={PAD.top + plotH}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              strokeWidth="1.25"
            />
            <circle
              cx={hoverData.x}
              cy={hoverData.y}
              r={7}
              fill={hoverData.type === "real" ? "#f1f5f9" : PROJECTION_COLOR}
              stroke="#0f172a"
              strokeWidth="2.5"
            />
          </g>
        )}
      </svg>

      {/* Leyenda del Gráfico */}
      <ul className="chart-legend">
        <li>
          <span className="legend-line legend-actual" /> Tu estado (real)
        </li>
        <li>
          <span className="legend-line legend-projection" /> Proyección (ritmo actual)
        </li>
        {EVENTS.map((ev) => (
          <li
            key={ev.code}
            style={{
              opacity: focusedEvent && focusedEvent !== ev.code ? 0.35 : 1,
              cursor: "pointer",
            }}
            onClick={() => selectEventFocus(ev.code)}
          >
            <span className="legend-line" style={{ borderColor: ev.color }} /> Ideal {ev.shortLabel}
          </li>
        ))}
      </ul>

      {/* Tabla de proyección sincronizada con mini barras de progreso */}
      <div className="projection-table-wrap">
        <table className="projection-table">
          <thead>
            <tr>
              <th>Reto</th>
              <th>Fecha</th>
              <th>Proyección</th>
              <th>Progreso</th>
              <th>Ideal reto</th>
              <th>Gap</th>
            </tr>
          </thead>
          <tbody>
            {atEvents.map(({ event, projected, target, gap }) => {
              const isFocused = focusedEvent === event.code;
              const progressPct = calculateProgressPercent(projected, target);
              return (
                <tr
                  key={event.code}
                  className={`prep-table-row ${isFocused ? "row-focused" : ""}`}
                  onClick={() => selectEventFocus(event.code)}
                  title="Haz clic para enfocar este reto en el gráfico"
                >
                  <td className="prep-reto-cell">
                    <span className="prep-reto-dot" style={{ backgroundColor: event.color }} />
                    {event.href ? (
                      <a
                        href={event.href}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {event.shortLabel}
                      </a>
                    ) : (
                      event.shortLabel
                    )}
                  </td>
                  <td>{formatDateEsCO(event.eventDate)}</td>
                  <td className="proj-val">{projected}</td>
                  <td>
                    <div className="prep-progress-cell">
                      <div className="prep-progress-track">
                        <div
                          className="prep-progress-fill"
                          style={{
                            width: `${progressPct}%`,
                            backgroundColor: event.color,
                          }}
                        />
                      </div>
                      <span className="prep-progress-pct">{progressPct}%</span>
                    </div>
                  </td>
                  <td>{target}</td>
                  <td className={gap <= 0 ? "gap-ok" : "gap-warn"}>
                    {gap <= 0 ? `+${Math.abs(gap)}` : `−${gap}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="muted chart-caption" style={{ marginTop: "0.5rem" }}>
        Ventana: {formatDateEsCO(chartStart)} → {formatDateEsCO(chartEnd)} · hoy {formatDateEsCO(todayIso)}
      </p>
    </div>
  );
}
