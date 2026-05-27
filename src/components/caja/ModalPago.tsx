"use client";

import { useState } from "react";
import type { MetodoPago } from "@/types/database";
import type { CuentaPendiente } from "./CajaMonitor";

const METODOS: { value: MetodoPago; label: string; emoji: string; desc: string }[] = [
  { value: "efectivo",      label: "Efectivo",      emoji: "💵", desc: "Pago en billetes o monedas" },
  { value: "tarjeta",       label: "Tarjeta",        emoji: "💳", desc: "Débito o crédito" },
  { value: "transferencia", label: "Transferencia",  emoji: "📲", desc: "Transferencia bancaria" },
];

type Props = {
  cuenta: CuentaPendiente;
  procesando: boolean;
  onConfirmar: (metodo: MetodoPago) => Promise<void>;
  onClose: () => void;
};

export function ModalPago({ cuenta, procesando, onConfirmar, onClose }: Props) {
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo");

  const totalFormateado = new Intl.NumberFormat("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cuenta.total ?? 0);

  const mesa = cuenta.mesas?.numero_mesa ?? "—";

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !procesando) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Registrar Pago
            </p>
            <p className="text-lg font-bold text-foreground">Mesa {mesa}</p>
          </div>
          <button
            onClick={onClose}
            disabled={procesando}
            className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none disabled:opacity-40"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Total destacado */}
        <div className="px-6 py-5 bg-primary/5 border-b border-border text-center">
          <p className="text-xs text-muted-foreground mb-1">Total a cobrar</p>
          <p className="text-4xl font-black text-primary">L. {totalFormateado}</p>
        </div>

        {/* Selector de método */}
        <div className="px-6 py-5">
          <p className="text-sm font-semibold text-foreground mb-3">Método de pago</p>
          <div className="flex flex-col gap-2">
            {METODOS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMetodo(m.value)}
                disabled={procesando}
                className={[
                  "flex items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  metodo === m.value
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-background hover:border-primary/40 hover:bg-primary/5",
                ].join(" ")}
              >
                <span className="text-2xl">{m.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </div>
                {/* Radio indicator */}
                <span
                  className={[
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    metodo === m.value
                      ? "border-primary"
                      : "border-muted-foreground/40",
                  ].join(" ")}
                >
                  {metodo === m.value && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={procesando}
            className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(metodo)}
            disabled={procesando}
            className="flex-[2] rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {procesando ? "Registrando..." : "✓ Registrar Pago"}
          </button>
        </div>
      </div>
    </div>
  );
}
