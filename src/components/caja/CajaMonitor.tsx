"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/context/SessionContext";
import { ESTADOS_ABIERTOS, liberarMesaSiSinPedidosAbiertos, recalcularTotalPedido } from "@/lib/pedidos";
import { CuentaCard } from "./CuentaCard";
import { ModalPago } from "./ModalPago";
import { fmtLps } from "@/lib/format";
import type { MetodoPago } from "@/types/database";

/* ── Tipos locales ─────────────────────────────────────────────── */
export type DetalleCuenta = {
  id: number;
  cantidad: number;
  subtotal: number;
  estado_cocina: string;
  nota: string | null;
  productos: { nombre: string } | null;
};

export type PedidoCuenta = {
  id: number;
  estado: string;
  total: number;
  fecha_creacion: string | null;
  mesa_id: number | null;
  mesas: { numero_mesa: string } | null;
  detalles_pedido: DetalleCuenta[];
};

export type CuentaMesa = {
  key: string;
  mesaId: number | null;
  numeroMesa: string | null;
  pedidos: PedidoCuenta[];
  total: number;
  fechaApertura: string | null;
  estado: string;
};

export type DatosPago = {
  metodo: MetodoPago;
  propina: number;
  descuento: number;
  montoRecibido: number | null;
};

/* Orden de avance para el badge de la cuenta (se muestra el menos avanzado) */
const ORDEN_ESTADO: Record<string, number> = {
  pendiente: 0,
  en_preparacion: 1,
  listo: 2,
  entregado: 3,
};

