export type Categoria = {
  id: number;
  nombre: string;
  descripcion: string | null;
};

export type Producto = {
  id: number;
  categoria_id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  imagen_url: string | null;
  disponible: boolean;
};

export type EstadoMesa = "libre" | "ocupada" | "reservada";

export type EstadoPedido = "pendiente" | "en_preparacion" | "listo" | "pagado" | "cancelado" | "entregado";
export type EstadoCocina = "pendiente" | "listo" | "entregado";

export type MetodoPago = "efectivo" | "tarjeta" | "transferencia";

export type Pedido = {
  id: number;
  mesa_id: number | null;
  estado: EstadoPedido;
  total: number;
  fecha_creacion: string | null;
  metodo_pago: MetodoPago | null;
  fecha_pago: string | null;
};

export type DetallePedido = {
  id: number;
  pedido_id: number;
  producto_id: number;
  cantidad: number;
  subtotal: number;
  estado_cocina: EstadoCocina;
  hora_listo: string | null;
};

export type Mesa = {
  id: number;
  numero_mesa: string;
  estado: EstadoMesa;
  zona: string | null;
};
