import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  EVENTS,
  TIME_HORIZONS,
  chartWindow,
  calculateProgressPercent,
  getIdealIndexAtDate,
  getProjectedIndexAtDate,
} from "./preparation.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");

test("P22 / ADR-002: lib/preparation.ts es 100% puro sin dependencias de UI o frameworks", () => {
  const prepPath = path.join(webRoot, "lib", "preparation.ts");
  const content = fs.readFileSync(prepPath, "utf-8");

  assert.doesNotMatch(content, /from ["']react["']/);
  assert.doesNotMatch(content, /from ["']next/);
  assert.doesNotMatch(content, /from ["']@supabase/);
  assert.doesNotMatch(content, /from ["']openai/);
});

test("Horizonte temporal (Zoom): TIME_HORIZONS expone rangos de corto, medio y temporada completa", () => {
  assert.strictEqual(typeof TIME_HORIZONS, "object");
  assert.ok(TIME_HORIZONS.short, "Debe existir horizonte short");
  assert.ok(TIME_HORIZONS.medium, "Debe existir horizonte medium");
  assert.ok(TIME_HORIZONS.full, "Debe existir horizonte full");

  assert.strictEqual(TIME_HORIZONS.short.endDate, "2027-01-15");
  assert.strictEqual(TIME_HORIZONS.medium.endDate, "2027-08-10");
  assert.strictEqual(TIME_HORIZONS.full.endDate, "2027-11-29");

  // chartWindow acepta customEnd
  const wShort = chartWindow("2026-10-24", TIME_HORIZONS.short.endDate);
  assert.strictEqual(wShort.chartEnd, "2027-01-15");

  const wFull = chartWindow("2026-10-24", TIME_HORIZONS.full.endDate);
  assert.strictEqual(wFull.chartEnd, "2027-11-29");
});

test("Cálculo de progreso y proyecciones fisiológicas puras", () => {
  // calculateProgressPercent
  assert.strictEqual(calculateProgressPercent(50, 100), 50);
  assert.strictEqual(calculateProgressPercent(78, 78), 100);
  assert.strictEqual(calculateProgressPercent(90, 78), 100); // Clamped at 100
  assert.strictEqual(calculateProgressPercent(0, 80), 0);
  assert.strictEqual(calculateProgressPercent(50, 0), 0);

  // getIdealIndexAtDate
  const bogota = EVENTS.find((e) => e.code === "bogota_21k_2026");
  assert.ok(bogota);
  const idealBogota = getIdealIndexAtDate(bogota, "2026-12-26");
  assert.strictEqual(idealBogota, bogota.targetIndex);

  // getProjectedIndexAtDate
  const sampleActual = [
    { date: "2026-10-01", index: 44 },
    { date: "2026-10-24", index: 48 },
  ];
  const projectedFuture = getProjectedIndexAtDate(sampleActual, "2026-12-26", 0.08, 43.2);
  assert.ok(projectedFuture >= 44 && projectedFuture <= 88);
});

test("P02 / Responsive: globals.css preserva scroll horizontal y dimensiones mínimas", () => {
  const cssPath = path.join(webRoot, "app", "globals.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  assert.match(css, /\.prep-chart-wrap\s*\{[^}]*overflow-x:\s*auto/);
  assert.match(css, /\.prep-chart\s*\{[^}]*min-width:\s*680px/);
  assert.match(css, /\.projection-table-wrap\s*\{[^}]*overflow-x:\s*auto/);

  // Nuevas clases de controles e inspector
  assert.match(css, /\.prep-range-tabs/);
  assert.match(css, /\.prep-range-tab/);
  assert.match(css, /\.prep-filter-pills/);
  assert.match(css, /\.prep-pill/);
  assert.match(css, /\.prep-inspector-bar/);
  assert.match(css, /\.prep-progress-cell/);
  assert.match(css, /\.prep-progress-fill/);
});

test("Componente PreparationChart.tsx: 'use client', geometría anti-recorte y elementos interactivos", () => {
  const compPath = path.join(webRoot, "components", "PreparationChart.tsx");
  assert.ok(fs.existsSync(compPath), "PreparationChart.tsx debe existir");
  const content = fs.readFileSync(compPath, "utf-8");

  // Directiva client
  assert.match(content, /^"use client";/);

  // Geometría anti-recorte: PAD.right >= 40 y H >= 300
  assert.match(content, /right:\s*4[0-9]/, "PAD.right debe ser >= 40 para evitar recorte de etiquetas");
  assert.match(content, /H\s*=\s*3[0-9]{2}/, "H debe ser >= 300 para legibilidad y aire vertical");

  // Controles de zoom y filtro
  assert.match(content, /prep-range-tabs/);
  assert.match(content, /prep-range-tab/);
  assert.match(content, /prep-filter-pills/);
  assert.match(content, /prep-pill/);

  // Inspector crosshair y tarjeta en vivo
  assert.match(content, /prep-inspector-bar/);
  assert.match(content, /prep-crosshair/);
  assert.match(content, /onPointerMove/);

  // Gradiente suave en serie real sin saturación de círculos continuos
  assert.match(content, /linearGradient id="prepActualGradient"/);
  assert.match(content, /actualAreaPath/);

  // Píldoras proyectadas con anclaje inteligente
  assert.match(content, /isNearRight\s*=\s*dx\s*>\s*W\s*-\s*56/);

  // Barras de progreso en tabla
  assert.match(content, /prep-progress-cell/);
  assert.match(content, /prep-progress-fill/);
  assert.match(content, /calculateProgressPercent/);
});
