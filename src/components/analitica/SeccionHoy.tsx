"use client";

import type { KpisHoy, PlatoConteo } from "@/hooks/useAnalitica";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

type Props = {
  kpis: KpisHoy;
  platos: PlatoConteo[];
};

export function SeccionHoy({ kpis, platos }: Props) {
  const hoy = new Date().toLocaleDateString("es-HN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const metodosConfig = [
    { key: "efectivo",      label: "Efectivo",     emoji: "💵", value: kpis.porMetodo.efectivo },
    { key: "tarjeta",       label: "Tarjeta",       emoji: "💳", value: kpis.porMetodo.tarjeta },
    { key: "transferencia", label: "Transferencia", emoji: "📲", value: kpis.porMetodo.transferencia },
  ] as const;

  return (
    <section>
      {/* Título sección */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xl">📅</span>
        <div>
          <h2 className="text-lg font-bold text-foreground leading-none">Cierre del Día</h2>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{hoy}</p>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Ingresos totales */}
        <div className="rounded-xl border border-border bg-card p-5 col-span-1 sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ingresos totales</p>
          <p className="text-3xl font-black text-primary mt-1">
            L. {fmt(kpis.ingresos)}
          </p>
        </div>

        {/* Pedidos completados */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pedidos cobrados</p>
          <p className="text-3xl font-black text-foreground mt-1">{kpis.pedidos}</p>
        </div>

        {/* Ticket promedio */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ticket promedio</p>
          <p className="text-3xl font-black text-foreground mt-1">
            {kpis.pedidos > 0 ? `L. ${fmt(kpis.ingresos / kpis.pedidos)}` : "—"}
          </p>
        </div>

        {/* Sin datos */}
        {kpis.pedidos === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 flex items-center justify-center text-center">
            <p className="text-xs text-muted-foreground">Sin ventas registradas hoy aún</p>
          </div>
        )}
      </div>

      {/* Desglose por método de pago */}
      <h3 className="text-sm font-semibold text-foreground mb-3">Desglose por método de pago</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {metodosConfig.map((m) => (
          <div key={m.key} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">{m.emoji}</span>
            <div>
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-lg font-bold text-foreground">L. {fmt(m.value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Platos vendidos hoy */}
      <h3 className="text-sm font-semibold text-foreground mb-3">Platos vendidos hoy</h3>
      {platos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-muted-foreground text-sm">
          No hay platos registrados hoy todavía.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Plato
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Cantidad
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide w-24">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {platos.map((p, i) => {
                const total = platos.reduce((s, x) => s + x.cantidad, 0);
                const pct = total > 0 ? Math.round((p.cantidad / total) * 100) : 0;
                return (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{p.nombre}</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{p.cantidad}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-7 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
