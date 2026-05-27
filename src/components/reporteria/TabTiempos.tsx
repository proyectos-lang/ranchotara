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
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/* ── Tipos ──────────────────────────────────────────────────────── */
type RawDetalle = {
  id: number;
  estado_cocina: string;
  hora_inicio_preparacion: string | null;
  hora_entregado: string | null;
  productos: { nombre: string } | null;
  pedidos: {
    id: number;
    fecha_creacion: string | null;
    mesas: { numero_mesa: string } | null;
  } | null;
};

type TiempoLinea = {
  detalle_id: number;
  pedido_id: number;
  mesa: string;
  plato: string;
  hora_pedido: Date | null;
  inicio_cocina: Date | null;
  hora_entrega: Date | null;
  segundos: number | null;
};

/* ── Helpers ────────────────────────────────────────────────────── */
const hoy = () => new Date().toISOString().slice(0, 10);
const hace30 = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

const fmtHMS = (d: Date | null) =>
  d
    ? d.toLocaleTimeString("es-HN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

function calcSegundos(desde: Date | null, hasta: Date | null): number | null {
  if (!desde || !hasta) return null;
  const s = Math.round((hasta.getTime() - desde.getTime()) / 1000);
  return s < 0 ? null : s;
}

function fmtTiempo(seg: number | null): string {
  if (seg === null) return "—";
  const min = Math.floor(seg / 60);
  const s   = seg % 60;
  if (min === 0) return `${s}s`;
  return s === 0 ? `${min} min` : `${min} min ${s}s`;
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
export function TabTiempos() {
  const [lineas, setLineas]     = useState<TiempoLinea[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [dateTo, setDateTo]     = useState<Date | undefined>(() => new Date());
  const [mesaFiltro, setMesaFiltro]   = useState("todas");
  const [showFiltros, setShowFiltros] = useState(false);

  /* ── Fetch en dos pasos ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const fromStr = dateFrom ? format(dateFrom, "yyyy-MM-dd") : hace30();
    const toStr   = dateTo   ? format(dateTo,   "yyyy-MM-dd") : hoy();

    /* Paso 1: IDs de pedidos en el rango */
    const { data: pedidoIds, error: err1 } = await supabase
      .from("pedidos")
      .select("id")
      .gte("fecha_creacion", `${fromStr}T00:00:00`)
      .lte("fecha_creacion", `${toStr}T23:59:59`);

    if (err1) { setError(err1.message); setLoading(false); return; }

    const ids = (pedidoIds ?? []).map((p: { id: number }) => p.id);
    if (ids.length === 0) { setLineas([]); setLoading(false); return; }

    /* Paso 2: detalles entregados con campos de tiempo */
    const { data, error: err2 } = await supabase
      .from("detalles_pedido")
      .select(`
        id,
        estado_cocina,
        hora_inicio_preparacion,
        hora_entregado,
        productos ( nombre ),
        pedidos (
          id,
          fecha_creacion,
          mesas ( numero_mesa )
        )
      `)
      .in("pedido_id", ids)
      .eq("estado_cocina", "entregado")
      .order("hora_entregado", { ascending: false });

    if (err2) { setError(err2.message); setLoading(false); return; }

    const flat: TiempoLinea[] = ((data ?? []) as unknown as RawDetalle[]).map((d) => {
      const horaPedido   = d.pedidos?.fecha_creacion     ? new Date(d.pedidos.fecha_creacion)     : null;
      const inicioCocina = d.hora_inicio_preparacion     ? new Date(d.hora_inicio_preparacion)    : null;
      const horaEntrega  = d.hora_entregado              ? new Date(d.hora_entregado)             : null;
      return {
        detalle_id:   d.id,
        pedido_id:    d.pedidos?.id ?? 0,
        mesa:         d.pedidos?.mesas?.numero_mesa ?? "Barra",
        plato:        d.productos?.nombre ?? "—",
        hora_pedido:  horaPedido,
        inicio_cocina: inicioCocina,
        hora_entrega: horaEntrega,
        segundos:     calcSegundos(horaPedido, horaEntrega),
      };
    });

    setLineas(flat);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Mesas únicas para dropdown ── */
  const mesas = useMemo(() => {
    const set = new Set(lineas.map((l) => l.mesa));
    return Array.from(set).sort();
  }, [lineas]);

  /* ── Filtrado cliente ── */
  const filtradas = useMemo(() =>
    lineas.filter((l) => mesaFiltro === "todas" || l.mesa === mesaFiltro),
  [lineas, mesaFiltro]);

  /* ── KPIs ── */
  const { promedio, alertas } = useMemo(() => {
    const conTiempo = filtradas.filter((l) => l.segundos !== null);
    const sum = conTiempo.reduce((s, l) => s + (l.segundos ?? 0), 0);
    return {
      promedio: conTiempo.length ? Math.round(sum / conTiempo.length) : null,
      alertas:  conTiempo.filter((l) => (l.segundos ?? 0) > 25 * 60).length,
    };
  }, [filtradas]);

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
          {mesaFiltro !== "todas" && (
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
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mesa</Label>
              <Select value={mesaFiltro} onValueChange={(v) => setMesaFiltro(v ?? "todas")}>
                <SelectTrigger className="h-11 text-sm bg-slate-50 border-slate-200 w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las mesas</SelectItem>
                  {mesas.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m === "Barra" ? "Barra" : `Mesa ${m}`}
                    </SelectItem>
                  ))}
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
      <div className="hidden md:grid grid-cols-3 gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <DateField label="Desde" value={dateFrom} onChange={setDateFrom} />
        <DateField label="Hasta" value={dateTo}   onChange={setDateTo}   />

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mesa</Label>
          <Select value={mesaFiltro} onValueChange={(v) => setMesaFiltro(v ?? "todas")}>
            <SelectTrigger className="h-9 text-sm bg-slate-50 border-slate-200 w-full">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las mesas</SelectItem>
              {mesas.map((m) => (
                <SelectItem key={m} value={m}>
                  {m === "Barra" ? "Barra" : `Mesa ${m}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── KPIs ── */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Platos entregados</p>
            <p className="text-xl font-bold text-slate-800">{filtradas.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Tiempo promedio</p>
            <p className="text-xl font-bold text-emerald-700">{fmtTiempo(promedio)}</p>
          </div>
          <div className={[
            "rounded-xl border shadow-sm px-4 py-3 text-center",
            alertas > 0 ? "bg-rose-50 border-rose-200" : "bg-white border-slate-200",
          ].join(" ")}>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Alertas &gt; 25 min</p>
            <p className={["text-xl font-bold", alertas > 0 ? "text-rose-600" : "text-slate-800"].join(" ")}>
              {alertas}
            </p>
          </div>
        </div>
      )}

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
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          <div className="max-h-[550px] overflow-y-auto">
            <table className="w-full text-sm text-slate-800 border-collapse">
              <thead>
                <tr className="sticky top-0 bg-white z-10 shadow-sm border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">ID Pedido</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mesa</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Plato / Bebida</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Hora Pedido</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Inicio Cocina</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Hora Entrega</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tiempo Total</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400 text-sm">
                      <p className="text-3xl mb-3">🔍</p>
                      No se encontraron registros para los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  filtradas.map((l, i) => {
                    const retrasado = (l.segundos ?? 0) > 25 * 60;
                    return (
                      <tr
                        key={`${l.detalle_id}-${i}`}
                        className={[
                          "border-b border-slate-100 transition-colors",
                          retrasado
                            ? "bg-rose-50/70 hover:bg-rose-100/60"
                            : "even:bg-slate-50/50 hover:bg-slate-100/60",
                        ].join(" ")}
                      >
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                          #{l.pedido_id}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                            {l.mesa === "Barra" ? "Barra" : `Mesa ${l.mesa}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{l.plato}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                          {fmtHMS(l.hora_pedido)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                          {fmtHMS(l.inicio_cocina)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                          {fmtHMS(l.hora_entrega)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <span className={[
                              "text-sm font-semibold tabular-nums",
                              retrasado ? "text-rose-600" : "text-slate-700",
                            ].join(" ")}>
                              {fmtTiempo(l.segundos)}
                            </span>
                            {retrasado && (
                              <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px] px-1.5 h-4">
                                Retrasado
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Leyenda inferior */}
          {filtradas.some((l) => (l.segundos ?? 0) > 25 * 60) && (
            <div className="px-4 py-2 border-t border-slate-100 bg-rose-50/40 flex items-center gap-2">
              <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px] px-1.5 h-4">
                Retrasado
              </Badge>
              <p className="text-xs text-rose-600">
                Filas marcadas superaron los 25 minutos desde la apertura del pedido hasta la entrega
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
