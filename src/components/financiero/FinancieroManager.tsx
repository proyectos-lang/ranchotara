"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TabTiposCosto } from "./TabTiposCosto";
import { TabGastos } from "./TabGastos";
import { TabEstadoResultados } from "./TabEstadoResultados";
import type { TipoCosto } from "@/types/database";

export function FinancieroManager() {
  const [tipos, setTipos]       = useState<TipoCosto[]>([]);
  const [cargando, setCargando] = useState(true);

  const fetchTipos = useCallback(async () => {
    const { data } = await supabase
      .from("tipos_costo")
      .select("*")
      .order("nombre");
    setTipos((data ?? []) as TipoCosto[]);
    setCargando(false);
  }, []);

  useEffect(() => { fetchTipos(); }, [fetchTipos]);

  const handleCrearTipo = async (data: { nombre: string; descripcion: string }) => {
    const { error } = await supabase.from("tipos_costo").insert({ ...data, activo: true });
    if (error) throw new Error(error.message);
    await fetchTipos();
  };

  const handleEditarTipo = async (
    id: number,
    data: { nombre: string; descripcion: string; activo: boolean }
  ) => {
    const { error } = await supabase.from("tipos_costo").update(data).eq("id", id);
    if (error) throw new Error(error.message);
    await fetchTipos();
  };

  const handleEliminarTipo = async (id: number) => {
    const { error } = await supabase.from("tipos_costo").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await fetchTipos();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Módulo Financiero</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestión de costos, registro de gastos y estado de resultados
        </p>
      </div>

      <Tabs defaultValue="gastos" className="gap-4">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 h-auto gap-0">
          <TabsTrigger
            value="tipos"
            className="rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-active:border-primary data-active:text-foreground data-active:shadow-none bg-transparent"
          >
            Tipos de Costo
          </TabsTrigger>
          <TabsTrigger
            value="gastos"
            className="rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-active:border-primary data-active:text-foreground data-active:shadow-none bg-transparent"
          >
            Gastos
          </TabsTrigger>
          <TabsTrigger
            value="resultados"
            className="rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-active:border-primary data-active:text-foreground data-active:shadow-none bg-transparent"
          >
            Estado de Resultados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tipos" className="mt-0">
          {cargando ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
            </div>
          ) : (
            <TabTiposCosto
              tipos={tipos}
              onCrear={handleCrearTipo}
              onEditar={handleEditarTipo}
              onEliminar={handleEliminarTipo}
            />
          )}
        </TabsContent>

        <TabsContent value="gastos" className="mt-0">
          {cargando ? (
            <div className="space-y-4">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          ) : (
            <TabGastos tiposCosto={tipos} />
          )}
        </TabsContent>

        <TabsContent value="resultados" className="mt-0">
          <TabEstadoResultados />
        </TabsContent>
      </Tabs>
    </div>
  );
}
