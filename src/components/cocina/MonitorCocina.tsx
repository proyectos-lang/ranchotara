"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { ComandaCard } from "./ComandaCard";

/* ── Tipos locales para la query anidada ──────────────────────── */
export type DetalleConNombre = {
  id: number;
  estado_cocina: string;
  hora_listo: string | null;
  cantidad: number;
  productos: { nombre: string; imagen_url: string | null } | null;
};

export type PedidoCocina = {
  id: number;
  estado: string;
  fecha_creacion: string | null;
  mesas: { numero_mesa: string } | null;
  detalles_pedido: DetalleConNombre[];
};

/* ── Componente principal ─────────────────────────────────────── */
export function MonitorCocina() {
  const [pedidos, setPedidos] = useState<PedidoCocina[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ── Fetch de comandas activas ─── */
  const fetchPedidos = useCallback(async () => {
    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        id,
        estado,
        fecha_creacion,
        mesas ( numero_mesa ),
        detalles_pedido (
          id,
          estado_cocina,
          hora_listo,
          cantidad,
          productos ( nombre, imagen_url )
        )
      `)
      .in("estado", ["pendiente", "en_preparacion"])
      .order("id", { ascending: true });

    if (error) {
      setErrorMsg(`Error al cargar comandas: ${error.message}`);
      return;
    }
    setPedidos((data ?? []) as unknown as PedidoCocina[]);
    setLastUpdate(new Date());
    setErrorMsg(null);
  }, []);

  /* ── Carga inicial ─── */
  useEffect(() => {
    setLoading(true);
    fetchPedidos().finally(() => setLoading(false));
  }, [fetchPedidos]);

  /* ── Suscripción Realtime ─── */
  useEffect(() => {
    const channel = supabase
      .channel("cocina-monitor-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "ranchotara", table: "detalles_pedido" },
        () => { fetchPedidos(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "ranchotara", table: "pedidos" },
        () => { fetchPedidos(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchPedidos]);

  /* ── Avanzar estado de un ítem (pendiente → listo → entregado) ─── */
  const handleNextState = useCallback(
    async (detalleId: number, estadoActual: string, pedidoId: number) => {
      const nuevoEstado = estadoActual === "pendiente" ? "listo" : "entregado";
      const updateData: Record<string, unknown> = { estado_cocina: nuevoEstado };
      if (nuevoEstado === "listo") {
        updateData.hora_listo = new Date().toISOString();
      }

      const { error } = await supabase
        .from("detalles_pedido")
        .update(updateData)
        .eq("id", detalleId);

      if (error) { setErrorMsg(error.message); return; }

      /* Auto-cierre: si todos los detalles del pedido quedan 'entregado' */
      if (nuevoEstado === "entregado") {
        const pedido = pedidos.find((p) => p.id === pedidoId);
        if (pedido) {
          const todosEntregados = pedido.detalles_pedido
            .filter((d) => d.id !== detalleId)
            .every((d) => d.estado_cocina === "entregado");

          if (todosEntregados) {
            await supabase
              .from("pedidos")
              .update({ estado: "entregado" })
              .eq("id", pedidoId);
            // El Realtime eliminará la tarjeta automáticamente
          }
        }
      }

      await fetchPedidos();
    },
    [pedidos, fetchPedidos]
  );

  /* ── Agrupación por estado del pedido ─── */
  const { enCola, cocinando } = useMemo(() => ({
    enCola:    pedidos.filter((p) => p.estado === "pendiente"),
    cocinando: pedidos.filter((p) => p.estado === "en_preparacion"),
  }), [pedidos]);

  /* ── Loading ─── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <span className="text-5xl animate-pulse">👨‍🍳</span>
        <p className="mt-4 text-lg font-medium">Cargando comandas...</p>
      </div>
    );
  }

  return (
    <div className="p-5">
      {/* Error */}
      {errorMsg && (
        <div className="mb-5 p-3 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive text-sm">
          {errorMsg}
        </div>
      )}

      {/* Barra de estado superior */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs px-3 py-1 h-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5" />
          {enCola.length} en cola
        </Badge>
        <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs px-3 py-1 h-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
          {cocinando.length} cocinando
        </Badge>
        <Badge className="bg-card border-border text-muted-foreground text-xs px-3 py-1 h-auto">
          {pedidos.length} comanda{pedidos.length !== 1 ? "s" : ""} activa{pedidos.length !== 1 ? "s" : ""}
        </Badge>
        {lastUpdate && (
          <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            En tiempo real · {lastUpdate.toLocaleTimeString("es-HN")}
          </div>
        )}
      </div>

      {/* Sin comandas */}
      {pedidos.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center text-muted-foreground">
          <p className="text-6xl mb-4">✅</p>
          <p className="text-xl font-semibold text-foreground">¡Cocina al día!</p>
          <p className="text-sm mt-2">
            No hay comandas pendientes. Las nuevas aparecerán aquí automáticamente.
          </p>
        </div>
      )}

      {/* Sección: En Cola (pendiente) */}
      {enCola.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
              En Cola
            </h2>
            <Badge className="bg-amber-100 text-amber-800 border-amber-300">
              {enCola.length}
            </Badge>
            <div className="flex-1 h-px bg-amber-200" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {enCola.map((pedido) => (
              <ComandaCard key={pedido.id} pedido={pedido} onNextState={handleNextState} />
            ))}
          </div>
        </section>
      )}

      {/* Sección: Cocinando (en_preparacion) */}
      {cocinando.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
              Cocinando
            </h2>
            <Badge className="bg-blue-100 text-blue-800 border-blue-300">
              {cocinando.length}
            </Badge>
            <div className="flex-1 h-px bg-blue-200" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cocinando.map((pedido) => (
              <ComandaCard key={pedido.id} pedido={pedido} onNextState={handleNextState} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
