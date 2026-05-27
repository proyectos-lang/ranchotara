"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { UtensilsCrossed, Utensils, CalendarClock, Clock, Settings, GlassWater } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Mesa, EstadoMesa } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* ── Mapa de pedidos abiertos (mesa_id → created_at) ─────────── */
type PedidoAbierto = { mesa_id: number; fecha_creacion: string };

function minutosDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

function fmtMin(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/* ── Componente principal ─────────────────────────────────────── */
export function MapaMesas() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [pedidosAbiertos, setPedidosAbiertos] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [updatingEstado, setUpdatingEstado] = useState(false);
  const [zonaActiva, setZonaActiva] = useState<string>("Todos");
  const [tick, setTick] = useState(0);

  /* ── Tick cada minuto para refrescar tiempos ─── */
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  /* ── Fetch mesas + pedidos abiertos ─── */
  const fetchData = useCallback(async () => {
    const [mesasRes, pedidosRes] = await Promise.all([
      supabase.from("mesas").select("*").order("id"),
      supabase
        .from("pedidos")
        .select("mesa_id, fecha_creacion")
        .in("estado", ["pendiente", "en_preparacion"]),
    ]);

    if (mesasRes.error) { setError(mesasRes.error.message); return; }

    setMesas(mesasRes.data ?? []);

    const map = new Map<number, string>();
    for (const p of (pedidosRes.data ?? []) as PedidoAbierto[]) {
      if (!map.has(p.mesa_id)) map.set(p.mesa_id, p.fecha_creacion);
    }
    setPedidosAbiertos(map);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  /* ── Realtime ─── */
  useEffect(() => {
    const ch = supabase
      .channel("panel-mesas-realtime")
      .on("postgres_changes", { event: "*", schema: "ranchotara", table: "mesas" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "ranchotara", table: "pedidos" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData]);

  /* ── Cambiar estado ─── */
  const handleCambiarEstado = async (nuevoEstado: EstadoMesa) => {
    if (!selectedMesa || selectedMesa.estado === nuevoEstado) return;
    setUpdatingEstado(true);
    const { error: err } = await supabase
      .from("mesas")
      .update({ estado: nuevoEstado })
      .eq("id", selectedMesa.id);
    if (!err) {
      const actualizada = { ...selectedMesa, estado: nuevoEstado };
      setSelectedMesa(actualizada);
      setMesas((prev) => prev.map((m) => (m.id === selectedMesa.id ? actualizada : m)));
    }
    setUpdatingEstado(false);
  };

  /* ── Zonas únicas ─── */
  const zonas = useMemo(() => {
    const set = new Set<string>();
    for (const m of mesas) if (m.zona) set.add(m.zona);
    return ["Todos", ...Array.from(set).sort()];
  }, [mesas]);

  const mesasFiltradas = useMemo(
    () => zonaActiva === "Todos" ? mesas : mesas.filter((m) => m.zona === zonaActiva),
    [mesas, zonaActiva]
  );

  /* ── Stats ─── */
  const stats = {
    libres: mesas.filter((m) => m.estado === "libre").length,
    ocupadas: mesas.filter((m) => m.estado === "ocupada").length,
    reservadas: mesas.filter((m) => m.estado === "reservada").length,
  };

  /* ── Loading ─── */
  if (loading) {
    return (
      <div className="p-6 space-y-5">
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      </div>
    );
  }

  if (mesas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Utensils className="w-7 h-7 text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Sin mesas configuradas</h2>
        <p className="text-sm text-slate-500 mb-5">Ve a configuración para agregar las mesas.</p>
        <Link href="/admin/mesas">
          <Button size="sm" className="gap-2">
            <Settings className="w-4 h-4" /> Configurar Mesas
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="p-6">
        {/* Stats */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <StatPill label="Libres" value={stats.libres} color="bg-slate-100 text-slate-700" dot="bg-slate-400" />
          <StatPill label="Ocupadas" value={stats.ocupadas} color="bg-emerald-50 text-emerald-700" dot="bg-emerald-500" />
          <StatPill label="Reservadas" value={stats.reservadas} color="bg-amber-50 text-amber-700" dot="bg-amber-400" />
          <Link
            href="/pedidos/barra"
            className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
          >
            <GlassWater className="w-4 h-4" />
            Pedido en Barra
          </Link>
        </div>

        {/* Tabs de zona */}
        {zonas.length > 1 && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {zonas.map((zona) => (
              <button
                key={zona}
                onClick={() => setZonaActiva(zona)}
                className={cn(
                  "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                  zonaActiva === zona
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-600"
                )}
              >
                {zona}
              </button>
            ))}
          </div>
        )}

        {/* Grid de mesas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
          {mesasFiltradas.map((mesa) => {
            const ocupada = mesa.estado === "ocupada";
            const reservada = mesa.estado === "reservada";
            const abierto = pedidosAbiertos.get(mesa.id);
            const minutos = abierto ? minutosDesde(abierto) : null;
            const urgente = minutos !== null && minutos > 45;

            return (
              <button
                key={mesa.id}
                onClick={() => setSelectedMesa(mesa)}
                className={cn(
                  "group relative flex flex-col rounded-2xl overflow-hidden border transition-all duration-150 hover:scale-[1.03] hover:shadow-lg active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                  ocupada
                    ? "bg-emerald-500 border-emerald-400 shadow-sm shadow-emerald-200"
                    : reservada
                    ? "bg-amber-50 border-amber-200"
                    : "bg-white border-slate-200"
                )}
              >
                {/* Indicador de tiempo (solo ocupadas) */}
                {ocupada && minutos !== null && (
                  <div className={cn(
                    "absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                    urgente
                      ? "bg-red-500 text-white"
                      : "bg-emerald-600/80 text-white"
                  )}>
                    <Clock className="w-2.5 h-2.5" />
                    {fmtMin(minutos)}
                  </div>
                )}

                {/* Ícono central */}
                <div className="flex-1 flex items-center justify-center py-5">
                  {ocupada ? (
                    <UtensilsCrossed className="w-8 h-8 text-white/90" />
                  ) : reservada ? (
                    <CalendarClock className="w-8 h-8 text-amber-500" />
                  ) : (
                    <Utensils className="w-8 h-8 text-slate-300" />
                  )}
                </div>

                {/* Franja inferior con número de mesa */}
                <div className={cn(
                  "px-2 py-1.5 text-center",
                  ocupada
                    ? "bg-emerald-700/60"
                    : reservada
                    ? "bg-amber-400/30"
                    : "bg-slate-800"
                )}>
                  <p className={cn(
                    "text-xs font-bold truncate",
                    ocupada ? "text-white" : reservada ? "text-amber-800" : "text-white"
                  )}>
                    {mesa.numero_mesa}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dialog de mesa seleccionada */}
      <Dialog open={!!selectedMesa} onOpenChange={(open) => { if (!open) setSelectedMesa(null); }}>
        {selectedMesa && (() => {
          const ocupada = selectedMesa.estado === "ocupada";
          const reservada = selectedMesa.estado === "reservada";
          const abierto = pedidosAbiertos.get(selectedMesa.id);
          const minutos = abierto ? minutosDesde(abierto) : null;
          return (
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center border-2",
                    ocupada ? "bg-emerald-50 border-emerald-200" : reservada ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
                  )}>
                    {ocupada
                      ? <UtensilsCrossed className="w-5 h-5 text-emerald-600" />
                      : reservada
                      ? <CalendarClock className="w-5 h-5 text-amber-500" />
                      : <Utensils className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div>
                    <DialogTitle className="text-base">{selectedMesa.numero_mesa}</DialogTitle>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        ocupada ? "bg-emerald-100 text-emerald-700" : reservada ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {ocupada ? "Ocupada" : reservada ? "Reservada" : "Libre"}
                      </span>
                      {minutos !== null && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{fmtMin(minutos)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              {/* Cambio de estado */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cambiar estado</p>
                <div className="flex gap-2">
                  {(["libre", "ocupada", "reservada"] as EstadoMesa[]).map((estado) => {
                    const isActive = selectedMesa.estado === estado;
                    return (
                      <button
                        key={estado}
                        onClick={() => handleCambiarEstado(estado)}
                        disabled={updatingEstado || isActive}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-semibold border transition-all capitalize",
                          isActive
                            ? estado === "ocupada"
                              ? "bg-emerald-500 text-white border-emerald-500"
                              : estado === "reservada"
                              ? "bg-amber-400 text-white border-amber-400"
                              : "bg-slate-800 text-white border-slate-800"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                        )}
                      >
                        {estado}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Acción principal */}
              {selectedMesa.estado === "libre" ? (
                <Link href={`/pedidos/${selectedMesa.id}`} onClick={() => setSelectedMesa(null)}>
                  <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold gap-2">
                    <UtensilsCrossed className="w-4 h-4" /> Tomar Pedido
                  </Button>
                </Link>
              ) : (
                <Button className="w-full" disabled>
                  {ocupada ? "Mesa en servicio — cobrar en Caja" : "Mesa reservada"}
                </Button>
              )}

              <DialogFooter>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedMesa(null)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          );
        })()}
      </Dialog>
    </>
  );
}

/* ── StatPill ─────────────────────────────────────────────────── */
function StatPill({ label, value, color, dot }: { label: string; value: number; color: string; dot: string }) {
  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium", color)}>
      <span className={cn("w-2 h-2 rounded-full shrink-0", dot)} />
      {value} {label}
    </div>
  );
}
