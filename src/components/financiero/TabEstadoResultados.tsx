"use client";

import { useState } from "react";
import { useFinanciero } from "@/hooks/useFinanciero";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

const fmtL = (n: number) =>
  `L. ${new Intl.NumberFormat("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;

const fmtLCorto = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `L.${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `L.${(n / 1_000).toFixed(0)}k`;
  return `L.${n.toFixed(0)}`;
};

export function TabEstadoResultados() {
  const [meses, setMeses] = useState(6);
  const { columnas, categoriasGasto, cargando, error } = useFinanciero({ meses });

  if (cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
    );
  }

  const chartData = columnas.map((col) => ({
    mes: col.label,
    Ingresos: col.ingresos,
    Gastos: col.totalGastos,
    Utilidad: col.utilidad,
  }));

  return (
    <div className="space-y-6">
      {/* Control de período */}
      <div className="flex items-center gap-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
          Período
        </Label>
        <Select value={String(meses)} onValueChange={(v) => setMeses(Number(v))}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Tabla columnar ── */}
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-44">
                  Concepto
                </th>
                {columnas.map((col) => (
                  <th
                    key={`${col.anio}-${col.mes}`}
                    className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* ── INGRESOS ── */}
              <tr className="bg-primary/5 border-b border-border">
                <td className="px-5 py-2.5 text-xs font-bold text-primary uppercase tracking-widest" colSpan={columnas.length + 1}>
                  Ingresos
                </td>
              </tr>
              <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3 text-sm text-foreground pl-8">Ventas</td>
                {columnas.map((col) => (
                  <td key={`${col.anio}-${col.mes}-ing`} className="px-4 py-3 text-right tabular-nums text-sm font-medium text-foreground whitespace-nowrap">
                    {fmtL(col.ingresos)}
                  </td>
                ))}
              </tr>

              {/* ── GASTOS ── */}
              <tr className="bg-muted/40 border-b border-border">
                <td className="px-5 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-widest" colSpan={columnas.length + 1}>
                  Gastos
                </td>
              </tr>
              {categoriasGasto.length === 0 ? (
                <tr className="border-b border-border">
                  <td className="px-5 py-3 text-sm text-muted-foreground pl-8 italic">Sin gastos registrados</td>
                  {columnas.map((col) => (
                    <td key={`${col.anio}-${col.mes}-nocat`} className="px-4 py-3 text-right text-sm text-muted-foreground">—</td>
                  ))}
                </tr>
              ) : (
                categoriasGasto.map((cat) => (
                  <tr key={cat} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 text-sm text-foreground pl-8">{cat}</td>
                    {columnas.map((col) => (
                      <td key={`${col.anio}-${col.mes}-${cat}`} className="px-4 py-3 text-right tabular-nums text-sm text-foreground whitespace-nowrap">
                        {col.gastosPorCategoria[cat] > 0 ? fmtL(col.gastosPorCategoria[cat]) : <span className="text-muted-foreground">—</span>}
                      </td>
                    ))}
                  </tr>
                ))
              )}
              {/* Total Gastos */}
              <tr className="border-b-2 border-border bg-muted/20">
                <td className="px-5 py-3 text-sm font-bold text-foreground pl-8">Total Gastos</td>
                {columnas.map((col) => (
                  <td key={`${col.anio}-${col.mes}-total`} className="px-4 py-3 text-right tabular-nums text-sm font-bold text-foreground whitespace-nowrap">
                    {fmtL(col.totalGastos)}
                  </td>
                ))}
              </tr>

              {/* ── UTILIDAD NETA ── */}
              <tr>
                <td className="px-5 py-4 text-sm font-bold text-foreground">Utilidad Neta</td>
                {columnas.map((col) => (
                  <td
                    key={`${col.anio}-${col.mes}-util`}
                    className={cn(
                      "px-4 py-4 text-right tabular-nums text-sm font-extrabold whitespace-nowrap",
                      col.utilidad >= 0 ? "text-emerald-600" : "text-destructive"
                    )}
                  >
                    {fmtL(col.utilidad)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Gráfico de barras ── */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold text-foreground mb-4">Ingresos vs Gastos por mes</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.922 0 0)" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: "oklch(0.556 0 0)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={fmtLCorto}
              tick={{ fontSize: 11, fill: "oklch(0.556 0 0)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: unknown, name: unknown) => [fmtL(Number(value)), String(name)]}
              contentStyle={{ borderRadius: "0.625rem", border: "1px solid oklch(0.922 0 0)", fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Ingresos" fill="#344966" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Gastos"   fill="#abcde0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
