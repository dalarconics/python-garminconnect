import {
  EVENTS,
  daysUntilAcwrTarget,
  recoveryLocalDaysRemaining,
} from "@/lib/preparation";

type Props = {
  todayIso: string;
  acwr: number | null | undefined;
  phaseCode?: string;
  phaseName?: string;
};

function daysToEvent(eventDate: string, todayIso: string): number {
  const a = new Date(todayIso + "T12:00:00").getTime();
  const b = new Date(eventDate + "T12:00:00").getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function RecoveryMilestonesCard({ todayIso, acwr, phaseCode, phaseName }: Props) {
  const recoveryDays = recoveryLocalDaysRemaining(todayIso);
  const acwrDays = daysUntilAcwrTarget(acwr, 1.0);

  return (
    <section className="card card-recovery">
      <h2 style={{ marginTop: 0 }}>Recuperación local (R0)</h2>
      <div className="recovery-hero">
        <span className="recovery-number">{recoveryDays}</span>
        <span className="recovery-label">
          días para cerrar fase {phaseCode ?? "R0"} {phaseName ? `· ${phaseName}` : ""}
          <br />
          <span className="muted">meta: 5 oct 2026 · ACWR &lt; 1.0</span>
        </span>
      </div>
      {acwr != null && acwr > 1.0 ? (
        <p className="muted" style={{ margin: "0.75rem 0 0" }}>
          ACWR {acwr.toFixed(1)} — estimado ~{acwrDays ?? "?"} días de descanso/Z1 para bajar de 1.0
          (heurística).
        </p>
      ) : (
        <p className="muted" style={{ margin: "0.75rem 0 0" }}>
          ACWR en rango R0 ✓
        </p>
      )}

      <h3 className="milestones-sub">Retos</h3>
      <ul className="milestone-list">
        {EVENTS.map((ev) => (
          <li key={ev.code}>
            <span className="milestone-dot" style={{ background: ev.color }} />
            <span className="milestone-name">
              {ev.href ? (
                <a href={ev.href} target="_blank" rel="noreferrer">
                  {ev.shortLabel}
                </a>
              ) : (
                ev.shortLabel
              )}
            </span>
            <span className="milestone-date">{ev.eventDate}</span>
            <span className="milestone-days">{daysToEvent(ev.eventDate, todayIso)}d</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
