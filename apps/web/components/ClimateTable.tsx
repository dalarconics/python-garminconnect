import type { CityClimateBundle } from "@/lib/climate";
import { fmtPressure, fmtTemp } from "@/lib/climate";

type Props = { bundles: CityClimateBundle[] };

export function ClimateTable({ bundles }: Props) {
  return (
    <div className="climate-grid">
      {bundles.map((b) => (
        <section key={b.city.id} className="card">
          <h2>{b.city.name}</h2>
          <p className="muted">
            Altitud ~{b.city.elevationM} m · {b.city.note} · {b.source}
          </p>
          <div className="climate-scroll">
            <table className="climate-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Máx</th>
                  <th>Media</th>
                  <th>Mín</th>
                  <th>Presión</th>
                </tr>
              </thead>
              <tbody>
                {b.rows.slice(0, 14).map((r) => (
                  <tr key={r.date}>
                    <td>{r.date}</td>
                    <td>{fmtTemp(r.tMax)}</td>
                    <td>{fmtTemp(r.tMean)}</td>
                    <td>{fmtTemp(r.tMin)}</td>
                    <td>{fmtPressure(r.pressureHpa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
