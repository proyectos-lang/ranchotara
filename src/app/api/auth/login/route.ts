import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import type { Session, ModuloSlug } from "@/types/session";
import { serializeSession, SESSION_COOKIE } from "@/types/session";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { db: { schema: "ranchotara" } }
);

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Credenciales requeridas." }, { status: 400 });
  }

  // Buscar usuario con empresa
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("*, empresas(id, nombre)")
    .eq("username", username)
    .eq("activo", true)
    .single();

  if (error || !usuario) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  const passwordOk = await bcrypt.compare(password, usuario.password_hash);
  if (!passwordOk) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  // Cargar permisos del usuario
  const { data: permisos } = await supabase
    .from("permisos_usuario")
    .select("modulo, puede_acceder")
    .eq("id_usuario", usuario.id)
    .eq("puede_acceder", true);

  const modulosPermitidos: ModuloSlug[] = usuario.es_admin
    ? [
        "panel", "pedidos", "cocina", "caja", "analitica",
        "admin.articulos", "admin.mesas", "admin.reporteria",
        "admin.financiero", "admin.usuarios",
      ]
    : (permisos ?? []).map((p) => p.modulo as ModuloSlug);

  const empresa = Array.isArray(usuario.empresas) ? usuario.empresas[0] : usuario.empresas;

  const session: Session = {
    id_usuario:     usuario.id,
    id_empresa:     usuario.id_empresa,
    nombre_empresa: empresa?.nombre ?? "",
    username:       usuario.username,
    nombre_usuario: usuario.nombre,
    es_admin:       usuario.es_admin,
    permisos:       modulosPermitidos,
  };

  const res = NextResponse.json({ ok: true, session });
  res.cookies.set(SESSION_COOKIE, serializeSession(session), {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });
  return res;
}
