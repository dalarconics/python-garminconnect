"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Hoy" },
  { href: "/mesociclos", label: "Mesociclos" },
  { href: "/70-3-cartagena", label: "70.3 Cartagena" },
  { href: "/clima", label: "Clima" },
];

export function DashboardNav() {
  const path = usePathname();
  return (
    <nav className="dash-nav" aria-label="Secciones">
      {LINKS.map(({ href, label }) => (
        <Link key={href} href={href} className={path === href ? "dash-nav-link active" : "dash-nav-link"}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
