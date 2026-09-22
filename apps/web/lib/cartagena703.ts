/** Static course reference — IM 70.3 Cartagena (distancias estándar 70.3). */

export const CARTAGENA703_EVENT = {
  name: "Ironman 70.3 Cartagena 2027",
  date: "2027-11-29",
  totalKm: 113,
  officialCourseUrl: "https://www.ironman.com/races/im703-cartagena/course",
  officialRaceUrl: "https://www.ironman.com/races/im703-cartagena",
};

export type CourseLeg = {
  sport: "swim" | "bike" | "run";
  label: string;
  distance: string;
  distanceKm: number;
  elevationNote: string;
  courseNotes: string[];
  envNotes: string[];
};

export const CARTAGENA703_LEGS: CourseLeg[] = [
  {
    sport: "swim",
    label: "Natación",
    distance: "1,9 km",
    distanceKm: 1.9,
    elevationNote: "Agua abierta · bahía protegida",
    courseNotes: [
      "Bahía de las Ánimas — aguas relativamente calmadas frente al centro de convenciones.",
      "Transición hacia T1 cerca del Camellón de los Mártires / Torre del Reloj (según edición).",
      "Vista para espectadores desde malecones y muelles.",
    ],
    envNotes: [
      "Agua típica ~27–28 °C en noviembre (referencia ediciones recientes).",
      "Neopreno según reglas IRONMAN del año — revisar athlete guide.",
    ],
  },
  {
    sport: "bike",
    label: "Ciclismo",
    distance: "90 km",
    distanceKm: 90,
    elevationNote: "Perfil mayormente plano · Vía al Mar",
    courseNotes: [
      "Salida desde zona de transición / convención hacia Vía al Mar (Cartagena–Barranquilla).",
      "Recorrido out-and-back costero; tramos con vistas a playas y manglares.",
      "Curso publicado como rápido y plano; mapas pueden cambiar — confirmar athlete guide.",
    ],
    envNotes: [
      "Calor + humedad: hidratación y electrolitos desde temprano.",
      "Viento costero variable; ritmo conservador en los primeros 30 km.",
    ],
  },
  {
    sport: "run",
    label: "Carrera",
    distance: "21,1 km",
    distanceKm: 21.1,
    elevationNote: "2 vueltas · ciudad amurallada",
    courseNotes: [
      "Dos loops (~21 km total) por sector occidental y Ciudad Amurillada (UNESCO).",
      "Tramos con vista al Caribe y calles coloniales; ambiente de público intenso.",
      "Meta frente a la Torre del Reloj (referencia oficial).",
    ],
    envNotes: [
      "Asfalto caliente al mediodía; sombra limitada en algunos tramos del centro.",
      "Planificar ritmo por sensación + FC, no solo por split de Bogotá.",
    ],
  },
];
