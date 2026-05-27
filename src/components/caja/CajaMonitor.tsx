"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CuentaCard } from "./CuentaCard";
import { ModalPago } from "./ModalPago";
import type { MetodoPago } from "@/types/database";

/* ── Tipos locales ─────────────────────────────────────────────── */
export type CuentaPendiente = {
  id: number;
  estado: string;
  total: number;
  fecha_creacion: string | null;
  mesa_id: number;
  mesas: { numero_mesa: string } | null;
};

/* ── Componente principal ─────────────────────────────────────── */
export function CajaMonitor() {
  const [cuentas, setCuentas] = useState<CuentaPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<CuentaPendiente | null>(null);
  const [procesando, setProcesando] = useState(false);

  /* ── Fetch cuentas pendientes ─── */
  const fetchCuentas = useCallback(async () => {
    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        id,
        estado,
        total,
        fecha_creacion,
        mesa_id,
        mesas ( numero_mesa )
      `)
      .not("estado", "eq", "pagado")
      .not("estado", "eq", "cancelado")
      .order("id", { ascending: true });

    if (error) {
      setErrorMsg(`Error al cargar cuentas: ${error.message}`);
      return;
    }
    setCuentas((data ?? []) as unknown as CuentaPendiente[]);
    setErrorMsg(null);
  }, []);

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
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCuentas]);

  /* ── Registrar pago ─── */
  const handleRegistrarPago = useCallback(
    async (cuentaId: number, mesaId: number, metodo: MetodoPago) => {
      setProcesando(true);
      setErrorMsg(null);

      const { error: errPedido } = await supabase
        .from("pedidos")
        .update({
          estado: "pagado",
          metodo_pago: metodo,
          fecha_pago: new Date().toISOString(),
        })
        .eq("id", cuentaId);

      if (errPedido) {
        setErrorMsg(`Error al registrar pago: ${errPedido.message}`);
        setProcesando(false);
        return;
      }

      const { error: errMesa } = await supabase
        .from("mesas")
        .update({ estado: "libre" })
        .eq("id", mesaId);

      if (errMesa) {
        setErrorMsg(`Pago registrado, pero error al liberar mesa: ${errMesa.message}`);
      }

      setProcesando(false);
      setCuentaSeleccionada(null);
      await fetchCuentas();
    },
    [fetchCuentas]
  );

  /* ── Stats ─── */
  const totalPendiente = cuentas.reduce((sum, c) => sum + (c.total ?? 0), 0);

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
            Total por cobrar:{" "}
            {new Intl.NumberFormat("es-HN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(totalPendiente)}{" "}
            L.
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
              key={cuenta.id}
              cuenta={cuenta}
              onClick={() => setCuentaSeleccionada(cuenta)}
            />
          ))}
        </div>
      )}

      {/* Modal de pago */}
      {cuentaSeleccionada && (
        <ModalPago
          cuenta={cuentaSeleccionada}
          procesando={procesando}
          onConfirmar={(metodo) =>
            handleRegistrarPago(cuentaSeleccionada.id, cuentaSeleccionada.mesa_id, metodo)
          }
          onClose={() => setCuentaSeleccionada(null)}
        />
      )}
    </div>
  );
}
