import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, parseSession, MODULO_RUTAS } from "@/types/session";
import type { ModuloSlug } from "@/types/session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas públicas: login y API de auth
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const cookieVal = req.cookies.get(SESSION_COOKIE)?.value;
  const session   = cookieVal ? parseSession(cookieVal) : null;

  // Sin sesión → login
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admins tienen acceso total
  if (session.es_admin) {
    return NextResponse.next();
  }

  // Verificar permiso por módulo según la ruta
  const moduloRequerido = (Object.entries(MODULO_RUTAS) as [ModuloSlug, string][]).find(
    ([, ruta]) => pathname === ruta || pathname.startsWith(ruta + "/")
  )?.[0];

  if (moduloRequerido && !session.permisos.includes(moduloRequerido)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon|api/auth).*)"],
};
