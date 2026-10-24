import { DashboardNav } from "@/components/DashboardNav";
import { getSystemVersions, formatVersionDisplay } from "@/lib/versionInfo";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  const versions = getSystemVersions();
  const { currentLine, previousLine } = formatVersionDisplay(versions, sha);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      <DashboardNav
        version={currentLine}
        currentVersion={currentLine}
        previousVersion={previousLine}
      />
      <div className="app-main" id="main-content" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
