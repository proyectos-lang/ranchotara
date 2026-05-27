"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
  { value: "todos",    label: "Todo el día" },
  { value: "manana",   label: "Mañana (06:00–11:59)" },
  { value: "mediodia", label: "Mediodía (12:00–14:59)" },
  { value: "tarde",    label: "Tarde (15:00–17:59)" },
  { value: "noche",    label: "Noche (18:00–23:59)" },
];

/* ── Helpers ────────────────────────────────────────────────────── */
const hoy = () => new Date().toISOString().slice(0, 10);
const hace30 = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

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

/* ── Date picker reutilizable ───────────────────────────────────── */
function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </Label>
      <Popover>
        <PopoverTrigger
          render={<button type="button" />}
          className="inline-flex items-center justify-start gap-2 h-9 w-full px-3 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
          <span className={value ? "text-slate-800" : "text-slate-400"}>
            {value ? format(value, "dd/MM/yyyy") : "Seleccionar fecha"}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={value} onSelect={onChange} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ── Componente principal ───────────────────────────────────────── */
export function TabVentas() {
  const [lineas, setLineas]     = useState<VentaLinea[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [dateTo, setDateTo]     = useState<Date | undefined>(() => new Date());
  const [articuloFiltro, setArticuloFiltro] = useState("todos");
  const [bloqueFiltro, setBloqueFiltro]     = useState("todos");
  const [showFiltros, setShowFiltros]       = useState(false);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const fromStr = dateFrom ? format(dateFrom, "yyyy-MM-dd") : hace30();
    const toStr   = dateTo   ? format(dateTo,   "yyyy-MM-dd") : hoy();

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
      .gte("fecha_creacion", `${fromStr}T00:00:00`)
      .lte("fecha_creacion", `${toStr}T23:59:59`)
      .order("fecha_creacion", { ascending: false });

    if (err) { setError(err.message); setLoading(false); return; }

    const flat: VentaLinea[] = [];
    for (const p of (data ?? []) as unknown as RawPedido[]) {
      const fechaObj = p.fecha_creacion ? new Date(p.fecha_creacion) : null;
      for (const d of p.detalles_pedido) {
        flat.push({
          pedido_id: p.id,
          fecha_obj: fechaObj,
          mesa:      p.mesas?.numero_mesa ?? "Barra",
          articulo:  d.productos?.nombre ?? "—",
          cantidad:  d.cantidad,
          subtotal:  d.subtotal,
        });
      }
    }
    setLineas(flat);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Artículos únicos para dropdown ── */
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
      {/* ── Filtros: botón en móvil / grid en desktop ── */}
      <div className="flex items-center justify-between md:hidden">
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{filtradas.length}</span> registros
        </p>
        <button
          onClick={() => setShowFiltros(true)}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
          Filtros
          {(articuloFiltro !== "todos" || bloqueFiltro !== "todos") && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>
      </div>

      {/* Drawer de filtros (móvil) */}
      <Sheet open={showFiltros} onOpenChange={setShowFiltros}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
            <SheetTitle className="text-base font-bold text-slate-800">Filtros</SheetTitle>
          </SheetHeader>
          <div className="p-5 space-y-4">
            <DateField label="Desde" value={dateFrom} onChange={setDateFrom} />
            <DateField label="Hasta" value={dateTo}   onChange={setDateTo}   />
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Artículo</Label>
              <Select value={articuloFiltro} onValueChange={(v) => setArticuloFiltro(v ?? "todos")}>
                <SelectTrigger className="h-11 text-sm bg-slate-50 border-slate-200 w-full">
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
                <SelectTrigger className="h-11 text-sm bg-slate-50 border-slate-200 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOQUES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={() => setShowFiltros(false)}
              className="w-full min-h-[48px] rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors"
            >
              Aplicar filtros
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Grid de filtros (desktop) */}
      <div className="hidden md:grid grid-cols-4 gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <DateField label="Desde" value={dateFrom} onChange={setDateFrom} />
        <DateField label="Hasta" value={dateTo}   onChange={setDateTo}   />

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
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <div className="max-h-[550px] overflow-y-auto">
              <table className="w-full text-sm text-slate-800 border-collapse">
                <thead>
                  <tr className="sticky top-0 bg-white z-10 shadow-sm border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Hora</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mesa</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Artículo</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cant.</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-slate-400 text-sm">
                        <p className="text-3xl mb-3">🔍</p>
                        No se encontraron registros para los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    filtradas.map((l, i) => (
                      <tr
                        key={`${l.pedido_id}-${i}`}
                        className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-100/60 transition-colors"
                      >
                        <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                          {fmtFecha(l.fecha_obj)}
                        </td>
                        <td className="px-5 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">
                          {fmtHora(l.fecha_obj)}
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                            {l.mesa === "Barra" ? "Barra" : `Mesa ${l.mesa}`}
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

          {/* ── Barra de resumen ── */}
          <div className="flex items-center justify-between px-5 py-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-600">{filtradas.length}</span>{" "}
              línea{filtradas.length !== 1 ? "s" : ""} ·{" "}
              <span className="font-semibold text-slate-600">{totalUnidades}</span>{" "}
              unidades vendidas
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
