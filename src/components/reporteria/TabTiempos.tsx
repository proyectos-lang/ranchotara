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
type RawDetalle = {
  id: number;
  hora_listo: string | null;
  cantidad: number;
  estado_cocina: string;
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
  hora_lista: Date | null;
  minutos: number | null;
};

/* ── Helpers ────────────────────────────────────────────────────── */
const hoy = () => new Date().toISOString().slice(0, 10);
const hace30 = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

const fmtHora = (d: Date | null) =>
  d ? d.toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";

function calcMinutos(desde: Date | null, hasta: Date | null): number | null {
  if (!desde || !hasta) return null;
  return Math.round((hasta.getTime() - desde.getTime()) / 60_000);
}

function fmtTiempo(min: number | null): string {
  if (min === null) return "—";
  if (min < 1) return "< 1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/* ── Componente ─────────────────────────────────────────────────── */
export function TabTiempos() {
  const [lineas, setLineas]     = useState<TiempoLinea[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(hace30);
  const [dateTo, setDateTo]     = useState(hoy);
  const [mesaFiltro, setMesaFiltro] = useState("todas");

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    /* Paso 1: obtener IDs de pedidos en el rango */
    const { data: pedidoIds, error: err1 } = await supabase
      .from("pedidos")
      .select("id")
      .gte("fecha_creacion", `${dateFrom}T00:00:00`)
      .lte("fecha_creacion", `${dateTo}T23:59:59`);

    if (err1) { setError(err1.message); setLoading(false); return; }

    const ids = (pedidoIds ?? []).map((p: { id: number }) => p.id);
    if (ids.length === 0) { setLineas([]); setLoading(false); return; }

    /* Paso 2: detalles entregados con hora_listo, anidando pedido y mesa */
    const { data, error: err2 } = await supabase
      .from("detalles_pedido")
      .select(`
        id,
        hora_listo,
        cantidad,
        estado_cocina,
        productos ( nombre ),
        pedidos (
          id,
          fecha_creacion,
          mesas ( numero_mesa )
        )
      `)
      .in("pedido_id", ids)
      .eq("estado_cocina", "entregado")
      .not("hora_listo", "is", null)
      .order("hora_listo", { ascending: false });

    if (err2) { setError(err2.message); setLoading(false); return; }

    const flat: TiempoLinea[] = ((data ?? []) as unknown as RawDetalle[]).map((d) => {
      const horaPedido = d.pedidos?.fecha_creacion ? new Date(d.pedidos.fecha_creacion) : null;
      const horaLista  = d.hora_listo ? new Date(d.hora_listo) : null;
      return {
        detalle_id: d.id,
        pedido_id:  d.pedidos?.id ?? 0,
        mesa:       d.pedidos?.mesas?.numero_mesa ?? "Barra",
        plato:      d.productos?.nombre ?? "—",
        hora_pedido: horaPedido,
        hora_lista:  horaLista,
        minutos:    calcMinutos(horaPedido, horaLista),
      };
    });

    setLineas(flat);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Mesas únicas ── */
  const mesas = useMemo(() => {
    const set = new Set(lineas.map((l) => l.mesa));
    return Array.from(set).sort();
  }, [lineas]);

  /* ── Filtrado cliente ── */
  const filtradas = useMemo(() =>
    lineas.filter((l) => mesaFiltro === "todas" || l.mesa === mesaFiltro),
  [lineas, mesaFiltro]);

  /* ── Estadísticas ── */
  const { promedio, maxMinutos, alertas } = useMemo(() => {
    const conTiempo = filtradas.filter((l) => l.minutos !== null);
    const sum = conTiempo.reduce((s, l) => s + (l.minutos ?? 0), 0);
    const max = conTiempo.reduce((m, l) => Math.max(m, l.minutos ?? 0), 0);
    return {
      promedio:   conTiempo.length ? Math.round(sum / conTiempo.length) : null,
      maxMinutos: conTiempo.length ? max : null,
      alertas:    conTiempo.filter((l) => (l.minutos ?? 0) > 25).length,
    };
  }, [filtradas]);

  return (
    <div className="space-y-4">
      {/* ── Filtros ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
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
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mesa</Label>
          <Select value={mesaFiltro} onValueChange={(v) => setMesaFiltro(v ?? "todas")}>
            <SelectTrigger className="h-9 text-sm bg-slate-50 border-slate-200 w-full">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las mesas</SelectItem>
              {mesas.map((m) => <SelectItem key={m} value={m}>{m === "Barra" ? "Barra" : `Mesa ${m}`}</SelectItem>)}
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
            alertas > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200",
          ].join(" ")}>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Alertas &gt; 25 min</p>
            <p className={["text-xl font-bold", alertas > 0 ? "text-red-600" : "text-slate-800"].join(" ")}>
              {alertas}
            </p>
          </div>
        </div>
      )}

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
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          <div className="max-h-[560px] overflow-y-auto">
            <table className="w-full text-sm text-slate-800 border-collapse">
              <thead>
                <tr className="sticky top-0 bg-white z-10 shadow-sm">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">#</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">Mesa</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">Plato</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">Hora Pedido</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">Hora Lista</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">Tiempo Total</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400 text-sm">
                      Sin registros de platos entregados en el período seleccionado
                    </td>
                  </tr>
                ) : (
                  filtradas.map((l, i) => {
                    const alerta = (l.minutos ?? 0) > 25;
                    return (
                      <tr
                        key={`${l.detalle_id}-${i}`}
                        className={[
                          "border-b border-slate-100 transition-colors",
                          alerta
                            ? "bg-red-50 hover:bg-red-100/60"
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
                          {fmtHora(l.hora_pedido)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                          {fmtHora(l.hora_lista)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className={[
                            "text-sm font-semibold tabular-nums",
                            alerta ? "text-red-600" : "text-slate-700",
                          ].join(" ")}>
                            {fmtTiempo(l.minutos)}
                          </span>
                          {alerta && (
                            <span className="ml-1.5 text-xs text-red-500">⚠</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Leyenda */}
          {filtradas.some((l) => (l.minutos ?? 0) > 25) && (
            <div className="px-4 py-2 border-t border-slate-100 bg-red-50/50 flex items-center gap-2">
              <span className="text-xs text-red-500">⚠</span>
              <p className="text-xs text-red-600">Filas resaltadas superaron los 25 minutos de preparación</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
