import { NextRequest, NextResponse } from "next/server";
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
    .from("empresas")
    .select("*")
    .order("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const { nombre } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "El nombre es requerido." }, { status: 400 });

  const { data, error } = await supabase
    .from("empresas")
    .insert({ nombre: nombre.trim(), activo: true })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
