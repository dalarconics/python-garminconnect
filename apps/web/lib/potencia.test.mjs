import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_FTP_WATTS,
  calculateCogganZones,
  calculateVariabilityIndex,
  buildChallengePowerTargets,
  buildCyclingPowerSummary,
} from "./potencia.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");

test("P22 / ADR-002: lib/potencia.ts es 100% puro sin dependencias de UI, Next.js ni infraestructura", () => {
  const filePath = path.join(webRoot, "lib", "potencia.ts");
  const content = fs.readFileSync(filePath, "utf-8");

  assert.doesNotMatch(content, /from ["']react["']/);
  assert.doesNotMatch(content, /from ["']next/);
  assert.doesNotMatch(content, /from ["']@supabase/);
  assert.doesNotMatch(content, /from ["']openai/);
});

test("calculateCogganZones calcula exactamente las 7 zonas de Coggan (Z1 a Z7) en vatios", () => {
  const zones250 = calculateCogganZones(250);
  assert.strictEqual(zones250.length, 7);
  assert.deepStrictEqual(
    zones250.map((z) => z.code),
    ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6", "Z7"]
  );

  // Z1: 0 - 55% (138 W)
  assert.strictEqual(zones250[0].minWatts, 0);
  assert.strictEqual(zones250[0].maxWatts, 138);

  // Z2: 56 - 75% (140 - 188 W)
  assert.strictEqual(zones250[1].minWatts, 140);
  assert.strictEqual(zones250[1].maxWatts, 188);

  // Z3: 76 - 90% (190 - 225 W)
  assert.strictEqual(zones250[2].minWatts, 190);
  assert.strictEqual(zones250[2].maxWatts, 225);

  // Z4: 91 - 105% (228 - 263 W)
  assert.strictEqual(zones250[3].minWatts, 228);
  assert.strictEqual(zones250[3].maxWatts, 263);

  // Z7: >= 151% (378 W, maxWatts null)
  assert.strictEqual(zones250[6].minWatts, 378);
  assert.strictEqual(zones250[6].maxWatts, null);
});

test("calculateVariabilityIndex y buildChallengePowerTargets prescriben vatios para Letras y 70.3 Cartagena", () => {
  assert.strictEqual(calculateVariabilityIndex(210, 200), 1.05);
  assert.strictEqual(calculateVariabilityIndex(null, 200), null);
  assert.strictEqual(calculateVariabilityIndex(210, 0), null);

  const targets = buildChallengePowerTargets(240);
  assert.strictEqual(targets.length, 2);

  const letras = targets.find((t) => t.code === "reto_letras_2027");
  assert.ok(letras);
  assert.strictEqual(letras.minWatts, Math.round(240 * 0.84));
  assert.strictEqual(letras.maxWatts, Math.round(240 * 0.92));

  const cartagena = targets.find((t) => t.code === "cartagena_703_2027");
  assert.ok(cartagena);
  assert.strictEqual(cartagena.minWatts, Math.round(240 * 0.78));
  assert.strictEqual(cartagena.maxWatts, Math.round(240 * 0.83));
});

test("buildCyclingPowerSummary consolida FTP real de Garmin y fallback de referencia (220 W)", () => {
  // Caso 1: Con FTP real y actividad con potenciómetro
  const realSummary = buildCyclingPowerSummary(
    { ftp_watts: 245, w_per_kg: 3.4, vo2max_cycling: 48.5, lthr_cycling: 164 },
    {
      name: "Fondo Sabana",
      sport: "bike",
      avg_power: 192,
      norm_power: 204,
      max_power: 510,
      intensity_factor: 0.83,
      training_stress_score: 142.5,
      avg_cadence: 86,
    },
    44.0
  );

  assert.strictEqual(realSummary.ftpWatts, 245);
  assert.strictEqual(realSummary.isReferenceFtp, false);
  assert.strictEqual(realSummary.referenceNotice, null);
  assert.strictEqual(realSummary.wPerKg, 3.4);
  assert.strictEqual(realSummary.vo2maxCycling, 48.5);
  assert.strictEqual(realSummary.lthrCycling, 164);
  assert.strictEqual(realSummary.lastRide.hasPower, true);
  assert.strictEqual(realSummary.lastRide.avgPower, 192);
  assert.strictEqual(realSummary.lastRide.normPower, 204);
  assert.strictEqual(realSummary.lastRide.variabilityIndex, 1.06);

  // Caso 2: Sin FTP en snapshot -> usa referencia 220 W con aviso explícito
  const fallbackSummary = buildCyclingPowerSummary(null, null, 43.2, 72);
  assert.strictEqual(fallbackSummary.ftpWatts, DEFAULT_FTP_WATTS);
  assert.strictEqual(fallbackSummary.isReferenceFtp, true);
  assert.ok(fallbackSummary.referenceNotice && fallbackSummary.referenceNotice.includes("220 W"));
  assert.strictEqual(fallbackSummary.vo2maxCycling, 43.2);
  assert.strictEqual(fallbackSummary.lastRide.hasPower, false);
});

test("DashboardNav.tsx incluye enlace /potencia ('Potencia') y LastActivityCard / página /potencia renderizan indicadores", () => {
  const navPath = path.join(webRoot, "components", "DashboardNav.tsx");
  const navContent = fs.readFileSync(navPath, "utf-8");
  assert.match(navContent, /href:\s*["']\/potencia["']/);
  assert.match(navContent, /label:\s*["']Potencia["']/);

  const cardPath = path.join(webRoot, "components", "LastActivityCard.tsx");
  const cardContent = fs.readFileSync(cardPath, "utf-8");
  assert.match(cardContent, /Potencia media/);
  assert.match(cardContent, /Potencia máx/);
  assert.match(cardContent, /avg_power/);
  assert.match(cardContent, /norm_power/);

  const pagePath = path.join(webRoot, "app", "(dashboard)", "potencia", "page.tsx");
  assert.ok(fs.existsSync(pagePath), "Debe existir apps/web/app/(dashboard)/potencia/page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");
  assert.match(pageContent, /buildCyclingPowerSummary/);
  assert.match(pageContent, /7 Zonas de Potencia/);
  assert.match(pageContent, /tabular-nums/);
});
