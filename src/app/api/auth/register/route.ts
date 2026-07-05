import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { SESSION_COOKIE, parseSession } from "@/types/session";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { db: { schema: "ranchotara" } }
);

export async function POST(req: NextRequest) {
  // Verificar sesión del solicitante
  const cookieVal = req.cookies.get(SESSION_COOKIE)?.value;
  const sesionAdmin = cookieVal ? parseSession(cookieVal) : null;

  if (!sesionAdmin?.es_admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { nombre, username, password, es_admin, activo, permisos } = await req.json();

  if (!nombre || !username || !password) {
    return NextResponse.json({ error: "Nombre, usuario y contraseña son requeridos." }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 10);

  const { data: nuevoUsuario, error } = await supabase
    .from("usuarios")
    .insert({
      id_empresa: sesionAdmin.id_empresa,
      username,
      password_hash,
      nombre,
      es_admin: es_admin ?? false,
      activo:   activo ?? true,
    })
    .select("id")
    .single();

  if (error) {
    const msg = error.code === "23505"
      ? "El nombre de usuario ya existe."
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Guardar permisos si se enviaron
  if (Array.isArray(permisos) && permisos.length > 0) {
    const rows = permisos.map((modulo: string) => ({
      id_usuario:    nuevoUsuario.id,
      modulo,
      puede_acceder: true,
    }));
    await supabase.from("permisos_usuario").insert(rows);
  }

  return NextResponse.json({ ok: true, id: nuevoUsuario.id });
}

export async function PUT(req: NextRequest) {
  const cookieVal = req.cookies.get(SESSION_COOKIE)?.value;
  const sesionAdmin = cookieVal ? parseSession(cookieVal) : null;

  if (!sesionAdmin?.es_admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id, nombre, username, password, es_admin, activo, permisos } = await req.json();

  if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

  const update: Record<string, unknown> = { nombre, username, es_admin, activo };
  if (password) {
    update.password_hash = await bcrypt.hash(password, 10);
  }

  const { error } = await supabase
    .from("usuarios")
    .update(update)
    .eq("id", id)
    .eq("id_empresa", sesionAdmin.id_empresa);

  if (error) {
    const msg = error.code === "23505" ? "El nombre de usuario ya existe." : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Reemplazar permisos
  if (Array.isArray(permisos)) {
    await supabase.from("permisos_usuario").delete().eq("id_usuario", id);
    if (permisos.length > 0) {
      await supabase.from("permisos_usuario").insert(
        permisos.map((modulo: string) => ({ id_usuario: id, modulo, puede_acceder: true }))
      );
    }
  }

  return NextResponse.json({ ok: true });
}
