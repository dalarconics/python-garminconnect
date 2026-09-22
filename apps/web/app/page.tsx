import { PreparationChart } from "@/components/PreparationChart";
import { RecoveryMilestonesCard } from "@/components/RecoveryMilestonesCard";
import { buildActualSeries } from "@/lib/preparation";
import { MVP_USER_ID, supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReadinessRow = {
  readiness_date: string;
  zone: string;
  score_ok: number | null;
  hrv: number | null;
  bb_change: number | null;
  sleep_h: number | null;
  sleep_score: number | null;
  stress: number | null;
  recommendation: string | null;
  thresholds: Record<string, number> | null;
};

type HistoryRow = {
  readiness_date: string;
  zone: string;
  score_ok: number | null;
  hrv: number | null;
};

type SnapshotPayload = {
  date?: string;
  macrocycle?: { code?: string; name?: string; focus?: string; hr_cap?: number };
  milestones?: { code: string; days_remaining: number }[];
  session?: {
    title?: string;
    action?: string;
    sport?: string;
    duration_min?: number;
    hr_cap?: number;
    guard_flags?: string[];
    details?: string[];
  };
  training_load?: {
    status_phrase?: string;
    acwr?: number;
    acwr_status?: string;
    vo2max?: number;
  };
  readiness?: { recommendation?: string };
  thresholds?: Record<string, number>;
};

type SnapshotRow = {
  snapshot_date: string;
  payload: SnapshotPayload;
  updated_at?: string;
};

type LoadRow = { load_date: string; acwr: number | null; vo2max: number | null };

async function fetchDashboard() {
  const [readinessRes, snapshotRes, historyRes, loadRes, trendRes] = await Promise.all([
    supabase
      .from("readiness_daily")
      .select(
        "readiness_date, zone, score_ok, hrv, bb_change, sleep_h, sleep_score, stress, recommendation, thresholds"
      )
      .eq("user_id", MVP_USER_ID)
      .order("readiness_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("daily_snapshots")
      .select("snapshot_date, payload, updated_at")
      .eq("user_id", MVP_USER_ID)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("readiness_daily")
      .select("readiness_date, zone, score_ok, hrv")
      .eq("user_id", MVP_USER_ID)
      .order("readiness_date", { ascending: false })
      .limit(14),
    supabase
      .from("training_load")
      .select("load_date, acwr, vo2max")
      .eq("user_id", MVP_USER_ID)
      .order("load_date", { ascending: false })
      .limit(60),
    supabase
      .from("readiness_daily")
      .select("readiness_date, zone, score_ok, hrv, thresholds")
      .eq("user_id", MVP_USER_ID)
      .order("readiness_date", { ascending: false })
      .limit(45),
  ]);

  const loadByDate = new Map<string, LoadRow>();
  for (const row of (loadRes.data || []) as LoadRow[]) {
    loadByDate.set(row.load_date, row);
  }

  const trendRows = ((trendRes.data || []) as ReadinessRow[]).map((r) => {
    const load = loadByDate.get(r.readiness_date);
    return {
      date: r.readiness_date,
      zone: r.zone,
      score_ok: r.score_ok,
      hrv: r.hrv,
      acwr: load?.acwr ?? null,
      vo2max: load?.vo2max ?? null,
      hrv_threshold: r.thresholds?.hrv,
    };
  });

  return {
    readiness: readinessRes.data as ReadinessRow | null,
    snapshot: snapshotRes.data as SnapshotRow | null,
    history: (historyRes.data || []) as HistoryRow[],
    preparationTrend: buildActualSeries(trendRows),
    error: readinessRes.error?.message || snapshotRes.error?.message,
  };
}

function zoneClass(zone: string) {
  return `badge badge-${zone}`;
}

function metricStatus(
  value: number | null | undefined,
  ok: boolean | null
): "ok" | "warn" | "bad" | "na" {
  if (value == null || ok == null) return "na";
  return ok ? "ok" : value !== null ? "bad" : "na";
}

function buildFocusItems(
  readiness: ReadinessRow | null,
  payload: SnapshotPayload
): string[] {
  const items: string[] = [];
  const th = readiness?.thresholds || payload.thresholds || {};
  const r = readiness;

  if (r?.sleep_h != null && th.sleep_h != null && r.sleep_h < th.sleep_h) {
    items.push(`Sueño ${r.sleep_h.toFixed(1)} h — meta ≥${th.sleep_h} h`);
  }
  if (r?.sleep_score != null && th.sleep_score != null && r.sleep_score < th.sleep_score) {
    items.push(`Sleep score ${r.sleep_score} — meta ≥${th.sleep_score}`);
  }
  if (r?.hrv != null && th.hrv != null && r.hrv < th.hrv) {
    items.push(`HRV ${r.hrv.toFixed(0)} ms — meta ≥${th.hrv} ms`);
  }
  if (r?.bb_change != null && th.bb_change != null && r.bb_change < th.bb_change) {
    items.push(`Body Battery +${r.bb_change} — meta ≥+${th.bb_change}`);
  }
  const acwr = payload.training_load?.acwr;
  if (acwr != null && acwr > 1.3) {
    items.push(`ACWR ${acwr.toFixed(1)} — meta <1.3 (descanso hasta baje)`);
  }
  if (payload.training_load?.status_phrase === "OVERREACHING") {
    items.push("Garmin: OVERREACHING — cero intensidad");
  }
  if (items.length === 0 && r?.zone === "VERDE") {
    items.push("Indicadores alineados — puedes confirmar sesión del día");
  }
  return items;
}

function buildWins(readiness: ReadinessRow | null, payload: SnapshotPayload): string[] {
  const wins: string[] = [];
  const th = readiness?.thresholds || payload.thresholds || {};
  const r = readiness;
  if (r?.sleep_h != null && th.sleep_h != null && r.sleep_h >= th.sleep_h) {
    wins.push(`Sueño ${r.sleep_h.toFixed(1)} h ✓`);
  }
  if (r?.stress != null && th.stress_max != null && r.stress <= th.stress_max) {
    wins.push(`Estrés ${r.stress} ✓`);
  }
  const acwr = payload.training_load?.acwr;
  if (acwr != null && acwr < 2.2) {
    wins.push(`ACWR bajando (${acwr.toFixed(1)})`);
  }
  if (payload.training_load?.vo2max != null) {
    wins.push(`VO₂max ${payload.training_load.vo2max} — base conservada`);
  }
  return wins;
}

const RULES = [
  "Max 2 cafés antes de las 11:00",
  "Sueño ≥7.5 h esta noche",
  "0 alcohol post-carga",
  "ACWR objetivo <1.3",
  "80% del tiempo en Z1–Z2",
  "Hidratación 2.5–3 L/día",
  "Proteína ≥110 g/día",
];

export default async function HomePage() {
  const { readiness, snapshot, history, preparationTrend, error } = await fetchDashboard();
  const payload = snapshot?.payload || {};
  const th = readiness?.thresholds || payload.thresholds || {};

  const counts = { VERDE: 0, AMARILLO: 0, ROJO: 0 };
  for (const row of history) {
    if (row.zone in counts) counts[row.zone as keyof typeof counts]++;
  }
  const total = history.length || 1;

  if (error && !readiness) {
    return (
      <main>
        <h1>Fitness Coach</h1>
        <p className="muted">Configure NEXT_PUBLIC_SUPABASE_URL y ANON_KEY. {error}</p>
      </main>
    );
  }

  const zone = readiness?.zone || "?";
  const focus = buildFocusItems(readiness, payload);
  const wins = buildWins(readiness, payload);
  const session = payload.session || {};
  const training = payload.training_load || {};
  const dateLabel = readiness?.readiness_date || snapshot?.snapshot_date || "—";
  const ruleIdx = dateLabel !== "—" ? new Date(dateLabel).getDay() % RULES.length : 0;

  const metrics = [
    {
      label: "Sueño",
      value: readiness?.sleep_h != null ? `${readiness.sleep_h.toFixed(1)} h` : "—",
      ok: readiness?.sleep_h != null && th.sleep_h != null ? readiness.sleep_h >= th.sleep_h : null,
    },
    {
      label: "Sleep score",
      value: readiness?.sleep_score?.toString() ?? "—",
      ok:
        readiness?.sleep_score != null && th.sleep_score != null
          ? readiness.sleep_score >= th.sleep_score
          : null,
    },
    {
      label: "HRV",
      value: readiness?.hrv != null ? `${readiness.hrv.toFixed(0)} ms` : "—",
      ok: readiness?.hrv != null && th.hrv != null ? readiness.hrv >= th.hrv : null,
    },
    {
      label: "Estrés",
      value: readiness?.stress?.toString() ?? "—",
      ok:
        readiness?.stress != null && th.stress_max != null
          ? readiness.stress <= th.stress_max
          : null,
    },
    {
      label: "BB Δ",
      value: readiness?.bb_change != null ? `+${readiness.bb_change}` : "—",
      ok:
        readiness?.bb_change != null && th.bb_change != null
          ? readiness.bb_change >= th.bb_change
          : null,
    },
  ];

  return (
    <main>
      <header className="header">
        <div>
          <h1 style={{ margin: 0 }}>Fitness Coach</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            {dateLabel} · actualiza ~06:00 Bogotá
          </p>
        </div>
      </header>

      <RecoveryMilestonesCard
        todayIso={dateLabel !== "—" ? dateLabel : new Date().toISOString().slice(0, 10)}
        acwr={training.acwr}
        phaseCode={payload.macrocycle?.code}
        phaseName={payload.macrocycle?.name}
      />

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Preparación vs retos</h2>
        <PreparationChart
          actual={preparationTrend}
          todayIso={dateLabel !== "—" ? dateLabel : new Date().toISOString().slice(0, 10)}
        />
      </section>

      <section className="card card-highlight">
        <h2 style={{ marginTop: 0 }}>Hoy</h2>
        <span className={zoneClass(zone)}>
          {zone} {readiness?.score_ok ?? "?"}/5
        </span>
        <p className="recommendation">
          {readiness?.recommendation || payload.readiness?.recommendation || "—"}
        </p>
        <div className="metrics-grid">
          {metrics.map((m) => (
            <div key={m.label} className={`metric-cell ${metricStatus(null, m.ok)}`}>
              <span className="metric-label">{m.label}</span>
              <span className="metric-value">{m.value}</span>
            </div>
          ))}
        </div>
        {training.status_phrase || training.acwr != null ? (
          <p className="load-line">
            Carga: {training.status_phrase || "—"}
            {training.acwr != null ? ` · ACWR ${training.acwr.toFixed(1)}` : ""}
            {training.vo2max != null ? ` · VO₂ ${training.vo2max}` : ""}
          </p>
        ) : null}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Sesión</h2>
        <p className="session-title">{session.title || session.action || "—"}</p>
        {session.duration_min != null && session.duration_min > 0 ? (
          <p className="muted">
            {session.duration_min} min · FC techo {session.hr_cap ?? payload.macrocycle?.hr_cap}{" "}
            bpm
          </p>
        ) : null}
        {(session.details || []).map((d) => (
          <p key={d} className="detail-line">
            {d}
          </p>
        ))}
        {session.guard_flags?.length ? (
          <p className="guards">Guards: {session.guard_flags.join(" · ")}</p>
        ) : null}
      </section>

      <div className="two-col">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Qué atender</h2>
          <ul className="list">
            {focus.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Qué va bien</h2>
          <ul className="list list-ok">
            {wins.length ? wins.map((w) => <li key={w}>{w}</li>) : <li>—</li>}
          </ul>
        </section>
      </div>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Macrociclo</h2>
        <p style={{ margin: 0 }}>
          {payload.macrocycle?.code} {payload.macrocycle?.name}
        </p>
        <p className="muted">{payload.macrocycle?.focus}</p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Regla del día</h2>
        <p style={{ margin: 0 }}>{RULES[ruleIdx]}</p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Tendencia 14d</h2>
        <div className="chart-bar">
          <span style={{ width: `${(counts.VERDE / total) * 100}%`, background: "var(--verde)" }} />
          <span
            style={{ width: `${(counts.AMARILLO / total) * 100}%`, background: "var(--amarillo)" }}
          />
          <span style={{ width: `${(counts.ROJO / total) * 100}%`, background: "var(--rojo)" }} />
        </div>
        <p className="muted">
          VERDE {counts.VERDE} · AMARILLO {counts.AMARILLO} · ROJO {counts.ROJO}
        </p>
        <table className="history-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Zona</th>
              <th>HRV</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.readiness_date}>
                <td>{row.readiness_date}</td>
                <td>
                  <span className={zoneClass(row.zone)}>{row.zone}</span>
                </td>
                <td>{row.hrv?.toFixed(0) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
