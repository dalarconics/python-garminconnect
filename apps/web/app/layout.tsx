import type { Metadata } from "next";
import { DashboardNav } from "@/components/DashboardNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fitness Coach — Diego",
  description: "Read-only coaching dashboard (mmB 2027 + Reto Letras)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <DashboardNav />
        {children}
      </body>
    </html>
  );
}
