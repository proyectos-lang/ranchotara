"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

/* ── Tipos ──────────────────────────────────────────────────────── */
type RawPedido = {
  id: number;
  fecha_creacion: string | null;
  mesas: { numero_mesa: string } | null;
  detalles_pedido: {
    cantidad: number;
    subtotal: number;
    productos: { nombre: string } | null;
  }[];
};

type VentaLinea = {
  pedido_id: number;
  fecha_obj: Date | null;
  mesa: string;
  articulo: string;
  cantidad: number;
  subtotal: number;
};

const BLOQUES = [
  { value: "todos",    label: "Todos los horarios" },
  { value: "manana",   label: "Mañana (06:00–11:59)" },
  { value: "mediodia", label: "Mediodía (12:00–14:59)" },
  { value: "tarde",    label: "Tarde (15:00–17:59)" },
  { value: "noche",    label: "Noche (18:00–23:59)" },
];

/* ── Helpers ────────────────────────────────────────────────────── */
const hoy = () => new Date().toISOString().slice(0, 10);
const hace30 = () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); };

const fmtFecha = (d: Date | null) =>
  d ? d.toLocaleDateString("es-HN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const fmtHora = (d: Date | null) =>
  d ? d.toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" }) : "—";

const fmtL = (n: number) =>
  `L. ${new Intl.NumberFormat("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;

function enBloque(d: Date | null, bloque: string): boolean {
  if (!d || bloque === "todos") return true;
  const h = d.getHours();
  if (bloque === "manana")   return h >= 6  && h < 12;
  if (bloque === "mediodia") return h >= 12 && h < 15;
  if (bloque === "tarde")    return h >= 15 && h < 18;
  if (bloque === "noche")    return h >= 18 && h < 24;
  return true;
}

/* ── Componente ─────────────────────────────────────────────────── */
export function TabVentas() {
  const [lineas, setLineas]       = useState<VentaLinea[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [dateFrom, setDateFrom]   = useState(hace30);
  const [dateTo, setDateTo]       = useState(hoy);
  const [articuloFiltro, setArticuloFiltro] = useState("todos");
  const [bloqueFiltro, setBloqueFiltro]     = useState("todos");

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("pedidos")
      .select(`
        id,
        fecha_creacion,
        mesas ( numero_mesa ),
        detalles_pedido (
          cantidad,
          subtotal,
          productos ( nombre )
        )
      `)
      .eq("estado", "pagado")
      .gte("fecha_creacion", `${dateFrom}T00:00:00`)
      .lte("fecha_creacion", `${dateTo}T23:59:59`)
      .order("fecha_creacion", { ascending: false });

    if (err) { setError(err.message); setLoading(false); return; }

    const flat: VentaLinea[] = [];
    for (const p of (data ?? []) as unknown as RawPedido[]) {
      const fechaObj = p.fecha_creacion ? new Date(p.fecha_creacion) : null;
      for (const d of p.detalles_pedido) {
        flat.push({
          pedido_id: p.id,
          fecha_obj: fechaObj,
          mesa: p.mesas?.numero_mesa ?? "Barra",
          articulo: d.productos?.nombre ?? "—",
          cantidad: d.cantidad,
          subtotal: d.subtotal,
        });
      }
    }
    setLineas(flat);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Artículos únicos para el filtro ── */
  const articulos = useMemo(() => {
    const set = new Set(lineas.map((l) => l.articulo).filter((a) => a !== "—"));
    return Array.from(set).sort();
  }, [lineas]);

  /* ── Filtrado cliente ── */
  const filtradas = useMemo(() =>
    lineas.filter((l) => {
      if (articuloFiltro !== "todos" && l.articulo !== articuloFiltro) return false;
      if (!enBloque(l.fecha_obj, bloqueFiltro)) return false;
      return true;
    }),
  [lineas, articuloFiltro, bloqueFiltro]);

  const totalSubtotal = useMemo(() => filtradas.reduce((s, l) => s + l.subtotal, 0), [filtradas]);
  const totalUnidades = useMemo(() => filtradas.reduce((s, l) => s + l.cantidad, 0), [filtradas]);

  return (
    <div className="space-y-4">
      {/* ── Filtros ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Desde</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 text-sm bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hasta</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 text-sm bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Artículo</Label>
          <Select value={articuloFiltro} onValueChange={(v) => setArticuloFiltro(v ?? "todos")}>
            <SelectTrigger className="h-9 text-sm bg-slate-50 border-slate-200 w-full">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los artículos</SelectItem>
              {articulos.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Horario</Label>
          <Select value={bloqueFiltro} onValueChange={(v) => setBloqueFiltro(v ?? "todos")}>
            <SelectTrigger className="h-9 text-sm bg-slate-50 border-slate-200 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BLOQUES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Tabla ── */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm text-slate-800 border-collapse">
                <thead>
                  <tr className="sticky top-0 bg-white z-10 shadow-sm">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">Fecha</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">Hora</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">Mesa</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">Artículo</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">Cant.</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-slate-400 text-sm">
                        Sin registros para los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    filtradas.map((l, i) => (
                      <tr
                        key={`${l.pedido_id}-${i}`}
                        className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-100/60 transition-colors"
                      >
                        <td className="px-5 py-3 text-slate-600 whitespace-nowrap text-sm">
                          {fmtFecha(l.fecha_obj)}
                        </td>
                        <td className="px-5 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">
                          {fmtHora(l.fecha_obj)}
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                            {l.mesa}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-800">{l.articulo}</td>
                        <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{l.cantidad}</td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-800 whitespace-nowrap tabular-nums">
                          {fmtL(l.subtotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Resumen ── */}
          <div className="flex items-center justify-between px-5 py-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-600">{filtradas.length}</span>{" "}
              línea{filtradas.length !== 1 ? "s" : ""} ·{" "}
              <span className="font-semibold text-slate-600">{totalUnidades}</span>{" "}
              unidades
            </p>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total vendido</p>
              <p className="text-base font-bold text-emerald-700">{fmtL(totalSubtotal)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
