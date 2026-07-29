export type DemoEquipo = {
  id: string;
  codigo: string;
  nombre: string | null;
  comunaId: number;
  activo: boolean;
  createdAt: string;
};

export type DemoUser = {
  id: string;
  apodo: string;
  edad: number;
  pais: string;
  ciudad: string;
  equipoId: string;
  comunaId: number;
  createdAt: string;
};

import type { StoredValor } from "@/lib/respuestas";

/** Se reutiliza la forma real de almacenamiento en lugar de redeclararla. */
export type DemoValor = StoredValor;

/** Respuesta CERRADA (espejo de public.responses). */
export type DemoResponse = {
  userId: string;
  version: number;
  bloque: number;
  item: number;
  tipo: "likert" | "multiple" | "unica" | "texto" | "adjunto";
  valor: DemoValor;
  /** v1 únicamente; en v2 la categoría vive en la respuesta abierta. */
  categoriaCodificada: string | null;
  updatedAt: string;
};

/** Respuesta ABIERTA (espejo de public.respuestas_abiertas). Repositorio
 *  separado, igual que en la BD (doc §2/§5). */
export type DemoRespuestaAbierta = {
  userId: string;
  version: number;
  bloque: number;
  item: number;
  clave: string;
  texto: string;
  categoriaCodificada: string | null;
  updatedAt: string;
};

export type DemoSession =
  | { kind: "participante"; userId: string }
  | { kind: "facilitador"; codigoGrupo: string; comunaId: number | null }
  | null;
