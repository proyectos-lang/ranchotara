"use client";

import { useCallback, useEffect, useState } from "react";
import { format, subMonths, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/context/SessionContext";
import type { FilaEstadoResultados, MesFinanciero } from "@/types/database";

interface UseFinancieroParams {
  meses: number;  // 3 o 6
}

export function useFinanciero({ meses }: UseFinancieroParams) {
  const { session } = useSession();
  const [columnas, setColumnas] = useState<MesFinanciero[]>([]);
  const [categoriasGasto, setCategoriasGasto] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDatos = useCallback(async () => {
    if (!session) return;
    setCargando(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("estado_resultados_mensual")
      .select("anio, mes, tipo, categoria, total, id_empresa")
      .eq("id_empresa", session.id_empresa);

    if (err) {
      setError(err.message);
      setCargando(false);
      return;
    }

    const filas = (data ?? []) as FilaEstadoResultados[];

    const hoy = new Date();
    const rangoMeses: Array<{ anio: number; mes: number; label: string }> = [];
    for (let i = meses - 1; i >= 0; i--) {
      const d = startOfMonth(subMonths(hoy, i));
      rangoMeses.push({
        anio: d.getFullYear(),
        mes:  d.getMonth() + 1,
        label: format(d, "MMM yyyy", { locale: es }),
      });
    }

    const clave = (a: number, m: number) => `${a}-${String(m).padStart(2, "0")}`;
    const porMes = new Map<string, FilaEstadoResultados[]>();
    for (const f of filas) {
      const k = clave(f.anio, f.mes);
      if (!porMes.has(k)) porMes.set(k, []);
      porMes.get(k)!.push(f);
    }

    const catSet = new Set<string>();
    for (const rm of rangoMeses) {
      const filasMes = porMes.get(clave(rm.anio, rm.mes)) ?? [];
      for (const f of filasMes) {
        if (f.tipo === "gasto") catSet.add(f.categoria);
      }
    }
    const cats = Array.from(catSet).sort();
    setCategoriasGasto(cats);

    const cols: MesFinanciero[] = rangoMeses.map((rm) => {
      const filasMes = porMes.get(clave(rm.anio, rm.mes)) ?? [];
      const ingresos = filasMes
        .filter((f) => f.tipo === "ingreso")
        .reduce((s, f) => s + Number(f.total), 0);
      const gastosPorCategoria: Record<string, number> = {};
      for (const cat of cats) gastosPorCategoria[cat] = 0;
      for (const f of filasMes.filter((f) => f.tipo === "gasto")) {
        gastosPorCategoria[f.categoria] = Number(f.total);
      }
      const totalGastos = Object.values(gastosPorCategoria).reduce((s, v) => s + v, 0);
      return {
        anio: rm.anio,
        mes:  rm.mes,
        label: rm.label,
        ingresos,
        gastosPorCategoria,
        totalGastos,
        utilidad: ingresos - totalGastos,
      };
    });

    setColumnas(cols);
    setCargando(false);
  }, [session, meses]);

  useEffect(() => { fetchDatos(); }, [fetchDatos]);

  return { columnas, categoriasGasto, cargando, error, refetch: fetchDatos };
}
