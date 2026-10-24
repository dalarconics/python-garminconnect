import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..", "..");
const pagePath = path.join(webRoot, "app", "(dashboard)", "page.tsx");
const globalsCssPath = path.join(webRoot, "app", "globals.css");
const coachChatPath = path.join(webRoot, "components", "CoachChat.tsx");

test("REQ-003 / P03: Posicionamiento de CoachChat como primer componente en Inicio tras page-header y antes de TodayCard", () => {
  const content = fs.readFileSync(pagePath, "utf-8");

  const headerIndex = content.indexOf('<header className="page-header">');
  const coachChatIndex = content.indexOf("<CoachChat");
  const todayCardIndex = content.indexOf("<TodayCard");

  assert.ok(headerIndex !== -1, "page.tsx debe contener <header className=\"page-header\">");
  assert.ok(coachChatIndex !== -1, "page.tsx debe contener <CoachChat />");
  assert.ok(todayCardIndex !== -1, "page.tsx debe contener <TodayCard />");

  assert.ok(
    coachChatIndex > headerIndex,
    "<CoachChat /> debe ubicarse después de <header className=\"page-header\">"
  );
  assert.ok(
    coachChatIndex < todayCardIndex,
    "<CoachChat /> debe ubicarse antes de <TodayCard /> para prioridad de acceso"
  );
});

test("T-0043: CoachChat centrado estilo Hero (max-width 760px, margin 0 auto, saludo Hola Diego, acciones rápidas y sin recorte 28vh)", () => {
  const css = fs.readFileSync(globalsCssPath, "utf-8");

  // .coach-chat centering and bounds
  const coachChatMatch = css.match(/\.coach-chat\s*\{([^}]*)\}/);
  assert.ok(coachChatMatch, ".coach-chat debe existir en globals.css");
  assert.match(coachChatMatch[1], /max-width:\s*760px/, ".coach-chat debe tener max-width: 760px");
  assert.match(coachChatMatch[1], /margin:\s*0\s+auto/, ".coach-chat debe tener margin: 0 auto");
  assert.match(coachChatMatch[1], /width:\s*100%/, ".coach-chat debe tener width: 100%");
  assert.doesNotMatch(
    coachChatMatch[1],
    /max-height:\s*28vh/,
    ".coach-chat no debe tener restricción restrictiva de max-height: 28vh"
  );

  // .coach-composer textarea compact bounds
  const composerTextareaMatch = css.match(/\.coach-composer\s+textarea\s*\{([^}]*)\}/);
  assert.ok(composerTextareaMatch, ".coach-composer textarea debe existir en globals.css");
  assert.match(composerTextareaMatch[1], /resize:\s*none/, ".coach-composer textarea debe tener resize: none");
  assert.match(composerTextareaMatch[1], /min-height:\s*2\.75rem/, ".coach-composer textarea debe tener min-height: 2.75rem");

  // .coach-composer border-radius 14px
  const composerMatch = css.match(/\.coach-composer\s*\{([^}]*)\}/);
  assert.ok(composerMatch, ".coach-composer debe existir en globals.css");
  assert.match(composerMatch[1], /border-radius:\s*14px/, ".coach-composer debe tener border-radius: 14px");

  // .coach-history internal scroll
  const historyMatch = css.match(/\.coach-history\s*\{([^}]*)\}/);
  assert.ok(historyMatch, ".coach-history debe existir en globals.css");
  assert.match(historyMatch[1], /overflow-y:\s*auto/, ".coach-history debe tener overflow-y: auto");

  // CoachChat.tsx componente
  const componentContent = fs.readFileSync(coachChatPath, "utf-8");

  // Saludo centrado
  assert.match(
    componentContent,
    /Hola Diego, ¿cómo te ayudo\?/,
    "CoachChat.tsx debe renderizar el saludo 'Hola Diego, ¿cómo te ayudo?'"
  );
  assert.match(
    componentContent,
    /coach-hero-title/,
    "CoachChat.tsx debe contener encabezado con clase coach-hero-title"
  );

  // Acciones rápidas
  assert.match(
    componentContent,
    /coach-quick-actions/,
    "CoachChat.tsx debe renderizar contenedor de acciones rápidas coach-quick-actions"
  );
  assert.match(componentContent, /🏃 Analizar sesión de hoy/);
  assert.match(componentContent, /🔋 Revisar mi recuperación/);
  assert.match(componentContent, /📈 Ajustar carga semanal/);
  assert.match(componentContent, /🎯 Plan 70\.3 Cartagena/);

  // Textarea rows={2}
  assert.match(
    componentContent,
    /<textarea[\s\S]*?rows=\{2\}/,
    "CoachChat.tsx debe renderizar textarea con rows={2}"
  );

  // Icono de burbuja en historial
  assert.match(
    componentContent,
    /coach-history-bubble-icon/,
    "CoachChat.tsx debe renderizar icono circular coach-history-bubble-icon para cada item"
  );
});
