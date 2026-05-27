"use client";

import type { CuentaPendiente } from "./CajaMonitor";

const ESTADO_BADGE: Record<string, string> = {
  pendiente:      "bg-amber-100 text-amber-700 border-amber-200",
  en_preparacion: "bg-blue-100 text-blue-700 border-blue-200",
  listo:          "bg-green-100 text-green-700 border-green-200",
  entregado:      "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente:      "Pendiente",
  en_preparacion: "En preparación",
  listo:          "Listo",
  entregado:      "Entregado",
};

type Props = {
  cuenta: CuentaPendiente;
  onClick: () => void;
};

export function CuentaCard({ cuenta, onClick }: Props) {
  const mesa = cuenta.mesas?.numero_mesa ?? "—";
  const estadoBadge = ESTADO_BADGE[cuenta.estado] ?? "bg-muted text-muted-foreground border-border";
  const estadoLabel = ESTADO_LABEL[cuenta.estado] ?? cuenta.estado;

  const horaEntrada = cuenta.fecha_creacion
    ? new Date(cuenta.fecha_creacion).toLocaleTimeString("es-HN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Cabecera con número de mesa */}
      <div className="bg-primary/5 border-b border-border px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Mesa</p>
          <p className="text-4xl font-black text-primary leading-none mt-0.5">{mesa}</p>
        </div>
        <span
          className={[
            "text-[11px] font-semibold px-2.5 py-1 rounded-full border",
            estadoBadge,
          ].join(" ")}
        >
          {estadoLabel}
        </span>
      </div>

      {/* Total */}
      <div className="px-5 py-4">
        <p className="text-xs text-muted-foreground mb-1">Total a cobrar</p>
        <p className="text-2xl font-bold text-foreground">
          L.{" "}
          {new Intl.NumberFormat("es-HN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(cuenta.total ?? 0)}
        </p>
        {horaEntrada && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Pedido abierto: {horaEntrada}
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="px-5 pb-4">
        <div className="w-full rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors text-primary text-xs font-semibold text-center py-2">
          Cobrar →
        </div>
      </div>
    </button>
  );
}
