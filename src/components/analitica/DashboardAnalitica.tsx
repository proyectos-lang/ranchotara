"use client";

import { useAnalitica } from "@/hooks/useAnalitica";
import { SeccionHoy } from "./SeccionHoy";
import { SeccionHistorica } from "./SeccionHistorica";
import { Skeleton } from "@/components/ui/skeleton";

/* ── Skeletons de carga ────────────────────────────────────────── */
function SkeletonKPIs() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

/* ── Componente principal ─────────────────────────────────────── */
export function DashboardAnalitica() {
  const { kpisHoy, platosHoy, ventasUltimos30, top5Historico, trafico, cargando, error } =
    useAnalitica();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Error */}
      {error && (
        <div className="mb-6 p-3 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive text-sm">
          {error}
        </div>
      )}

      {cargando ? (
        /* ── Estado de carga ── */
        <div className="space-y-10">
          <section>
            <div className="flex items-center gap-3 mb-5">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <SkeletonKPIs />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card px-4 py-3">
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-6 w-28" />
                </div>
              ))}
            </div>
            <SkeletonChart />
          </section>
          <section>
            <div className="flex items-center gap-3 mb-5">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card px-5 py-4">
                  <Skeleton className="h-3 w-24 mb-2" />
                  <Skeleton className="h-7 w-36" />
                </div>
              ))}
            </div>
            <SkeletonChart />
          </section>
        </div>
      ) : (
        /* ── Contenido cargado ── */
        <div className="space-y-12">
          <SeccionHoy kpis={kpisHoy} platos={platosHoy} />
          <div className="border-t border-border" />
          <SeccionHistorica ventas={ventasUltimos30} top5={top5Historico} trafico={trafico} />
        </div>
      )}
    </div>
  );
}
