import { supabase } from "@/lib/supabase";
import type { EstadoPedido } from "@/types/database";

/** Estados de un pedido que aún no fue cobrado ni cancelado. */
export const ESTADOS_ABIERTOS: EstadoPedido[] = [
  "pendiente",
  "en_preparacion",
  "listo",
  "entregado",
];

/**
 * Recalcula pedidos.total desde los detalles no cancelados.
 * Fuente canónica del total: usar siempre este helper al agregar
 * o cancelar ítems para evitar read-modify-write concurrente.
 */
export async function recalcularTotalPedido(
  pedidoId: number
): Promise<{ total: number; itemsActivos: number }> {
  const { data, error } = await supabase
    .from("detalles_pedido")
    .select("subtotal")
    .eq("pedido_id", pedidoId)
    .neq("estado_cocina", "cancelado");

  if (error) throw new Error(error.message);

  const filas = data ?? [];
  const total = parseFloat(
    filas.reduce((s, d) => s + (d.subtotal ?? 0), 0).toFixed(2)
  );

  const { error: errUpdate } = await supabase
    .from("pedidos")
    .update({ total })
    .eq("id", pedidoId);

  if (errUpdate) throw new Error(errUpdate.message);

  return { total, itemsActivos: filas.length };
}

/** Libera la mesa solo si no le quedan pedidos abiertos. */
export async function liberarMesaSiSinPedidosAbiertos(
  mesaId: number,
  idEmpresa: number
): Promise<void> {
  const { data, error } = await supabase
    .from("pedidos")
    .select("id")
    .eq("id_empresa", idEmpresa)
    .eq("mesa_id", mesaId)
    .in("estado", ESTADOS_ABIERTOS)
    .limit(1);

  if (error) throw new Error(error.message);
  if ((data ?? []).length > 0) return;

  const { error: errMesa } = await supabase
    .from("mesas")
    .update({ estado: "libre" })
    .eq("id", mesaId);

  if (errMesa) throw new Error(errMesa.message);
}
