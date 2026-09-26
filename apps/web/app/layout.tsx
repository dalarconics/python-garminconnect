import type { Metadata } from "next";
import { DashboardNav } from "@/components/DashboardNav";
import pkg from "../package.json";
import "./globals.css";

function appVersion(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  return sha ? `v${pkg.version} · ${sha}` : `v${pkg.version}`;
}

export const metadata: Metadata = {
  title: "Fitness Coach — Diego",
  description: "Coaching dashboard (vChallenges 21K, mmB 2027, Letras, 70.3 Cartagena)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="app-shell">
          <DashboardNav version={appVersion()} />
          <div className="app-main">{children}</div>
        </div>
      </body>
    </html>
  );
}
