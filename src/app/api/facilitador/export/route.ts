import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/actor";
import { ALL_ITEMS, INSTRUMENTO_VERSION, camposAbiertos } from "@/lib/items";
import { describirValor, type StoredValor } from "@/lib/respuestas";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET() {
  const actor = await getActor();
  if (!actor || actor.kind !== "facilitador") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const supabase = await createClient();

  // RLS limita las tres consultas a la comuna del facilitador (o a todas si su
  // comuna_id es null). La exportación va ANONIMIZADA: no lleva apodo ni
  // user_id, y el texto libre sale SOLO como categoría codificada, nunca en
  // crudo (doc §5: anonimización antes de cualquier proceso analítico).
  const [{ data: progreso }, { data: responses }, { data: textos }] = await Promise.all([
    supabase
      .from("v_participant_progress")
      .select("user_id, edad, comuna_nombre, equipo_codigo, bloque_alcanzado, estado"),
    supabase
      .from("responses")
      .select("user_id, item, valor")
      .eq("version", INSTRUMENTO_VERSION),
    supabase
      .from("respuestas_abiertas")
      .select("user_id, clave, categoria_codificada")
      .eq("version", INSTRUMENTO_VERSION),
  ]);

  const cerradasPorUsuario = new Map<string, Map<number, StoredValor>>();
  for (const r of responses ?? []) {
    const mapa = cerradasPorUsuario.get(r.user_id) ?? new Map<number, StoredValor>();
    mapa.set(r.item, r.valor as StoredValor);
    cerradasPorUsuario.set(r.user_id, mapa);
  }

  const categoriasPorUsuario = new Map<string, Map<string, string>>();
  for (const t of textos ?? []) {
    const mapa = categoriasPorUsuario.get(t.user_id) ?? new Map<string, string>();
    mapa.set(t.clave, t.categoria_codificada ?? "");
    categoriasPorUsuario.set(t.user_id, mapa);
  }

  const itemsCerrados = ALL_ITEMS.filter((it) => it.tipo !== "texto");
  const clavesTexto = camposAbiertos().map((c) => c.clave);

  const header = [
    "comuna",
    "equipo",
    "edad",
    "bloque_alcanzado",
    "estado",
    ...itemsCerrados.map((it) => it.clave),
    ...clavesTexto.map((c) => `${c}__categoria`),
  ];

  const lines = [header.join(",")];

  for (const p of progreso ?? []) {
    const cerradas = cerradasPorUsuario.get(p.user_id) ?? new Map<number, StoredValor>();
    const categorias = categoriasPorUsuario.get(p.user_id) ?? new Map<string, string>();
    const row = [
      p.comuna_nombre,
      p.equipo_codigo,
      String(p.edad),
      String(p.bloque_alcanzado),
      p.estado,
      ...itemsCerrados.map((it) => {
        const valor = cerradas.get(it.item);
        return valor ? describirValor(it, valor) : "";
      }),
      ...clavesTexto.map((c) => categorias.get(c) ?? ""),
    ];
    lines.push(row.map((v) => csvEscape(String(v))).join(","));
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="taller-de-los-suenos-anonimizado.csv"',
    },
  });
}
