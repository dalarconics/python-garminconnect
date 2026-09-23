import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Asks GitHub Actions to collect Garmin and write Supabase. Runs on Vercel, not on the Mac. */
export async function POST() {
  const token = process.env.ACTIONS_DISPATCH_TOKEN;
  const repo = process.env.ACTIONS_DISPATCH_REPO || "dalarconics/python-garminconnect";
  const ref = process.env.ACTIONS_DISPATCH_REF || "master";

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Falta ACTIONS_DISPATCH_TOKEN en el proyecto de Vercel" },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/coaching-daily-collect.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref }),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      return NextResponse.json(
        { ok: false, error: detail || `GitHub respondió ${res.status}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      pending: true,
      message: "Recolección en curso en GitHub. Tarda 1–2 min; vuelve a abrir Hoy.",
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "No se pudo actualizar";
    return NextResponse.json({ ok: false, error }, { status: 502 });
  }
}
