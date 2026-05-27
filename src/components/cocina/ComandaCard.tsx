"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { PedidoCocina, DetalleConNombre } from "./MonitorCocina";

/* ── Helpers de tiempo ─────────────────────────────────────────── */
function minutosDesde(isoString: string | null): number {
  if (!isoString) return 0;
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 60_000);
}

function formatMinutos(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/* ── Badges de estado del pedido (nivel comanda) ───────────────── */
const PEDIDO_BADGE: Record<string, { className: string; label: string }> = {
  pendiente: {
    className: "bg-amber-100 text-amber-800 border-amber-300",
    label: "En Cola",
  },
  en_preparacion: {
    className: "bg-blue-100 text-blue-800 border-blue-300",
    label: "Cocinando",
  },
};

/* ── Badges de estado por ítem (nivel detalle) ─────────────────── */
const ITEM_BADGE: Record<string, { className: string; label: string }> = {
  pendiente: {
    className: "bg-amber-100 text-amber-800 border-amber-300",
    label: "Pendiente",
  },
  listo: {
    className: "bg-emerald-100 text-emerald-800 border-emerald-300",
    label: "Listo",
  },
  entregado: {
    className: "bg-slate-100 text-slate-500 border-slate-200",
    label: "Entregado",
  },
};

/* ── Props ─────────────────────────────────────────────────────── */
type Props = {
  pedido: PedidoCocina;
  onNextState: (detalleId: number, estadoActual: string, pedidoId: number) => Promise<void>;
};

/* ── Componente ────────────────────────────────────────────────── */
export function ComandaCard({ pedido, onNextState }: Props) {
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const minutos = minutosDesde(pedido.fecha_creacion);
  const urgente = minutos > 15;

  const pedidoBadge = PEDIDO_BADGE[pedido.estado];

  const handleClick = async (detalle: DetalleConNombre) => {
    if (detalle.estado_cocina === "entregado") return;
    setLoadingId(detalle.id);
    try {
      await onNextState(detalle.id, detalle.estado_cocina, pedido.id);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div
      className={[
        "flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden",
        urgente ? "border-red-300 shadow-red-100 shadow-md" : "border-border",
      ].join(" ")}
    >
      {/* ── Cabecera ── */}
      <div
        className={[
          "flex items-center justify-between px-4 py-3 border-b border-border gap-2",
          urgente ? "bg-red-50" : "bg-muted/30",
        ].join(" ")}
      >
        {/* Mesa + badge estado comanda */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base font-bold text-foreground shrink-0">
            {pedido.mesas ? `Mesa ${pedido.mesas.numero_mesa}` : "Barra"}
          </span>
          {pedidoBadge && (
            <Badge className={pedidoBadge.className}>
              {pedidoBadge.label}
            </Badge>
          )}
          {urgente && (
            <Badge className="bg-red-100 text-red-700 border-red-300 animate-pulse shrink-0">
              ⚠ Urgente
            </Badge>
          )}
        </div>

        {/* Tiempo + id */}
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span
            className={[
              "text-sm font-semibold tabular-nums",
              urgente ? "text-red-600" : "text-muted-foreground",
            ].join(" ")}
          >
            {formatMinutos(minutos)}
          </span>
          <span className="text-[10px] text-muted-foreground">#{pedido.id}</span>
        </div>
      </div>

      {/* ── Lista de ítems ── */}
      <ul className="flex flex-col divide-y divide-border flex-1">
        {pedido.detalles_pedido.map((detalle) => {
          const isLoading = loadingId === detalle.id;
          const esPendiente = detalle.estado_cocina === "pendiente";
          const esEntregado = detalle.estado_cocina === "entregado";
          const itemBadge = ITEM_BADGE[detalle.estado_cocina];

          return (
            <li
              key={detalle.id}
              className={[
                "flex items-center gap-3 px-4 py-3 transition-colors",
                esEntregado ? "opacity-40" : "",
              ].join(" ")}
            >
              {/* Imagen del producto */}
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border bg-muted">
                {detalle.productos?.imagen_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detalle.productos.imagen_url}
                    alt={detalle.productos.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">
                    🍽️
                  </div>
                )}
              </div>

              {/* Nombre + cantidad + badge */}
              <div className="flex-1 min-w-0 space-y-1">
                <span
                  className={[
                    "block text-sm font-semibold leading-tight line-clamp-2",
                    esEntregado
                      ? "line-through text-muted-foreground"
                      : "text-foreground",
                  ].join(" ")}
                >
                  {detalle.productos?.nombre ?? "Producto eliminado"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Cantidad:{" "}
                    <span className="font-bold text-foreground">
                      {detalle.cantidad}
                    </span>
                  </span>
                  {itemBadge && (
                    <Badge className={itemBadge.className}>
                      {itemBadge.label}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Botón acción */}
              {esEntregado ? (
                <span className="text-green-600 text-lg shrink-0">✓</span>
              ) : (
                <button
                  onClick={() => handleClick(detalle)}
                  disabled={isLoading}
                  className={[
                    "min-h-[44px] min-w-[96px] px-3 rounded-lg text-xs font-semibold shrink-0",
                    "border transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
                    esPendiente
                      ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
                  ].join(" ")}
                >
                  {isLoading ? "..." : esPendiente ? "Marcar Listo" : "Entregar"}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* ── Footer: hora de entrada ── */}
      <div className="px-4 py-2 border-t border-border bg-muted/20">
        <p className="text-[10px] text-muted-foreground text-right">
          Entrada:{" "}
          {pedido.fecha_creacion
            ? new Date(pedido.fecha_creacion).toLocaleTimeString("es-HN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </p>
      </div>
    </div>
  );
}
