export const MODULOS = [
  "panel",
  "pedidos",
  "cocina",
  "caja",
  "analitica",
  "admin.articulos",
  "admin.mesas",
  "admin.reporteria",
  "admin.financiero",
  "admin.usuarios",
] as const;

export type ModuloSlug = typeof MODULOS[number];

export type Session = {
  id_usuario: number;
  id_empresa: number;
  nombre_empresa: string;
  username: string;
  nombre_usuario: string;
  es_admin: boolean;
  permisos: ModuloSlug[];
};

export const SESSION_COOKIE = "rt_session";

export function parseSession(cookieValue: string): Session | null {
  try {
    return JSON.parse(decodeURIComponent(cookieValue)) as Session;
  } catch {
    return null;
  }
}

export function serializeSession(session: Session): string {
  return encodeURIComponent(JSON.stringify(session));
}

// Etiquetas legibles de cada módulo (UI de permisos)
export const MODULO_LABELS: Record<ModuloSlug, string> = {
  panel:              "Panel de Mesas",
  pedidos:            "Pedidos / Barra",
  cocina:             "Cocina",
  caja:               "Caja",
  analitica:          "Analítica",
  "admin.articulos":  "Artículos",
  "admin.mesas":      "Mesas (Admin)",
  "admin.reporteria": "Reportería",
  "admin.financiero": "Financiero",
  "admin.usuarios":   "Usuarios (Admin)",
};

// Mapeo módulo → prefijo de ruta para el middleware
export const MODULO_RUTAS: Record<ModuloSlug, string> = {
  panel:               "/panel",
  pedidos:             "/pedidos",
  cocina:              "/cocina",
  caja:                "/caja",
  analitica:           "/analitica",
  "admin.articulos":   "/admin/articulos",
  "admin.mesas":       "/admin/mesas",
  "admin.reporteria":  "/admin/reporteria",
  "admin.financiero":  "/admin/financiero",
  "admin.usuarios":    "/admin/usuarios",
};
