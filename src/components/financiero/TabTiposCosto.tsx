"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TipoCostoFormDialog } from "./TipoCostoFormDialog";
import type { TipoCosto } from "@/types/database";

interface Props {
  tipos: TipoCosto[];
  onCrear: (data: { nombre: string; descripcion: string }) => Promise<void>;
  onEditar: (id: number, data: { nombre: string; descripcion: string; activo: boolean }) => Promise<void>;
  onEliminar: (id: number) => Promise<void>;
}

export function TabTiposCosto({ tipos, onCrear, onEditar, onEliminar }: Props) {
  const [nombre, setNombre]         = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);
  const [editando, setEditando]     = useState<TipoCosto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TipoCosto | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) { setFormError("El nombre es obligatorio."); return; }
    setSaving(true);
    setFormError(null);
    try {
      await onCrear({ nombre: nombre.trim(), descripcion: descripcion.trim() });
      setNombre("");
      setDescripcion("");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await onEliminar(confirmDelete.id);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario nuevo tipo */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="text-lg">🏷️</span>
              Nuevo Tipo de Costo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCrear} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="tc-nombre" className="text-xs font-medium">Nombre *</Label>
                <Input
                  id="tc-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Nómina"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tc-desc" className="text-xs font-medium">
                  Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="tc-desc"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Describe este tipo de costo..."
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
              {formError && <p className="text-xs text-destructive">{formError}</p>}
              <Button type="submit" className="w-full" size="sm" disabled={saving}>
                {saving ? "Guardando..." : "Agregar Tipo"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lista de tipos */}
        <Card className="lg:col-span-2 border-border bg-card shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">
              Tipos existentes
              <span className="ml-2 text-xs font-normal text-muted-foreground">({tipos.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tipos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-3xl mb-3">📭</p>
                <p className="text-sm font-medium">No hay tipos de costo aún</p>
                <p className="text-xs mt-1">Crea el primero usando el formulario.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {tipos.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {t.nombre.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground text-sm truncate">{t.nombre}</p>
                          <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            t.activo
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {t.activo ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                        {t.descripcion && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.descripcion}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditando(t)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete(t)}
                        disabled={deletingId === t.id}
                        className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {deletingId === t.id ? "..." : "Eliminar"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog edición */}
      <TipoCostoFormDialog
        tipo={editando}
        onSave={async (data) => { await onEditar(editando!.id, data); }}
        onClose={() => setEditando(null)}
      />

      {/* Dialog confirmación eliminación */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar tipo de costo</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar <strong>&ldquo;{confirmDelete?.nombre}&rdquo;</strong>?
              Los gastos ya registrados con este tipo no se eliminarán, pero quedarán sin categoría activa.
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
    </>
  );
}
