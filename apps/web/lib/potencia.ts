/**
 * Dominio puro para indicadores de potencia de ciclismo, zonas de Coggan (Z1-Z7)
 * y prescripción de vatios objetivo para retos de fondo y triatlón (ADR-002 / P22).
 */

export const DEFAULT_FTP_WATTS = 220;
export const DEFAULT_ATHLETE_WEIGHT_KG = 72;

export type CogganZoneCode = "Z1" | "Z2" | "Z3" | "Z4" | "Z5" | "Z6" | "Z7";

export type CogganZone = {
  code: CogganZoneCode;
  name: string;
  pctRangeLabel: string;
  minPct: number;
  maxPct: number | null;
  minWatts: number;
  maxWatts: number | null;
  barWidthPct: number;
  color: string;
  adaptation: string;
};

export type CyclingPowerInput = {
  ftp_watts?: number | null;
  w_per_kg?: number | null;
  vo2max_cycling?: number | null;
  lthr_cycling?: number | null;
};

export type LastActivityPowerInput = {
  activity_id?: number;
  name?: string;
  sport?: string;
  start_time_local?: string | null;
  duration_min?: number | null;
  distance_km?: number | null;
  elevation_gain_m?: number | null;
  avg_hr?: number | null;
  avg_power?: number | null;
  max_power?: number | null;
  norm_power?: number | null;
  intensity_factor?: number | null;
  training_stress_score?: number | null;
  avg_cadence?: number | null;
};

export type ChallengePowerTarget = {
  code: "reto_letras_2027" | "cartagena_703_2027";
  title: string;
  subtitle: string;
  zoneLabel: string;
  pctRangeLabel: string;
  minWatts: number;
  maxWatts: number;
  targetIfLabel: string;
  cadenceLabel: string;
  rationale: string;
  color: string;
};

export type CyclingPowerSummary = {
  ftpWatts: number;
  isReferenceFtp: boolean;
  referenceNotice: string | null;
  wPerKg: number;
  vo2maxCycling: number | null;
  lthrCycling: number | null;
  zones: CogganZone[];
  targets: ChallengePowerTarget[];
  lastRide: {
    hasPower: boolean;
    name: string | null;
    sport: string | null;
    avgPower: number | null;
    normPower: number | null;
    maxPower: number | null;
    intensityFactor: number | null;
    trainingStressScore: number | null;
    variabilityIndex: number | null;
    avgCadence: number | null;
  };
};

/**
 * Calcula las 7 Zonas de Potencia clásicas del Dr. Andrew Coggan a partir del FTP (W).
 */
