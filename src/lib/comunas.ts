export const COMUNAS: { id: number; nombre: string }[] = [
  { id: 1, nombre: "Popular" },
  { id: 2, nombre: "Santa Cruz" },
  { id: 3, nombre: "Manrique" },
  { id: 4, nombre: "Aranjuez" },
  { id: 5, nombre: "Castilla" },
  { id: 6, nombre: "Doce de Octubre" },
  { id: 7, nombre: "Robledo" },
  { id: 8, nombre: "Villa Hermosa" },
  { id: 9, nombre: "Buenos Aires" },
  { id: 10, nombre: "La Candelaria" },
  { id: 11, nombre: "Laureles-Estadio" },
  { id: 12, nombre: "La América" },
  { id: 13, nombre: "San Javier" },
  { id: 14, nombre: "El Poblado" },
  { id: 15, nombre: "Guayabal" },
  { id: 16, nombre: "Belén" },
];

export function comunaNombre(id: number) {
  return COMUNAS.find((c) => c.id === id)?.nombre ?? `Comuna ${id}`;
}
