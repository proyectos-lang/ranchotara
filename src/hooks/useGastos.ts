"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { GastoConTipo } from "@/types/database";

interface UseGastosParams {
  desde: string;
  hasta: string;
  tipoCostoId: number | "todos";
}

export function useGastos({ desde, hasta, tipoCostoId }: UseGastosParams) {
  const [gastos, setGastos] = useState<GastoConTipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGastos = useCallback(async () => {
    setCargando(true);
    setError(null);

    let query = supabase
      .from("gastos")
      .select("*, tipos_costo(id, nombre)")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: false });

    if (tipoCostoId !== "todos") {
      query = query.eq("tipo_costo_id", tipoCostoId);
    }

    const { data, error: err } = await query;

    if (err) {
      setError(err.message);
    } else {
      setGastos((data ?? []) as unknown as GastoConTipo[]);
    }
    setCargando(false);
  }, [desde, hasta, tipoCostoId]);

  useEffect(() => { fetchGastos(); }, [fetchGastos]);

  return { gastos, cargando, error, refetch: fetchGastos };
}
