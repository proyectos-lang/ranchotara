"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, SlidersHorizontal, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fmtLps as fmtL } from "@/lib/format";
import { useSession } from "@/context/SessionContext";
import { useGastos } from "@/hooks/useGastos";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateField } from "@/components/ui/date-field";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GastoFormDialog } from "./GastoFormDialog";
import type { Gasto, TipoCosto } from "@/types/database";

interface Props {
  tiposCosto: TipoCosto[];
}

export function TabGastos({ tiposCosto }: Props) {
  const { session } = useSession();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [dateTo, setDateTo]         = useState<Date | undefined>(() => new Date());
  const [tipoFiltro, setTipoFiltro] = useState<number | "todos">("todos");
  const [showFiltros, setShowFiltros] = useState(false);

  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editando, setEditando]         = useState<Gasto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; concepto: string } | null>(null);
  const [deletingId, setDeletingId]     = useState<number | null>(null);

  const desde = dateFrom ? format(dateFrom, "yyyy-MM-dd") : format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
  const hasta = dateTo   ? format(dateTo,   "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");

  const { gastos, cargando, error, refetch } = useGastos({ desde, hasta, tipoCostoId: tipoFiltro });

  const totalPeriodo = useMemo(() => gastos.reduce((s, g) => s + g.monto, 0), [gastos]);

  const handleGuardar = async (data: {
    tipo_costo_id: number; concepto: string; monto: number; fecha: string; notas: string;
  }) => {
    if (editando) {
      const { error: err } = await supabase.from("gastos").update(data).eq("id", editando.id);
      if (err) throw new Error(err.message);
    } else {
      const { error: err } = await supabase.from("gastos").insert({ ...data, id_empresa: session!.id_empresa });
      if (err) throw new Error(err.message);
    }
    await refetch();
  };

  const handleEliminar = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await supabase.from("gastos").delete().eq("id", confirmDelete.id);
      await refetch();
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const tipoLabel = (tc: TipoCosto["id"]) =>
    tiposCosto.find((t) => t.id === tc)?.nombre ?? "—";

  const filtroActivo = tipoFiltro !== "todos";

  return (
    <div className="space-y-4">
      {/* ── Encabezado móvil + botón filtros ── */}
      <div className="flex items-center justify-between md:hidden">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{gastos.length}</span> registros
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFiltros(true)}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            Filtros
            {filtroActivo && <span className="w-2 h-2 rounded-full bg-primary" />}
          </button>
          <button
            onClick={() => { setEditando(null); setDialogOpen(true); }}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
        </div>
      </div>

      {/* Sheet filtros móvil */}
      <Sheet open={showFiltros} onOpenChange={setShowFiltros}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
            <SheetTitle className="text-base font-bold">Filtros</SheetTitle>
          </SheetHeader>
          <div className="p-5 space-y-4">
            <DateField label="Desde" value={dateFrom} onChange={setDateFrom} />
            <DateField label="Hasta" value={dateTo}   onChange={setDateTo}   />
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo de Costo</Label>
              <Select value={String(tipoFiltro)} onValueChange={(v) => setTipoFiltro(v === "todos" ? "todos" : Number(v))}>
                <SelectTrigger className="h-11 text-sm w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  {tiposCosto.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <button onClick={() => setShowFiltros(false)} className="w-full min-h-[48px] rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-colors">
              Aplicar filtros
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Grid filtros desktop */}
      <div className="hidden md:flex items-end gap-3 p-4 bg-card rounded-xl border border-border shadow-sm">
        <div className="grid grid-cols-3 gap-3 flex-1">
          <DateField label="Desde" value={dateFrom} onChange={setDateFrom} />
          <DateField label="Hasta" value={dateTo}   onChange={setDateTo}   />
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo de Costo</Label>
            <Select value={String(tipoFiltro)} onValueChange={(v) => setTipoFiltro(v === "todos" ? "todos" : Number(v))}>
              <SelectTrigger className="h-9 text-sm w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {tiposCosto.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={() => { setEditando(null); setDialogOpen(true); }} className="shrink-0 gap-2 h-9">
          <Plus className="w-4 h-4" /> Nuevo Gasto
        </Button>
      </div>

      {/* ── Tabla ── */}
      {cargando ? (
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm text-foreground border-collapse">
                <thead>
                  <tr className="sticky top-0 bg-card z-10 shadow-sm border-b border-border">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Concepto</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Notas</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Monto</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-muted-foreground text-sm">
                        <p className="text-3xl mb-3">🔍</p>
                        No hay gastos para el período seleccionado
                      </td>
                    </tr>
                  ) : (
                    gastos.map((g) => (
                      <tr key={g.id} className="border-b border-border even:bg-muted/30 hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums text-xs">
                          {format(new Date(g.fecha + "T12:00:00"), "dd/MM/yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium whitespace-nowrap">
                            {tipoLabel(g.tipo_costo_id)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{g.concepto}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell max-w-[160px] truncate">
                          {g.notas ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap tabular-nums">
                          {fmtL(g.monto)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => { setEditando(g as unknown as Gasto); setDialogOpen(true); }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ id: g.id, concepto: g.concepto })}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen período */}
          <div className="flex items-center justify-between px-4 py-3 bg-card rounded-xl border border-border shadow-sm">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{gastos.length}</span>{" "}
              gasto{gastos.length !== 1 ? "s" : ""} en el período
            </p>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total gastos</p>
              <p className="text-base font-bold text-foreground">{fmtL(totalPeriodo)}</p>
            </div>
          </div>
        </>
      )}

      {/* Dialog nuevo/editar gasto */}
      <GastoFormDialog
        open={dialogOpen}
        gasto={editando}
        tiposCosto={tiposCosto}
        onSave={handleGuardar}
        onClose={() => { setDialogOpen(false); setEditando(null); }}
      />

      {/* Dialog confirmación eliminación */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar gasto</DialogTitle>
            <DialogDescription>
              ¿Eliminar el gasto <strong>&ldquo;{confirmDelete?.concepto}&rdquo;</strong>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)} disabled={!!deletingId}>
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleEliminar} disabled={!!deletingId}>
              {deletingId ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
