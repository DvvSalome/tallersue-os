import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { INSTRUMENTO_VERSION, camposAbiertos, itemByNumber } from "@/lib/items";
import { validarValor } from "@/lib/respuestas";
import { categorize } from "@/lib/categorize";

// Guarda un BLOQUE completo en una sola llamada. Antes el formulario hacía un
// fetch por pregunta, lo que podía dejar un bloque medio guardado si alguna
// falla; ahora las escrituras se agrupan y el cliente recibe un único
// resultado.
//
// Las respuestas cerradas van a `responses` y el texto libre a
// `respuestas_abiertas` — repositorios separados, por la regla del documento
// §2/§5. `categoria_codificada` se calcula SIEMPRE en el servidor: el cliente
// nunca decide la categoría.

type Payload = {
  respuestas?: { item?: unknown; valor?: unknown }[];
  abiertas?: { clave?: unknown; texto?: unknown }[];
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Payload | null;
  if (!body) {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  // ---------------------------------------------------------------- cerradas
  const filasCerradas: {
    user_id: string;
    version: number;
    bloque: number;
    item: number;
    tipo: string;
    valor: unknown;
  }[] = [];

  for (const entrada of body.respuestas ?? []) {
    const numero = Number(entrada?.item);
    const item = itemByNumber(numero);
    if (!item) {
      return NextResponse.json({ error: `Ítem inválido: ${entrada?.item}` }, { status: 400 });
    }
    const valor = validarValor(item, entrada?.valor);
    if (!valor) {
      return NextResponse.json(
        { error: `Respuesta inválida para la pregunta ${item.codigo}.` },
        { status: 400 },
      );
    }
    filasCerradas.push({
      user_id: user.id,
      version: INSTRUMENTO_VERSION,
      bloque: item.bloque,
      item: item.item,
      tipo: item.tipo,
      valor,
    });
  }

  // ---------------------------------------------------------------- abiertas
  const catalogoAbierto = new Map(camposAbiertos().map((c) => [c.clave, c]));
  const filasAbiertas: {
    user_id: string;
    version: number;
    bloque: number;
    item: number;
    clave: string;
    texto: string;
    categoria_codificada: string | null;
  }[] = [];

  for (const entrada of body.abiertas ?? []) {
    if (typeof entrada?.clave !== "string") {
      return NextResponse.json({ error: "Clave de texto inválida." }, { status: 400 });
    }
    const campo = catalogoAbierto.get(entrada.clave);
    if (!campo) {
      return NextResponse.json({ error: `Campo abierto desconocido: ${entrada.clave}` }, { status: 400 });
    }
    const texto = typeof entrada.texto === "string" ? entrada.texto.trim() : "";
    if (texto.length === 0) continue; // vacío = no se guarda (son opcionales)
    if (texto.length > campo.maxLength) {
      return NextResponse.json(
        { error: `El texto de "${campo.etiqueta}" excede ${campo.maxLength} caracteres.` },
        { status: 400 },
      );
    }
    filasAbiertas.push({
      user_id: user.id,
      version: INSTRUMENTO_VERSION,
      bloque: campo.item.bloque,
      item: campo.item.item,
      clave: campo.clave,
      texto,
      categoria_codificada: categorize(campo.clave, texto),
    });
  }

  if (filasCerradas.length === 0 && filasAbiertas.length === 0) {
    return NextResponse.json({ error: "No hay nada que guardar." }, { status: 400 });
  }

  if (filasCerradas.length > 0) {
    const { error } = await supabase
      .from("responses")
      .upsert(filasCerradas, { onConflict: "user_id,version,bloque,item" });
    if (error) {
      return NextResponse.json({ error: "No se pudieron guardar tus respuestas." }, { status: 500 });
    }
  }

  if (filasAbiertas.length > 0) {
    const { error } = await supabase
      .from("respuestas_abiertas")
      .upsert(filasAbiertas, { onConflict: "user_id,version,clave" });
    if (error) {
      return NextResponse.json({ error: "No se pudieron guardar tus comentarios." }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    guardadas: filasCerradas.length,
    comentarios: filasAbiertas.length,
  });
}
