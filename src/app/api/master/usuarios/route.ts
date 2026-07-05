import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const MASTER_KEY = "Parchita2026colorbag";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { db: { schema: "ranchotara" } }
);

function authOk(req: NextRequest) {
  return req.headers.get("x-master-key") === MASTER_KEY;
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, id_empresa, username, nombre, es_admin, activo, created_at, empresas(nombre)")
    .order("id_empresa")
    .order("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const { id_empresa, nombre, username, password, es_admin, permisos } = await req.json();

  if (!id_empresa || !nombre?.trim() || !username?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "id_empresa, nombre, usuario y contraseña son requeridos." }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 10);

  const { data: nuevoUsuario, error } = await supabase
    .from("usuarios")
    .insert({
      id_empresa,
      username: username.trim().toLowerCase(),
      password_hash,
      nombre: nombre.trim(),
      es_admin: es_admin ?? false,
      activo: true,
    })
    .select("id")
    .single();

  if (error) {
    const msg = error.code === "23505" ? "El nombre de usuario ya existe." : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (!es_admin && Array.isArray(permisos) && permisos.length > 0) {
    await supabase.from("permisos_usuario").insert(
      permisos.map((modulo: string) => ({ id_usuario: nuevoUsuario.id, modulo, puede_acceder: true }))
    );
  }

  return NextResponse.json({ ok: true, id: nuevoUsuario.id });
}
