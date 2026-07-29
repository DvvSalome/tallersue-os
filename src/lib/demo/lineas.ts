// Mirrors supabase/seed.sql's lineas_atencion rows, for demo mode (no DB).

export type DemoLinea = {
  id: string;
  tipo: string;
  nombre: string;
  direccion: string | null;
  horario: string | null;
  telefono: string | null;
  comunaId: number | null;
  color: string;
};

export const DEMO_LINEAS: DemoLinea[] = [
  { id: "l1", tipo: "Salud mental", nombre: "Línea Amiga 123 Social", direccion: "Atención telefónica, cobertura Medellín", horario: "24 horas, todos los días", telefono: "123", comunaId: null, color: "#7c3aed" },
  { id: "l2", tipo: "Salud mental", nombre: "Línea de la Vida", direccion: "Atención telefónica nacional", horario: "24 horas, todos los días", telefono: "106", comunaId: null, color: "#7c3aed" },
  { id: "l3", tipo: "Violencia", nombre: "Línea de Emergencias", direccion: "Atención telefónica nacional", horario: "24 horas, todos los días", telefono: "123", comunaId: null, color: "#dc2626" },
  { id: "l4", tipo: "Salud sexual", nombre: "Secretaría de Salud - Salud Sexual", direccion: "Atención telefónica y presencial", horario: "Lunes a viernes, 7am-4pm", telefono: "(604) 385 6000", comunaId: null, color: "#db2777" },
  { id: "l5", tipo: "Orientación general", nombre: "Casa de Justicia", direccion: "Consulta la sede de tu comuna", horario: "Lunes a viernes, 8am-4pm", telefono: "(604) 385 8000", comunaId: null, color: "#2563eb" },
];

export function lineasParaComuna(comunaId: number): DemoLinea[] {
  return DEMO_LINEAS.filter((l) => l.comunaId === null || l.comunaId === comunaId);
}