export function calculateCogganZones(ftpWatts: number): CogganZone[] {
  const ftp = ftpWatts > 0 ? Math.round(ftpWatts) : DEFAULT_FTP_WATTS;

  return [
    {
      code: "Z1",
      name: "Recuperación activa",
      pctRangeLabel: "< 55 % FTP",
      minPct: 0,
      maxPct: 55,
      minWatts: 0,
      maxWatts: Math.round(ftp * 0.55),
      barWidthPct: 36,
      color: "#94a3b8",
      adaptation:
        "Flujo sanguíneo periférico y aclaramiento de lactato sin carga neuromuscular ni gasto glucogénico.",
    },
    {
      code: "Z2",
      name: "Resistencia aeróbica",
      pctRangeLabel: "56–75 % FTP",
      minPct: 56,
      maxPct: 75,
      minWatts: Math.round(ftp * 0.56),
      maxWatts: Math.round(ftp * 0.75),
      barWidthPct: 52,
      color: "#38bdf8",
      adaptation:
        "Biogénesis mitocondrial, capilarización y máxima oxidación de ácidos grasos para fondo prolongado.",
    },
    {
      code: "Z3",
      name: "Tempo / Sweet Spot",
      pctRangeLabel: "76–90 % FTP",
      minPct: 76,
      maxPct: 90,
      minWatts: Math.round(ftp * 0.76),
      maxWatts: Math.round(ftp * 0.9),
      barWidthPct: 68,
      color: "#22c55e",
      adaptation:
        "Economía de pedaleo sostenido, conversión de fibras IIa y ritmo crucero de puerto largo y 70.3.",
    },
    {
      code: "Z4",
      name: "Umbral de lactato (FTP)",
      pctRangeLabel: "91–105 % FTP",
      minPct: 91,
      maxPct: 105,
      minWatts: Math.round(ftp * 0.91),
      maxWatts: Math.round(ftp * 1.05),
      barWidthPct: 80,
      color: "#eab308",
      adaptation:
        "Estado estable máximo de lactato (MLSS) y elevación directa del techo sostenible de 60 minutos.",
    },
    {
      code: "Z5",
      name: "VO₂máx aeróbico",
      pctRangeLabel: "106–120 % FTP",
      minPct: 106,
      maxPct: 120,
      minWatts: Math.round(ftp * 1.06),
      maxWatts: Math.round(ftp * 1.2),
      barWidthPct: 90,
      color: "#f97316",
      adaptation:
        "Volumen sistólico máximo y potencia aeróbica central en intervalos de 3 a 8 minutos.",
    },
    {
      code: "Z6",
      name: "Capacidad anaeróbica",
      pctRangeLabel: "121–150 % FTP",
      minPct: 121,
      maxPct: 150,
      minWatts: Math.round(ftp * 1.21),
      maxWatts: Math.round(ftp * 1.5),
      barWidthPct: 96,
      color: "#ef4444",
      adaptation:
        "Glucólisis anaeróbica de alta potencia y tolerancia al buffering de hidrogeniones (30 s a 2 min).",
    },
    {
      code: "Z7",
      name: "Potencia neuromuscular",
      pctRangeLabel: "> 150 % FTP",
      minPct: 151,
      maxPct: null,
      minWatts: Math.round(ftp * 1.51),
      maxWatts: null,
      barWidthPct: 100,
      color: "#c084fc",
      adaptation:
        "Reclutamiento máximo de unidades motoras rápidas y vía de fosfocreatina en esfuerzos cortos (< 15 s).",
    },
  ];
}

/**
 * Calcula el Índice de Variabilidad (VI = NP / Potencia Media).
 * En triatlón de media distancia o ascensos tendidos, el ideal es 1.00–1.05.
 */
export function calculateVariabilityIndex(
  normPower?: number | null,
  avgPower?: number | null
): number | null {
  if (normPower == null || avgPower == null || normPower <= 0 || avgPower <= 0) {
    return null;
  }
  return Math.round((normPower / avgPower) * 100) / 100;
}

/**
 * Construye la prescripción de vatios objetivo para los retos principales de ciclismo.
 */
export function buildChallengePowerTargets(ftpWatts: number): ChallengePowerTarget[] {
  const ftp = ftpWatts > 0 ? Math.round(ftpWatts) : DEFAULT_FTP_WATTS;

  return [
    {
      code: "reto_letras_2027",
      title: "Reto Letras (Mariquita → Alto de Letras)",
      subtitle: "Ascenso continuo · ~80 km · +4.200 m D+",
      zoneLabel: "Z3 / Sweet Spot",
      pctRangeLabel: "84–92 % FTP",
      minWatts: Math.round(ftp * 0.84),
      maxWatts: Math.round(ftp * 0.92),
      targetIfLabel: "IF 0.84–0.90",
      cadenceLabel: "75–85 rpm sentado",
      rationale:
        "Sostener potencia sub-umbral constante en los primeros 50 km evita la depleción prematura de glucógeno antes de superar los 3.000 m s.n.m., donde la hipoxia reduce el FTP efectivo entre un 8 % y 12 %.",
      color: "#38bdf8",
    },
    {
      code: "cartagena_703_2027",
      title: "Ironman 70.3 Cartagena (Segmento Ciclismo)",
      subtitle: "Llano costero con viento · 90 km contrarreloj",
      zoneLabel: "Z2 Alta / Z3 Baja",
      pctRangeLabel: "78–83 % FTP",
      minWatts: Math.round(ftp * 0.78),
      maxWatts: Math.round(ftp * 0.83),
      targetIfLabel: "IF 0.78–0.83 · VI ≤ 1.04",
      cadenceLabel: "85–92 rpm acoplado",
      rationale:
        "Limitar el Factor de Intensidad a 0.78–0.83 (~145–165 TSS) y mantener un Índice de Variabilidad ≤ 1.04 sin picos en repechos o viento en contra protege las reservas de glucógeno para correr los 21.1 km finales a ritmo objetivo.",
      color: "#f97316",
    },
  ];
}

