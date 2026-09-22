/** Open-Meteo forecast + climate normals for training locations. */

export type ClimateCity = {
  id: string;
  name: string;
  elevationM: number;
  lat: number;
  lon: number;
  note?: string;
};

export const CLIMATE_CITIES: ClimateCity[] = [
  {
    id: "bogota",
    name: "Bogotá",
    elevationM: 2640,
    lat: 4.711,
    lon: -74.0721,
    note: "Entrenamiento diario · ~2560 m zona habitual",
  },
  {
    id: "yopal",
    name: "Yopal",
    elevationM: 350,
    lat: 5.3378,
    lon: -72.3959,
    note: "Calor / baja altitud · referencia Letras / llanos",
  },
  {
    id: "cartagena",
    name: "Cartagena",
    elevationM: 2,
    lat: 10.391,
    lon: -75.4794,
    note: "IM 70.3 · calor húmedo costa",
  },
];

export type DailyClimateRow = {
  date: string;
  tMax: number;
  tMean: number;
  tMin: number;
  pressureHpa: number;
};

export type CityClimateBundle = {
  city: ClimateCity;
  from: string;
  rows: DailyClimateRow[];
  source: string;
};

type OpenMeteoDaily = {
  time?: string[];
  temperature_2m_max?: (number | null)[];
  temperature_2m_mean?: (number | null)[];
  temperature_2m_min?: (number | null)[];
  surface_pressure_mean?: (number | null)[];
};

function clampFrom(iso: string): string {
  const floor = "2026-09-01";
  return iso < floor ? floor : iso;
}

export async function fetchCityClimate(city: ClimateCity, fromDate?: string): Promise<CityClimateBundle> {
  const today = new Date().toISOString().slice(0, 10);
  const start = clampFrom(fromDate ?? today);
  const end = new Date();
  end.setDate(end.getDate() + 16);
  const endStr = end.toISOString().slice(0, 10);

  const params = new URLSearchParams({
    latitude: String(city.lat),
    longitude: String(city.lon),
    daily: "temperature_2m_max,temperature_2m_mean,temperature_2m_min,surface_pressure_mean",
    timezone: "America/Bogota",
    start_date: start,
    end_date: endStr,
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`Open-Meteo ${city.id}: ${res.status}`);
  }
  const json = (await res.json()) as { daily?: OpenMeteoDaily };
  const d = json.daily ?? {};
  const times = d.time ?? [];
  const rows: DailyClimateRow[] = times.map((date, i) => ({
    date,
    tMax: d.temperature_2m_max?.[i] ?? NaN,
    tMean: d.temperature_2m_mean?.[i] ?? NaN,
    tMin: d.temperature_2m_min?.[i] ?? NaN,
    pressureHpa: d.surface_pressure_mean?.[i] ?? NaN,
  }));

  return {
    city,
    from: start,
    rows: rows.filter((r) => r.date >= start),
    source: "Open-Meteo forecast",
  };
}

export async function fetchAllClimate(fromDate?: string): Promise<CityClimateBundle[]> {
  return Promise.all(CLIMATE_CITIES.map((c) => fetchCityClimate(c, fromDate)));
}

export function fmtTemp(c: number) {
  if (Number.isNaN(c)) return "—";
  return `${Math.round(c)}°C`;
}

export function fmtPressure(hpa: number) {
  if (Number.isNaN(hpa)) return "—";
  return `${Math.round(hpa)} hPa`;
}
