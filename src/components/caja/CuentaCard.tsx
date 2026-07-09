"use client";

import type { CuentaMesa } from "./CajaMonitor";
import { fmtLps } from "@/lib/format";

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
  cuenta: CuentaMesa;
  onClick: () => void;
};

export function CuentaCard({ cuenta, onClick }: Props) {
  const esBarra = cuenta.mesaId === null;
  const titulo = esBarra ? "Barra" : cuenta.numeroMesa ?? "—";
  const estadoBadge = ESTADO_BADGE[cuenta.estado] ?? "bg-muted text-muted-foreground border-border";
  const estadoLabel = ESTADO_LABEL[cuenta.estado] ?? cuenta.estado;

  const horaEntrada = cuenta.fechaApertura
    ? new Date(cuenta.fechaApertura).toLocaleTimeString("es-HN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  /* Ítems activos aplanados de todos los pedidos de la cuenta */
  const items = cuenta.pedidos.flatMap((p) =>
    p.detalles_pedido.filter((d) => d.estado_cocina !== "cancelado")
  );

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex flex-col"
    >
      {/* Cabecera */}
      <div className="bg-primary/5 border-b border-border px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {esBarra ? "Consumo" : "Mesa"}
          </p>
          <p className="text-3xl font-black text-primary leading-none mt-0.5">{titulo}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={[
              "text-[11px] font-semibold px-2.5 py-1 rounded-full border",
              estadoBadge,
            ].join(" ")}
          >
            {estadoLabel}
          </span>
          {cuenta.pedidos.length > 1 && (
            <span className="text-[10px] text-muted-foreground">
              {cuenta.pedidos.length} pedidos
            </span>
          )}
        </div>
      </div>

      {/* Detalle de ítems */}
      <div className="px-5 py-3 flex-1">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Sin ítems activos</p>
        ) : (
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {items.map((d) => (
              <li key={d.id} className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-foreground truncate">
                  <span className="font-semibold">{d.cantidad}×</span>{" "}
                  {d.productos?.nombre ?? "—"}
                  {d.nota && (
                    <span className="text-amber-600 ml-1" title={d.nota}>📝</span>
                  )}
                </span>
                <span className="text-muted-foreground tabular-nums shrink-0">
                  {fmtLps(d.subtotal)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Total */}
      <div className="px-5 pb-3 pt-2 border-t border-border">
        <div className="flex items-baseline justify-between">
          <p className="text-xs text-muted-foreground">Total a cobrar</p>
          <p className="text-xl font-bold text-foreground">{fmtLps(cuenta.total)}</p>
        </div>
        {horaEntrada && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Cuenta abierta: {horaEntrada}
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