/**
 * Consolida el resumen completo de potencia para la vista /potencia.
 */
export function buildCyclingPowerSummary(
  powerInput?: CyclingPowerInput | null,
  lastActivity?: LastActivityPowerInput | null,
  fallbackVo2max?: number | null,
  athleteWeightKg: number = DEFAULT_ATHLETE_WEIGHT_KG
): CyclingPowerSummary {
  const rawFtp = powerInput?.ftp_watts;
  const hasRealFtp = typeof rawFtp === "number" && rawFtp > 0;
  const ftpWatts = hasRealFtp ? Math.round(rawFtp) : DEFAULT_FTP_WATTS;

  const weight = athleteWeightKg > 0 ? athleteWeightKg : DEFAULT_ATHLETE_WEIGHT_KG;
  const wPerKg =
    typeof powerInput?.w_per_kg === "number" && powerInput.w_per_kg > 0
      ? Math.round(powerInput.w_per_kg * 100) / 100
      : Math.round((ftpWatts / weight) * 100) / 100;

  const vo2maxCycling =
    typeof powerInput?.vo2max_cycling === "number" && powerInput.vo2max_cycling > 0
      ? powerInput.vo2max_cycling
      : typeof fallbackVo2max === "number" && fallbackVo2max > 0
        ? fallbackVo2max
        : null;

  const lthrCycling =
    typeof powerInput?.lthr_cycling === "number" && powerInput.lthr_cycling > 0
      ? Math.round(powerInput.lthr_cycling)
      : null;

  const avgPower =
    typeof lastActivity?.avg_power === "number" && lastActivity.avg_power > 0
      ? Math.round(lastActivity.avg_power)
      : null;
  const normPower =
    typeof lastActivity?.norm_power === "number" && lastActivity.norm_power > 0
      ? Math.round(lastActivity.norm_power)
      : null;
  const maxPower =
    typeof lastActivity?.max_power === "number" && lastActivity.max_power > 0
      ? Math.round(lastActivity.max_power)
      : null;

  const intensityFactor =
    typeof lastActivity?.intensity_factor === "number" && lastActivity.intensity_factor > 0
      ? Math.round(lastActivity.intensity_factor * 100) / 100
      : normPower != null
        ? Math.round((normPower / ftpWatts) * 100) / 100
        : avgPower != null
          ? Math.round((avgPower / ftpWatts) * 100) / 100
          : null;

  const trainingStressScore =
    typeof lastActivity?.training_stress_score === "number" &&
    lastActivity.training_stress_score > 0
      ? Math.round(lastActivity.training_stress_score * 10) / 10
      : null;

  const variabilityIndex = calculateVariabilityIndex(normPower, avgPower);

  const avgCadence =
    typeof lastActivity?.avg_cadence === "number" && lastActivity.avg_cadence > 0
      ? Math.round(lastActivity.avg_cadence)
      : null;

  const hasPower = avgPower != null || normPower != null || maxPower != null;

  const referenceNotice = hasRealFtp
    ? null
    : `Sin lectura reciente de FTP en Garmin Connect. Mostrando zonas y objetivos con FTP de referencia (${DEFAULT_FTP_WATTS} W · ${wPerKg.toFixed(2)} W/kg). Al sincronizar una rodada con potenciómetro o rodillo inteligente se actualizará automáticamente.`;

  return {
    ftpWatts,
    isReferenceFtp: !hasRealFtp,
    referenceNotice,
    wPerKg,
    vo2maxCycling,
    lthrCycling,
    zones: calculateCogganZones(ftpWatts),
    targets: buildChallengePowerTargets(ftpWatts),
    lastRide: {
      hasPower,
      name: lastActivity?.name ?? null,
      sport: lastActivity?.sport ?? null,
      avgPower,
      normPower,
      maxPower,
      intensityFactor,
      trainingStressScore,
      variabilityIndex,
      avgCadence,
    },
  };
}
