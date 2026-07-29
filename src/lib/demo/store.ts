"use client";

import type {
  DemoEquipo,
  DemoUser,
  DemoResponse,
  DemoRespuestaAbierta,
  DemoSession,
} from "./types";

// Everything lives in localStorage under one namespaced key per collection.
// This is a throwaway demo store (no server, no multi-device sync) meant to
// let you click through the whole app before wiring up Supabase for real.

const KEYS = {
  equipos: "demo_equipos",
  users: "demo_users",
  responses: "demo_responses",
  abiertas: "demo_respuestas_abiertas",
  session: "demo_session",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------------------------------------------------------------- equipos

export function listEquipos(): DemoEquipo[] {
  return read<DemoEquipo[]>(KEYS.equipos, []);
}

export function findEquipoByCodigo(codigo: string): DemoEquipo | undefined {
  return listEquipos().find((e) => e.codigo.toUpperCase() === codigo.toUpperCase());
}

export function createEquipo(input: { codigo: string; nombre: string | null }): DemoEquipo {
  const equipo: DemoEquipo = {
    id: generateId(),
    codigo: input.codigo,
    nombre: input.nombre,
    activo: true,
    createdAt: new Date().toISOString(),
  };
  write(KEYS.equipos, [equipo, ...listEquipos()]);
  return equipo;
}

export function setEquipoActivo(equipoId: string, activo: boolean) {
  write(
    KEYS.equipos,
    listEquipos().map((e) => (e.id === equipoId ? { ...e, activo } : e)),
  );
}

// ------------------------------------------------------------------ users

export function listUsers(): DemoUser[] {
  return read<DemoUser[]>(KEYS.users, []);
}

export function getUser(userId: string): DemoUser | undefined {
  return listUsers().find((u) => u.id === userId);
}

export function apodoDisponible(equipoId: string, apodo: string) {
  return !listUsers().some(
    (u) => u.equipoId === equipoId && u.apodo.toLowerCase() === apodo.toLowerCase(),
  );
}

export function createUser(input: {
  apodo: string;
  edad: number;
  equipoId: string;
  comunaId: number;
}): DemoUser {
  const user: DemoUser = {
    id: generateId(),
    apodo: input.apodo,
    edad: input.edad,
    pais: "Colombia",
    ciudad: "Medellín",
    equipoId: input.equipoId,
    // Autodeclarada: solo alimenta las líneas de atención que ve esta persona.
    comunaId: input.comunaId,
    createdAt: new Date().toISOString(),
  };
  write(KEYS.users, [...listUsers(), user]);
  return user;
}

// -------------------------------------------------------------- responses

export function listResponses(): DemoResponse[] {
  return read<DemoResponse[]>(KEYS.responses, []);
}

export function responsesForUser(userId: string): DemoResponse[] {
  return listResponses().filter((r) => r.userId === userId);
}

export function upsertResponse(response: DemoResponse) {
  const all = listResponses();
  const idx = all.findIndex(
    (r) =>
      r.userId === response.userId &&
      r.version === response.version &&
      r.item === response.item,
  );
  if (idx === -1) all.push(response);
  else all[idx] = response;
  write(KEYS.responses, all);
}

// ------------------------------------------------- respuestas abiertas (texto)

export function listRespuestasAbiertas(): DemoRespuestaAbierta[] {
  return read<DemoRespuestaAbierta[]>(KEYS.abiertas, []);
}

export function respuestasAbiertasForUser(userId: string): DemoRespuestaAbierta[] {
  return listRespuestasAbiertas().filter((r) => r.userId === userId);
}

export function upsertRespuestaAbierta(respuesta: DemoRespuestaAbierta) {
  const all = listRespuestasAbiertas();
  const idx = all.findIndex(
    (r) =>
      r.userId === respuesta.userId &&
      r.version === respuesta.version &&
      r.clave === respuesta.clave,
  );
  if (idx === -1) all.push(respuesta);
  else all[idx] = respuesta;
  write(KEYS.abiertas, all);
}

export function deleteRespuestaAbierta(userId: string, version: number, clave: string) {
  write(
    KEYS.abiertas,
    listRespuestasAbiertas().filter(
      (r) => !(r.userId === userId && r.version === version && r.clave === clave),
    ),
  );
}

// ---------------------------------------------------------------- session

export function getSession(): DemoSession {
  return read<DemoSession>(KEYS.session, null);
}

export function setSession(session: DemoSession) {
  write(KEYS.session, session);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEYS.session);
}

// ------------------------------------------------------- carga masiva (demo)

/** Reemplaza TODO el contenido del store de una sola escritura por colección.
 *  Sembrar con los upsert de arriba haría cientos de ciclos leer-escribir sobre
 *  localStorage; esto lo hace en cuatro. Solo para datos ficticios de demo. */
export function replaceDemoData(data: {
  equipos: DemoEquipo[];
  users: DemoUser[];
  responses: DemoResponse[];
  abiertas: DemoRespuestaAbierta[];
}) {
  write(KEYS.equipos, data.equipos);
  write(KEYS.users, data.users);
  write(KEYS.responses, data.responses);
  write(KEYS.abiertas, data.abiertas);
}

// ----------------------------------------------------------------- reset

export function resetDemoData() {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
}
