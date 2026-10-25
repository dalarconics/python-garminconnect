import {
  formatActivityWhen,
  formatDistanceKm,
  formatDurationMin,
  garminActivityUrl,
  sportLabel,
  type LastActivity,
} from "@/lib/lastActivity";

export type LastActivityWithPower = LastActivity & {
  avg_power?: number | null;
  max_power?: number | null;
  norm_power?: number | null;
  intensity_factor?: number | null;
  training_stress_score?: number | null;
  avg_cadence?: number | null;
};

type Props = {
  activity: LastActivityWithPower | null | undefined;
};

export function LastActivityCard({ activity }: Props) {
  if (!activity) {
    return (
      <section className="card">
        <h2 className="mt-0">Última actividad</h2>
        <p className="muted m-0">
          Sin actividades recientes registradas en el snapshot. Pulsa Actualizar para sincronizar los datos de Garmin.
        </p>
      </section>
    );
  }

  const href = garminActivityUrl(activity.activity_id);
  const subtitle = sportLabel(activity.sport || activity.type_key || activity.type_label);
  const hasPower =
    activity.avg_power != null || activity.norm_power != null || activity.max_power != null;

  return (
    <section className="card">
      <h2 className="mt-0">Última actividad</h2>
      <p className="last-activity-title">
        <a href={href} target="_blank" rel="noreferrer">
          {activity.name}
        </a>
      </p>
      <p className="muted last-activity-meta">
        {subtitle} · {formatActivityWhen(activity.start_time_local)}
      </p>
      <div className="metrics-grid last-activity-metrics">
        <div className="metric-cell na">
          <span className="metric-label">Duración</span>
          <span className="metric-value">{formatDurationMin(activity.duration_min)}</span>
        </div>
        <div className="metric-cell na">
          <span className="metric-label">Distancia</span>
          <span className="metric-value">{formatDistanceKm(activity.distance_km)}</span>
        </div>
        <div className="metric-cell na">
          <span className="metric-label">FC media</span>
          <span className="metric-value">
            {activity.avg_hr != null ? `${activity.avg_hr} bpm` : "—"}
          </span>
        </div>
        <div className="metric-cell na">
          <span className="metric-label">Carga</span>
          <span className="metric-value">
            {activity.training_load != null ? activity.training_load.toFixed(0) : "—"}
          </span>
        </div>
        {hasPower ? (
          <>
            <div className="metric-cell na">
              <span className="metric-label">Potencia media</span>
              <span className="metric-value">
                {activity.avg_power != null ? `${activity.avg_power} W` : "—"}
              </span>
            </div>
            <div className="metric-cell na">
              <span className="metric-label">NP</span>
              <span className="metric-value">
                {activity.norm_power != null ? `${activity.norm_power} W` : "—"}
              </span>
            </div>
            <div className="metric-cell na">
              <span className="metric-label">Potencia máx</span>
              <span className="metric-value">
                {activity.max_power != null ? `${activity.max_power} W` : "—"}
              </span>
            </div>
          </>
        ) : null}
      </div>
      {(activity.elevation_gain_m != null && activity.elevation_gain_m > 0) ||
      activity.calories != null ||
      activity.avg_cadence != null ||
      activity.training_stress_score != null ? (
        <p className="load-line">
          {[
            activity.elevation_gain_m != null && activity.elevation_gain_m > 0
              ? `+${Math.round(activity.elevation_gain_m)} m desnivel`
              : null,
            activity.calories != null ? `${activity.calories} kcal` : null,
            activity.avg_cadence != null ? `${activity.avg_cadence} rpm` : null,
            activity.intensity_factor != null ? `IF ${activity.intensity_factor.toFixed(2)}` : null,
            activity.training_stress_score != null
              ? `TSS ${activity.training_stress_score.toFixed(0)}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
    </section>
  );
}
