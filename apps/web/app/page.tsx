import { MVP_USER_ID, supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type ReadinessRow = {
  readiness_date: string;
  zone: string;
  score_ok: number | null;
  hrv: number | null;
  bb_change: number | null;
};

type SnapshotRow = {
  snapshot_date: string;
  payload: {
    macrocycle?: { code?: string; name?: string };
    milestones?: { code: string; days_remaining: number }[];
    session?: { title?: string; action?: string; guard_flags?: string[] };
    whatsapp_message?: string;
  };
};

async function fetchDashboard() {
  const [readinessRes, snapshotRes, historyRes] = await Promise.all([
    supabase
      .from("readiness_daily")
      .select("readiness_date, zone, score_ok, hrv, bb_change")
      .eq("user_id", MVP_USER_ID)
      .order("readiness_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("daily_snapshots")
      .select("snapshot_date, payload")
      .eq("user_id", MVP_USER_ID)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("readiness_daily")
      .select("zone")
      .eq("user_id", MVP_USER_ID)
      .order("readiness_date", { ascending: false })
      .limit(14),
  ]);

  return {
    readiness: readinessRes.data as ReadinessRow | null,
    snapshot: snapshotRes.data as SnapshotRow | null,
    history: (historyRes.data || []) as { zone: string }[],
    error: readinessRes.error?.message || snapshotRes.error?.message,
  };
}

function zoneColor(zone: string) {
  return `badge badge-${zone}`;
}

export default async function HomePage() {
  const { readiness, snapshot, history, error } = await fetchDashboard();
  const payload = snapshot?.payload || {};
  const mmb = payload.milestones?.find((m) => m.code === "mmb_2027");
  const letras = payload.milestones?.find((m) => m.code === "reto_letras_2027");

  const counts = { VERDE: 0, AMARILLO: 0, ROJO: 0 };
  for (const row of history) {
    if (row.zone in counts) counts[row.zone as keyof typeof counts]++;
  }
  const total = history.length || 1;

  if (error && !readiness) {
    return (
      <main>
        <h1>Fitness Coach</h1>
        <p className="muted">Configure NEXT_PUBLIC_SUPABASE_URL and ANON_KEY. {error}</p>
      </main>
    );
  }

  const zone = readiness?.zone || "?";

  return (
    <main>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Fitness Coach</h1>
        <span className="muted">mmB {mmb?.days_remaining ?? "?"}d</span>
      </header>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Hoy</h2>
        <span className={zoneColor(zone)}>{zone} {readiness?.score_ok ?? "?"}/5</span>
        <div className="metric-row">
          <span>HRV {readiness?.hrv?.toFixed(0) ?? "?"}</span>
          <span>BB +{readiness?.bb_change?.toFixed(0) ?? "?"}</span>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Macrociclo</h2>
        <p style={{ margin: 0 }}>
          {payload.macrocycle?.code} {payload.macrocycle?.name}
        </p>
        <p className="muted">Reto Letras: {letras?.days_remaining ?? "?"}d</p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Sesion</h2>
        <p style={{ margin: 0 }}>{payload.session?.title || payload.session?.action || "—"}</p>
        {payload.session?.guard_flags?.length ? (
          <p className="muted">Guards: {payload.session.guard_flags.join(", ")}</p>
        ) : null}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Tendencia 14d</h2>
        <div className="chart-bar">
          <span style={{ width: `${(counts.VERDE / total) * 100}%`, background: "var(--verde)" }} />
          <span style={{ width: `${(counts.AMARILLO / total) * 100}%`, background: "var(--amarillo)" }} />
          <span style={{ width: `${(counts.ROJO / total) * 100}%`, background: "var(--rojo)" }} />
        </div>
        <p className="muted">
          VERDE {counts.VERDE} · AMARILLO {counts.AMARILLO} · ROJO {counts.ROJO}
        </p>
      </section>
    </main>
  );
}
