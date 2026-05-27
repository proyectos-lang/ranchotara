"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabVentas } from "./TabVentas";
import { TabTiempos } from "./TabTiempos";

export function ReporteriaManager() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Reportería Avanzada</h1>
        <p className="text-sm text-slate-500 mt-0.5">Análisis de ventas y eficiencia de cocina</p>
      </div>

      <Tabs defaultValue="ventas" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-xl h-auto">
          <TabsTrigger
            value="ventas"
            className="rounded-lg px-5 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-500"
          >
            Detalle de Ventas
          </TabsTrigger>
          <TabsTrigger
            value="tiempos"
            className="rounded-lg px-5 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-500"
          >
            Tiempos de Cocina
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
