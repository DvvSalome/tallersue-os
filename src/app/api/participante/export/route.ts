import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/actor";
import { ALL_ITEMS, INSTRUMENTO_VERSION } from "@/lib/items";
import { describirValor, type StoredValor } from "@/lib/respuestas";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET() {
  const actor = await getActor();
  if (!actor || actor.kind !== "participante") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const supabase = await createClient();
  // RLS (responses_select_own / respuestas_abiertas_select_own) ya limita ambas
  // consultas a las filas del propio participante. Aquí SÍ va el texto crudo:
  // es su propia información, la descarga es para él.
  const [{ data: responses }, { data: textos }] = await Promise.all([
    supabase
      .from("responses")
      .select("item, valor")
      .eq("user_id", actor.id)
      .eq("version", INSTRUMENTO_VERSION),
    supabase
      .from("respuestas_abiertas")
      .select("clave, texto")
      .eq("user_id", actor.id)
      .eq("version", INSTRUMENTO_VERSION),
  ]);

  const byItem = new Map((responses ?? []).map((r) => [r.item, r.valor as StoredValor]));
  const byClave = new Map((textos ?? []).map((t) => [t.clave, t.texto]));

  const lines = ["codigo,pregunta,respuesta,comentario"];
  for (const it of ALL_ITEMS) {
    const valor = byItem.get(it.item);
    const principal =
      it.tipo === "texto" ? (byClave.get(it.clave) ?? "") : valor ? describirValor(it, valor) : "";
    const comentario = it.abierta ? (byClave.get(it.abierta.clave) ?? "") : "";
    lines.push(
      [it.codigo, csvEscape(it.etiqueta), csvEscape(principal), csvEscape(comentario)].join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mi-brujula.csv"',
    },
  });
}
