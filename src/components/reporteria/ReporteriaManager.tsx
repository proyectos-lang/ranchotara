"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabVentas } from "./TabVentas";
import { TabTiempos } from "./TabTiempos";

export function ReporteriaManager() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Reportería Avanzada</h1>
        <p className="text-sm text-slate-500 mt-0.5">Análisis de ventas y eficiencia de cocina</p>
      </div>

      <Tabs defaultValue="ventas" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 h-auto w-auto">
          <TabsTrigger
            value="ventas"
            className="rounded-lg px-5 py-2 text-sm font-medium data-active:bg-white data-active:text-slate-800 data-active:shadow-sm text-slate-500"
          >
            Resumen de Ventas
          </TabsTrigger>
          <TabsTrigger
            value="tiempos"
            className="rounded-lg px-5 py-2 text-sm font-medium data-active:bg-white data-active:text-slate-800 data-active:shadow-sm text-slate-500"
          >
            Control de Tiempos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ventas" className="mt-0">
          <TabVentas />
        </TabsContent>

        <TabsContent value="tiempos" className="mt-0">
          <TabTiempos />
        </TabsContent>
      </Tabs>
    </div>
  );
}
