"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis,
  Legend, ResponsiveContainer,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, CHART_COLORS } from "@/components/ui/chart";
import type { VentaDia, PlatoConteo, InsightTrafico } from "@/hooks/useAnalitica";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/* Etiqueta corta para el eje X: "dd/mm" */
function labelFecha(iso: string) {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

type Props = {
  ventas: VentaDia[];
  top5: PlatoConteo[];
  trafico: InsightTrafico;
};

export function SeccionHistorica({ ventas, top5, trafico }: Props) {
  const hayVentas = ventas.some((v) => v.total > 0);
  const hayTop5 = top5.length > 0;

  /* Solo mostrar los últimos 30 días con etiqueta cada 5 días */
  const ventasTick = ventas.map((v, i) => ({
    ...v,
    label: i % 5 === 0 ? labelFecha(v.fecha) : "",
  }));

  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xl">📈</span>
        <div>
          <h2 className="text-lg font-bold text-foreground leading-none">Analítica Histórica</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Últimos 30 días</p>
        </div>
      </div>

      {/* Insights de tráfico */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-4">
          <span className="text-3xl">⏰</span>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Hora pico</p>
            <p className="text-xl font-black text-primary mt-0.5">{trafico.horaPico}</p>
            <p className="text-xs text-muted-foreground">Mayor concentración de pedidos</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-4">
          <span className="text-3xl">📆</span>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Día más activo</p>
            <p className="text-xl font-black text-primary mt-0.5">{trafico.diaPico}</p>
            <p className="text-xs text-muted-foreground">Día con más pedidos cobrados</p>
          </div>
        </div>
      </div>

      {/* Gráfico de ventas por día */}
      <h3 className="text-sm font-semibold text-foreground mb-3">Ingresos diarios (últimos 30 días)</h3>
      <div className="rounded-xl border border-border bg-card p-5 mb-8">
        {!hayVentas ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            Sin datos de ventas suficientes aún.
          </div>
        ) : (
          <ChartContainer height={260}>
            <BarChart data={ventasTick} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0.02 78)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "oklch(0.52 0.04 55)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "oklch(0.52 0.04 55)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: unknown) => typeof v === "number" ? `L.${(v / 1000).toFixed(0)}k` : ""}
                width={52}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`L. ${fmt(value)}`, "Ingresos"]}
                    labelFormatter={(label) => label || ""}
                  />
                }
              />
              <Bar dataKey="total" fill="oklch(0.42 0.085 45)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </div>

      {/* Top 5 platos + PieChart */}
      <h3 className="text-sm font-semibold text-foreground mb-3">Top 5 platos más vendidos</h3>
      {!hayTop5 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-muted-foreground text-sm">
          Sin datos de productos suficientes aún.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gráfico circular */}
          <div className="rounded-xl border border-border bg-card p-5">
            <ChartContainer height={240}>
              <PieChart>
                <Pie
                  data={top5}
                  dataKey="cantidad"
                  nameKey="nombre"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={48}
                  paddingAngle={3}
                  label={({ percent }: { percent?: number }) =>
                    `${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {top5.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [`${value} uds.`, name ?? ""]}
                    />
                  }
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ fontSize: 11, color: "oklch(0.52 0.04 55)" }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ChartContainer>
          </div>

          {/* Barras horizontales */}
          <div className="rounded-xl border border-border bg-card p-5">
            <ChartContainer height={240}>
              <BarChart
                layout="vertical"
                data={top5}
                margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0.02 78)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "oklch(0.52 0.04 55)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  tick={{ fontSize: 11, fill: "oklch(0.52 0.04 55)" }}
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [`${value} uds.`, "Vendidos"]}
                    />
                  }
                />
                <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                  {top5.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      )}
    </section>
  );
}
