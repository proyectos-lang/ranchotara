export type Categoria = {
  id: number;
  id_empresa: number;
  nombre: string;
  descripcion: string | null;
};

export type Producto = {
  id: number;
  id_empresa: number;
  categoria_id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  imagen_url: string | null;
  disponible: boolean;
};

export type EstadoMesa = "libre" | "ocupada" | "reservada";

export type EstadoPedido = "pendiente" | "en_preparacion" | "listo" | "pagado" | "cancelado" | "entregado";
export type EstadoCocina = "pendiente" | "listo" | "entregado" | "cancelado";

export type MetodoPago = "efectivo" | "tarjeta" | "transferencia";

export type Pedido = {
  id: number;
  id_empresa: number;
  mesa_id: number | null;
  estado: EstadoPedido;
  total: number;
  fecha_creacion: string | null;
  metodo_pago: MetodoPago | null;
  fecha_pago: string | null;
  propina: number;
  descuento: number;
  monto_recibido: number | null;
};

export type DetallePedido = {
  id: number;
  pedido_id: number;
  producto_id: number;
  cantidad: number;
  subtotal: number;
  estado_cocina: EstadoCocina;
  nota: string | null;
  hora_inicio_preparacion: string | null;
  hora_listo: string | null;
  hora_entregado: string | null;
};

export type Mesa = {
  id: number;
  id_empresa: number;
  numero_mesa: string;
  estado: EstadoMesa;
  zona: string | null;
};

// ── Multi-tenant ─────────────────────────────────────────────────

export type Empresa = {
  id: number;
  nombre: string;
  activo: boolean;
  created_at: string;
};

export type Usuario = {
  id: number;
  id_empresa: number;
  username: string;
  nombre: string;
  es_admin: boolean;
  activo: boolean;
  created_at: string;
};

export type PermisoUsuario = {
  id: number;
  id_usuario: number;
  modulo: string;
  puede_acceder: boolean;
};

// ── Módulo Financiero ────────────────────────────────────────────

export type TipoCosto = {
  id: number;
  id_empresa: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
};

export type Gasto = {
  id: number;
  id_empresa: number;
  tipo_costo_id: number;
  concepto: string;
  monto: number;
  fecha: string;          // "YYYY-MM-DD"
  notas: string | null;
  created_at: string;
};

export type GastoConTipo = Gasto & {
  tipos_costo: Pick<TipoCosto, "id" | "nombre">;
};

export type FilaEstadoResultados = {
  anio: number;
  mes: number;
  tipo: "ingreso" | "gasto";
  categoria: string;
  total: number;
  id_empresa: number;
};

export type MesFinanciero = {
  anio: number;
  mes: number;
  label: string;                              // "Jun 2025"
  ingresos: number;
  gastosPorCategoria: Record<string, number>;
  totalGastos: number;
  utilidad: number;
};
