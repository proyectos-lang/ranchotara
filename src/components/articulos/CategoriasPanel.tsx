"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Categoria } from "@/types/database";

interface CategoriasPanelProps {
  categorias: Categoria[];
  onCreateCategoria: (data: { nombre: string; descripcion: string }) => Promise<void>;
  onDeleteCategoria: (id: number) => Promise<void>;
}

export function CategoriasPanel({
  categorias,
  onCreateCategoria,
  onDeleteCategoria,
}: CategoriasPanelProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Categoria | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setFormError("El nombre de la categoría es obligatorio.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await onCreateCategoria({ nombre: nombre.trim(), descripcion: descripcion.trim() });
      setNombre("");
      setDescripcion("");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error al guardar la categoría.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await onDeleteCategoria(confirmDelete.id);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario nueva categoría */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="text-lg">📂</span>
              Nueva Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cat-nombre" className="text-xs font-medium">
                  Nombre *
                </Label>
                <Input
                  id="cat-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Platos Fuertes"
                  className="bg-background border-input h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-desc" className="text-xs font-medium">
                  Descripción
                  <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                </Label>
                <Textarea
                  id="cat-desc"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Describe la categoría..."
                  rows={3}
                  className="bg-background border-input text-sm resize-none"
                />
              </div>
              {formError && (
                <p className="text-xs text-destructive font-medium">{formError}</p>
              )}
              <Button
                type="submit"
                className="w-full"
                size="sm"
                disabled={saving}
              >
                {saving ? "Guardando..." : "Agregar Categoría"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lista de categorías */}
        <Card className="lg:col-span-2 border-border bg-card shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">
              Categorías existentes
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({categorias.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categorias.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-3xl mb-3">📭</p>
                <p className="text-sm font-medium">No hay categorías aún</p>
                <p className="text-xs mt-1">
                  Crea la primera categoría usando el formulario.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {categorias.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {cat.nombre.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {cat.nombre}
                        </p>
                        {cat.descripcion && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {cat.descripcion}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(cat)}
                      disabled={deletingId === cat.id}
                      className="shrink-0 ml-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      {deletingId === cat.id ? "..." : "Eliminar"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar categoría</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar{" "}
              <strong>&ldquo;{confirmDelete?.nombre}&rdquo;</strong>?
              Esta acción no se puede deshacer. Los productos asociados quedarán sin categoría.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(null)}
              disabled={!!deletingId}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={!!deletingId}
            >
              {deletingId ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
