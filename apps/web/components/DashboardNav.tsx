"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Hoy" },
  { href: "/mesociclos", label: "Mesociclos" },
  { href: "/70-3-cartagena", label: "70.3 Cartagena" },
];

type RefreshState = "idle" | "loading" | "ok" | "pending" | "error";

export function DashboardNav() {
  const path = usePathname();
  const router = useRouter();
  const [state, setState] = useState<RefreshState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function refreshStatus() {
    setState("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const body = (await res.json()) as {
        ok?: boolean;
        pending?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !body.ok) {
        setState("error");
        setMessage(body.error || "No se pudo actualizar");
        return;
      }
      if (body.pending) {
        setState("pending");
        setMessage(body.message || "Recolección en curso. Tarda 1–2 min.");
        return;
      }
      setState("ok");
      setMessage("Listo");
      router.refresh();
    } catch {
      setState("error");
      setMessage("No se pudo actualizar");
    }
  }

  return (
    <nav className="dash-nav" aria-label="Secciones">
      {LINKS.map(({ href, label }) => (
        <Link key={href} href={href} className={path === href ? "dash-nav-link active" : "dash-nav-link"}>
          {label}
        </Link>
      ))}
      <button type="button" className="dash-refresh" onClick={refreshStatus} disabled={state === "loading"}>
        {state === "loading" ? "Actualizando…" : "Actualizar"}
      </button>
      {message ? (
        <p className={state === "error" ? "dash-refresh-status error" : "dash-refresh-status"} role="status">
          {message}
        </p>
      ) : null}
    </nav>
  );
}
