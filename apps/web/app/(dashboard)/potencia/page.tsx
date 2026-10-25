import { fetchDashboard, type SnapshotPayload } from "@/lib/dashboard";
import { buildCyclingPowerSummary } from "@/lib/potencia";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PotenciaPage() {
  const { snapshot, error } = await fetchDashboard();
  const payload: SnapshotPayload = snapshot?.payload || {};
  const training = payload.training_load || {};

  const summary = buildCyclingPowerSummary(
    training.cycling_power,
    payload.last_activity,
    training.vo2max_cycling ?? training.vo2max
  );

  return (
    <main>
      <header className="page-header">
        <h1 className="page-title">Potencia de ciclismo</h1>
        <p className="page-subtitle muted">
          Umbral funcional (FTP), zonas fisiológicas de Coggan y prescripción de vatios para Reto
          Letras e Ironman 70.3 Cartagena
        </p>
      </header>

      {error && !snapshot ? (
        <section className="card">
          <p className="muted m-0">
            No se pudo sincronizar el último snapshot desde Supabase ({error}). Mostrando cálculo
            base de referencia.
          </p>
        </section>
      ) : null}

      {summary.referenceNotice ? (
        <section className="card power-reference-banner" aria-label="Aviso de FTP de referencia">
          <p className="m-0">{summary.referenceNotice}</p>
        </section>
      ) : null}

      {/* Sección 1: Tarjetas KPI Superiores */}
      <section className="card power-kpi-section" aria-labelledby="heading-power-kpis">
        <div className="section-title-wrap">
          <h2 id="heading-power-kpis" className="mt-0">
            Indicadores clave de ciclismo
          </h2>
          <span className="zone-compliance-badge">
            {summary.isReferenceFtp ? "FTP Referencia (220 W)" : "FTP Garmin Sincronizado"}
          </span>
        </div>

        <div className="trend-metrics-grid power-kpi-grid">
          <div className="trend-metric-card">
            <span className="metric-card-label">FTP Ciclismo</span>
            <span className="metric-card-value tabular-nums">{summary.ftpWatts} W</span>
            <span className="muted" style={{ fontSize: "0.78rem" }}>
              {summary.lthrCycling != null
                ? `FC Umbral bici: ${summary.lthrCycling} bpm`
                : "Umbral funcional 60 min"}
            </span>
          </div>

          <div className="trend-metric-card">
            <span className="metric-card-label">Relación Peso-Potencia</span>
            <span className="metric-card-value tabular-nums">{summary.wPerKg.toFixed(2)} W/kg</span>
            <span className="muted" style={{ fontSize: "0.78rem" }}>
              Clave de ascenso (Letras)
            </span>
          </div>

          <div className="trend-metric-card">
            <span className="metric-card-label">VO₂máx Ciclismo</span>
            <span className="metric-card-value tabular-nums">
              {summary.vo2maxCycling != null ? `${summary.vo2maxCycling} ml/kg` : "—"}
            </span>
            <span className="muted" style={{ fontSize: "0.78rem" }}>
              Capacidad aeróbica específica
            </span>
          </div>

          <div className="trend-metric-card">
            <span className="metric-card-label">NP / Potencia última sesión</span>
            <span className="metric-card-value tabular-nums">
              {summary.lastRide.normPower != null
                ? `${summary.lastRide.normPower} W`
                : summary.lastRide.avgPower != null
                  ? `${summary.lastRide.avgPower} W`
                  : "—"}
            </span>
            <span className="muted" style={{ fontSize: "0.78rem" }}>
              Media: {summary.lastRide.avgPower != null ? `${summary.lastRide.avgPower} W` : "—"} ·
              Máx: {summary.lastRide.maxPower != null ? `${summary.lastRide.maxPower} W` : "—"} ·
              VI: {summary.lastRide.variabilityIndex != null ? summary.lastRide.variabilityIndex : "—"}
            </span>
          </div>

          <div className="trend-metric-card">
            <span className="metric-card-label">Carga de Potencia (IF / TSS)</span>
            <span className="metric-card-value tabular-nums">
              {summary.lastRide.intensityFactor != null
                ? `IF ${summary.lastRide.intensityFactor.toFixed(2)}`
                : "—"}
            </span>
            <span className="muted" style={{ fontSize: "0.78rem" }}>
              TSS:{" "}
              {summary.lastRide.trainingStressScore != null
                ? summary.lastRide.trainingStressScore
                : "—"}{" "}
              · Cadencia:{" "}
              {summary.lastRide.avgCadence != null ? `${summary.lastRide.avgCadence} rpm` : "—"}
            </span>
          </div>
        </div>
      </section>

      {/* Sección 2: 7 Zonas de Potencia de Coggan */}
      <section className="card power-zones-section" aria-labelledby="heading-coggan-zones">
        <h2 id="heading-coggan-zones" className="mt-0">
          7 Zonas de Potencia (Dr. Andrew Coggan · FTP {summary.ftpWatts} W)
        </h2>
        <p className="muted">
          Distribución de intensidades en vatios para estructurar rodadas regenerativas, fondo
          aeróbico (Z2), puertos sostenidos (Z3/Sweet Spot) y estímulos de umbral (Z4).
        </p>

        <div className="power-zones-list">
          {summary.zones.map((z) => (
            <div key={z.code} className="power-zone-row">
              <div className="power-zone-header">
                <div className="power-zone-title-group">
                  <span
                    className="power-zone-badge"
                    style={{ backgroundColor: `${z.color}22`, color: z.color, borderColor: z.color }}
                  >
                    {z.code}
                  </span>
                  <strong className="power-zone-name">{z.name}</strong>
                  <span className="power-zone-pct muted tabular-nums">({z.pctRangeLabel})</span>
                </div>
                <div className="power-zone-watts tabular-nums" style={{ color: z.color }}>
                  {z.maxWatts != null ? `${z.minWatts} – ${z.maxWatts} W` : `≥ ${z.minWatts} W`}
                </div>
              </div>

              <div className="power-zone-bar-track" aria-hidden="true">
                <div
                  className="power-zone-bar-fill"
                  style={{ width: `${z.barWidthPct}%`, backgroundColor: z.color }}
                />
              </div>

              <p className="power-zone-desc muted m-0">{z.adaptation}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sección 3: Objetivos de Potencia por Reto (Letras y 70.3 Cartagena) */}
      <section className="card power-targets-section" aria-labelledby="heading-power-targets">
        <h2 id="heading-power-targets" className="mt-0">
          Objetivos de potencia por reto (Letras y 70.3 Cartagena)
        </h2>
        <p className="muted">
          Prescripción específica de vatios e índice de esfuerzo para maximizar el rendimiento en
          ascenso de gran fondo y proteger la carrera a pie en media distancia.
        </p>

        <div className="power-targets-grid">
          {summary.targets.map((target) => (
            <article
              key={target.code}
              className="power-target-card"
              style={{ borderLeft: `4px solid ${target.color}` }}
            >
              <div className="power-target-header">
                <div>
                  <h3 className="power-target-title" style={{ color: target.color }}>
                    {target.title}
                  </h3>
                  <p className="muted m-0" style={{ fontSize: "0.82rem" }}>
                    {target.subtitle}
                  </p>
                </div>
                <div className="power-target-watt-pill tabular-nums" style={{ borderColor: target.color }}>
                  {target.minWatts}–{target.maxWatts} W
                </div>
              </div>

              <div className="power-target-meta">
                <span>
                  <strong className="muted">Zona:</strong> {target.zoneLabel} ({target.pctRangeLabel})
                </span>
                <span>
                  <strong className="muted">Control:</strong> {target.targetIfLabel}
                </span>
                <span>
                  <strong className="muted">Cadencia:</strong> {target.cadenceLabel}
                </span>
              </div>

              <p className="power-target-rationale m-0">{target.rationale}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
