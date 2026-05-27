"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/* ── Tipos raw de Supabase ─────────────────────────────────────── */
type PedidoPagado = {
  id: number;
  total: number;
  fecha_pago: string;
  metodo_pago: string | null;
};

type DetalleConProducto = {
  pedido_id: number;
  cantidad: number;
  subtotal: number;
  productos: { nombre: string } | null;
};

/* ── Tipos derivados (consumidos por los componentes) ──────────── */
export type KpisHoy = {
  ingresos: number;
  pedidos: number;
  porMetodo: { efectivo: number; tarjeta: number; transferencia: number };
};

export type PlatoConteo = { nombre: string; cantidad: number };

export type VentaDia = { fecha: string; total: number };

export type InsightTrafico = {
  horaPico: string;
  diaPico: string;
};

export type AnaliticaData = {
  kpisHoy: KpisHoy;
  platosHoy: PlatoConteo[];
  ventasUltimos30: VentaDia[];
  top5Historico: PlatoConteo[];
  trafico: InsightTrafico;
  cargando: boolean;
  error: string | null;
};

/* ── Utilidades ────────────────────────────────────────────────── */
const DIAS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function fechaHoy(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ── Hook principal ────────────────────────────────────────────── */
export function useAnalitica(): AnaliticaData {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kpisHoy, setKpisHoy] = useState<KpisHoy>({
    ingresos: 0, pedidos: 0,
    porMetodo: { efectivo: 0, tarjeta: 0, transferencia: 0 },
  });
  const [platosHoy, setPlatosHoy] = useState<PlatoConteo[]>([]);
  const [ventasUltimos30, setVentasUltimos30] = useState<VentaDia[]>([]);
  const [top5Historico, setTop5Historico] = useState<PlatoConteo[]>([]);
  const [trafico, setTrafico] = useState<InsightTrafico>({ horaPico: "—", diaPico: "—" });

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);

    /* ── 1. Pedidos pagados ── */
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const { data: pedidosRaw, error: errPedidos } = await supabase
      .from("pedidos")
      .select("id, total, fecha_pago, metodo_pago")
      .eq("estado", "pagado")
      .not("fecha_pago", "is", null)
      .gte("fecha_pago", hace30Dias.toISOString())
      .order("fecha_pago", { ascending: true });

    if (errPedidos) { setError(errPedidos.message); setCargando(false); return; }
    const pedidos = (pedidosRaw ?? []) as PedidoPagado[];

    /* También necesitamos histórico completo para top5 y tráfico */
    const { data: pedidosTodos, error: errTodos } = await supabase
      .from("pedidos")
      .select("id, fecha_pago, metodo_pago")
      .eq("estado", "pagado")
      .not("fecha_pago", "is", null);

    if (errTodos) { setError(errTodos.message); setCargando(false); return; }
    const todosLosPedidos = (pedidosTodos ?? []) as PedidoPagado[];

    /* ── 2. Detalles de pedidos pagados (últimos 30 + todos para top5) ── */
    const idsTodos = todosLosPedidos.map((p) => p.id);

    const { data: detallesRaw, error: errDetalles } = idsTodos.length > 0
      ? await supabase
          .from("detalles_pedido")
          .select("pedido_id, cantidad, subtotal, productos ( nombre )")
          .in("pedido_id", idsTodos)
      : { data: [], error: null };

    if (errDetalles) { setError(errDetalles.message); setCargando(false); return; }
    const detalles = (detallesRaw ?? []) as unknown as DetalleConProducto[];

    /* ── 3. Procesamiento ── */
    const hoy = fechaHoy();

    /* — KPIs hoy — */
    const pedidosHoy = pedidos.filter((p) => p.fecha_pago.slice(0, 10) === hoy);
    const ingresosHoy = pedidosHoy.reduce((s, p) => s + (p.total ?? 0), 0);
    const porMetodo = { efectivo: 0, tarjeta: 0, transferencia: 0 };
    for (const p of pedidosHoy) {
      const m = p.metodo_pago as keyof typeof porMetodo | null;
      if (m && m in porMetodo) porMetodo[m] += p.total ?? 0;
    }
    setKpisHoy({ ingresos: ingresosHoy, pedidos: pedidosHoy.length, porMetodo });

    /* — Platos vendidos hoy — */
    const idsHoy = new Set(pedidosHoy.map((p) => p.id));
    const detallesHoy = detalles.filter((d) => idsHoy.has(d.pedido_id));
    const mapaPlatosHoy = new Map<string, number>();
    for (const d of detallesHoy) {
      const nombre = d.productos?.nombre ?? "Producto";
      mapaPlatosHoy.set(nombre, (mapaPlatosHoy.get(nombre) ?? 0) + d.cantidad);
    }
    setPlatosHoy(
      [...mapaPlatosHoy.entries()]
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
    );

    /* — Ventas por día (últimos 30) — */
    const mapaVentas = new Map<string, number>();
    for (const p of pedidos) {
      const fecha = p.fecha_pago.slice(0, 10);
      mapaVentas.set(fecha, (mapaVentas.get(fecha) ?? 0) + (p.total ?? 0));
    }
    /* Rellenar todos los días del rango aunque no haya venta */
    const ventasDias: VentaDia[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const f = d.toISOString().slice(0, 10);
      ventasDias.push({ fecha: f, total: mapaVentas.get(f) ?? 0 });
    }
    setVentasUltimos30(ventasDias);

    /* — Top 5 platos histórico — */
    const mapaHistorico = new Map<string, number>();
    for (const d of detalles) {
      const nombre = d.productos?.nombre ?? "Producto";
      mapaHistorico.set(nombre, (mapaHistorico.get(nombre) ?? 0) + d.cantidad);
    }
    setTop5Historico(
      [...mapaHistorico.entries()]
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5)
    );

    /* — Hora pico — */
    const mapaHoras = new Map<number, number>();
    for (const p of todosLosPedidos) {
      const hora = new Date(p.fecha_pago).getHours();
      mapaHoras.set(hora, (mapaHoras.get(hora) ?? 0) + 1);
    }
    let horaPico = "—";
    if (mapaHoras.size > 0) {
      const maxHora = [...mapaHoras.entries()].sort((a, b) => b[1] - a[1])[0][0];
      horaPico = `${String(maxHora).padStart(2, "0")}:00 – ${String(maxHora + 1).padStart(2, "0")}:00`;
    }

    /* — Día pico — */
    const mapaDias = new Map<number, number>();
    for (const p of todosLosPedidos) {
      const dia = new Date(p.fecha_pago).getDay();
      mapaDias.set(dia, (mapaDias.get(dia) ?? 0) + 1);
    }
    let diaPico = "—";
    if (mapaDias.size > 0) {
      const maxDia = [...mapaDias.entries()].sort((a, b) => b[1] - a[1])[0][0];
      diaPico = DIAS_ES[maxDia];
    }

    setTrafico({ horaPico, diaPico });
    setCargando(false);
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  return { kpisHoy, platosHoy, ventasUltimos30, top5Historico, trafico, cargando, error };
}
