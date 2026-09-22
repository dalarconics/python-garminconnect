import { ClimateTable } from "@/components/ClimateTable";
import { fetchAllClimate, type CityClimateBundle } from "@/lib/climate";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function ClimaPage() {
  let bundles: CityClimateBundle[] = [];
  let error: string | null = null;
  try {
    bundles = await fetchAllClimate("2026-09-01");
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar clima";
  }

  return (
    <main>
      <h1>Clima</h1>
      <p className="muted">
        Bogotá, Yopal y Cartagena desde septiembre 2026: temperatura (máx / media / mín) y presión atmosférica
        (Open-Meteo). Altitud de referencia fija por ciudad; presión es la del modelo en superficie.
      </p>
      {error ? (
        <section className="card">
          <p>No se pudo cargar el pronóstico: {error}</p>
        </section>
      ) : null}
      <ClimateTable bundles={bundles} />
    </main>
  );
}