/* ── Componente principal ─────────────────────────────────────── */
export function CajaMonitor() {
  const { session } = useSession();
  const [pedidos, setPedidos] = useState<PedidoCuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cuentaKeySeleccionada, setCuentaKeySeleccionada] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  /* ── Fetch pedidos abiertos ─── */
  const fetchCuentas = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        id,
        estado,
        total,
        fecha_creacion,
        mesa_id,
        mesas ( numero_mesa ),
        detalles_pedido (
          id,
          cantidad,
          subtotal,
          estado_cocina,
          nota,
          productos ( nombre )
        )
      `)
      .eq("id_empresa", session.id_empresa)
      .in("estado", ESTADOS_ABIERTOS)
      .order("id", { ascending: true });

    if (error) {
      setErrorMsg(`Error al cargar cuentas: ${error.message}`);
      return;
    }
    setPedidos((data ?? []) as unknown as PedidoCuenta[]);
    setErrorMsg(null);
  }, [session]);

  /* ── Carga inicial ─── */
  useEffect(() => {
    setLoading(true);
    fetchCuentas().finally(() => setLoading(false));
  }, [fetchCuentas]);

  /* ── Realtime ─── */
  useEffect(() => {
    const channel = supabase
      .channel("caja-monitor-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "ranchotara", table: "pedidos" },
        () => { fetchCuentas(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "ranchotara", table: "detalles_pedido" },
        () => { fetchCuentas(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCuentas]);

  /* ── Agrupar pedidos en cuentas (una por mesa; barra individual) ─── */
  const cuentas = useMemo<CuentaMesa[]>(() => {
    const map = new Map<string, CuentaMesa>();
    for (const p of pedidos) {
      const key = p.mesa_id !== null ? `mesa-${p.mesa_id}` : `barra-${p.id}`;
      const existente = map.get(key);
      if (existente) {
        existente.pedidos.push(p);
        existente.total += p.total ?? 0;
        if (
          p.fecha_creacion &&
          (!existente.fechaApertura || p.fecha_creacion < existente.fechaApertura)
        ) {
          existente.fechaApertura = p.fecha_creacion;
        }
        if ((ORDEN_ESTADO[p.estado] ?? 0) < (ORDEN_ESTADO[existente.estado] ?? 0)) {
          existente.estado = p.estado;
        }
      } else {
        map.set(key, {
          key,
          mesaId: p.mesa_id,
          numeroMesa: p.mesas?.numero_mesa ?? null,
          pedidos: [p],
          total: p.total ?? 0,
          fechaApertura: p.fecha_creacion,
          estado: p.estado,
        });
      }
    }
    return Array.from(map.values());
  }, [pedidos]);

  const cuentaSeleccionada = useMemo(
    () => cuentas.find((c) => c.key === cuentaKeySeleccionada) ?? null,
    [cuentas, cuentaKeySeleccionada]
  );

  /* ── Registrar pago (multi-pedido) ─── */
  const handleRegistrarPago = useCallback(
    async (cuenta: CuentaMesa, datos: DatosPago) => {
      if (!session) return;
      setProcesando(true);
      setErrorMsg(null);

      const ids = cuenta.pedidos.map((p) => p.id);

      /* 1. Verificación de concurrencia: si la cuenta cambió, abortar */
      const { data: verif, error: errVerif } = await supabase
        .from("pedidos")
        .select("id, total")
        .in("id", ids)
        .in("estado", ESTADOS_ABIERTOS);

      if (errVerif) {
        setErrorMsg(`Error al verificar la cuenta: ${errVerif.message}`);
        setProcesando(false);
        return;
      }

      const totalActual = (verif ?? []).reduce((s, p) => s + (p.total ?? 0), 0);
      if (
        (verif ?? []).length !== ids.length ||
        Math.abs(totalActual - cuenta.total) > 0.01
      ) {
        setErrorMsg("La cuenta cambió (ítems nuevos o cancelados). Revisa de nuevo antes de cobrar.");
        setProcesando(false);
        setCuentaKeySeleccionada(null);
        await fetchCuentas();
        return;
      }

      const fechaPago = new Date().toISOString();
      /* 2. Pedido principal (menor id) lleva propina/descuento/monto completos;
         el resto queda en 0/null para no duplicar en reportes */
      const [principal, ...resto] = ids;

      const { error: errPrincipal } = await supabase
        .from("pedidos")
        .update({
          estado: "pagado",
          metodo_pago: datos.metodo,
          fecha_pago: fechaPago,
          propina: datos.propina,
          descuento: datos.descuento,
          monto_recibido: datos.montoRecibido,
        })
        .eq("id", principal)
        .neq("estado", "pagado");

      if (errPrincipal) {
        setErrorMsg(`Error al registrar pago: ${errPrincipal.message}`);
        setProcesando(false);
        return;
      }

      if (resto.length > 0) {
        const { error: errResto } = await supabase
          .from("pedidos")
          .update({ estado: "pagado", metodo_pago: datos.metodo, fecha_pago: fechaPago })
          .in("id", resto)
          .not("estado", "in", "(pagado,cancelado)");

        if (errResto) {
          setErrorMsg(`Pago parcial: el pedido #${principal} quedó pagado pero otros fallaron: ${errResto.message}`);
          setProcesando(false);
          await fetchCuentas();
          return;
        }
      }

      /* 3. Liberar mesa solo si no quedan pedidos abiertos */
      if (cuenta.mesaId !== null) {
        try {
          await liberarMesaSiSinPedidosAbiertos(cuenta.mesaId, session.id_empresa);
        } catch (err) {
          setErrorMsg(
            `Pago registrado, pero error al liberar mesa: ${err instanceof Error ? err.message : "desconocido"}`
          );
        }
      }

      setProcesando(false);
      setCuentaKeySeleccionada(null);
      await fetchCuentas();
    },
    [session, fetchCuentas]
  );

  /* ── Cancelar pedido completo ─── */
  const handleCancelarPedido = useCallback(
    async (pedidoId: number) => {
      if (!session) return;
      setErrorMsg(null);

      const { data: p, error } = await supabase
        .from("pedidos")
        .update({ estado: "cancelado" })
        .eq("id", pedidoId)
        .in("estado", ESTADOS_ABIERTOS)
        .select("mesa_id")
        .maybeSingle();

      if (error) {
        setErrorMsg(`Error al cancelar pedido: ${error.message}`);
        return;
      }

      if (p?.mesa_id != null) {
        try {
          await liberarMesaSiSinPedidosAbiertos(p.mesa_id, session.id_empresa);
        } catch {
          /* la mesa se puede liberar manualmente desde el panel */
        }
      }

      setCuentaKeySeleccionada(null);
      await fetchCuentas();
    },
    [session, fetchCuentas]
  );

  /* ── Cancelar ítem individual ─── */
  const handleCancelarItem = useCallback(
    async (detalleId: number, pedidoId: number) => {
      setErrorMsg(null);

      const { error } = await supabase
        .from("detalles_pedido")
        .update({ estado_cocina: "cancelado" })
        .eq("id", detalleId);

      if (error) {
        setErrorMsg(`Error al cancelar ítem: ${error.message}`);
        return;
      }

      try {
        const { itemsActivos } = await recalcularTotalPedido(pedidoId);
        // Pedido sin ítems vivos → cancelarlo por completo
        if (itemsActivos === 0) {
          await handleCancelarPedido(pedidoId);
          return;
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Error al recalcular total.");
      }

      await fetchCuentas();
    },
    [fetchCuentas, handleCancelarPedido]
  );

  /* ── Stats ─── */
  const totalPendiente = cuentas.reduce((sum, c) => sum + c.total, 0);

  /* ── Loading ─── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <span className="text-5xl animate-pulse">💰</span>
        <p className="mt-4 text-lg font-medium">Cargando cuentas...</p>
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

      {/* Barra de resumen */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium text-muted-foreground">
          📋 {cuentas.length} cuenta{cuentas.length !== 1 ? "s" : ""} pendiente{cuentas.length !== 1 ? "s" : ""}
        </div>
        {cuentas.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-xs font-semibold text-primary">
            Total por cobrar: {fmtLps(totalPendiente)}
          </div>
        )}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          En tiempo real
        </div>
      </div>

      {/* Grid de cuentas */}
      {cuentas.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center text-muted-foreground">
          <p className="text-6xl mb-4">✅</p>
          <p className="text-xl font-semibold text-foreground">¡Sin cuentas pendientes!</p>
          <p className="text-sm mt-2">
            Todas las cuentas han sido cobradas. Las nuevas aparecerán aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cuentas.map((cuenta) => (
            <CuentaCard
              key={cuenta.key}
              cuenta={cuenta}
              onClick={() => setCuentaKeySeleccionada(cuenta.key)}
            />
          ))}
        </div>
      )}

      {/* Modal de pago */}
      {cuentaSeleccionada && (
        <ModalPago
          cuenta={cuentaSeleccionada}
          procesando={procesando}
          onConfirmar={(datos) => handleRegistrarPago(cuentaSeleccionada, datos)}
          onCancelarItem={handleCancelarItem}
          onCancelarPedido={handleCancelarPedido}
          onClose={() => setCuentaKeySeleccionada(null)}
        />
      )}
    </div>
  );
}
