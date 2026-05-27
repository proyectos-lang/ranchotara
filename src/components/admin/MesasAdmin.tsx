"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Mesa } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const estadoColors: Record<Mesa["estado"], string> = {
  libre: "bg-secondary text-secondary-foreground",
  ocupada: "bg-primary text-primary-foreground",
  reservada: "bg-accent text-accent-foreground",
};

export function MesasAdmin() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numeroMesa, setNumeroMesa] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Mesa | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchMesas = useCallback(async () => {
    setError(null);
    const { data, error: err } = await supabase
      .from("mesas")
      .select("*")
      .order("id");
    if (err) {
      setError(`Error al cargar mesas: ${err.message}`);
    } else {
      setMesas(data ?? []);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMesas().finally(() => setLoading(false));
  }, [fetchMesas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = numeroMesa.trim();
    if (!nombre) {
      setFormError("El nombre/número de mesa es obligatorio.");
      return;
    }
    const duplicate = mesas.some(
      (m) => m.numero_mesa.toLowerCase() === nombre.toLowerCase()
    );
    if (duplicate) {
      setFormError("Ya existe una mesa con ese nombre.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const { error: err } = await supabase
      .from("mesas")
      .insert({ numero_mesa: nombre, estado: "libre" });
    if (err) {
      setFormError(err.message);
    } else {
      setNumeroMesa("");
      await fetchMesas();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    const { error: err } = await supabase
      .from("mesas")
      .delete()
      .eq("id", confirmDelete.id);
    if (!err) await fetchMesas();
    setDeletingId(null);
    setConfirmDelete(null);
  };

  if (loading) {
    return (
      <div className="p-8 space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-80" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="lg:col-span-2 h-52 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Configuración de Mesas</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Registra las mesas del restaurante. Los estados se gestionan desde el{" "}
            <a href="/panel" className="text-primary underline-offset-2 hover:underline font-medium">
              Panel Operativo
            </a>.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="text-lg">🪑</span>
                Nueva Mesa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="numero-mesa" className="text-xs font-medium">
                    Nombre / Número *
                  </Label>
                  <Input
                    id="numero-mesa"
                    value={numeroMesa}
                    onChange={(e) => setNumeroMesa(e.target.value)}
                    placeholder="Ej: Mesa 1, Barra 2, Terraza A"
                    className="bg-background border-input h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Puede ser un número, letra o nombre descriptivo.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Estado inicial:</span>{" "}
                    Las nuevas mesas se registran automáticamente como{" "}
                    <span className="font-semibold text-foreground">Libre</span>.
                  </p>
                </div>

                {formError && (
                  <p className="text-xs text-destructive font-medium">{formError}</p>
                )}
                <Button type="submit" size="sm" className="w-full" disabled={saving}>
                  {saving ? "Guardando..." : "Registrar Mesa"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Lista de mesas */}
          <Card className="lg:col-span-2 border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Mesas registradas
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({mesas.length})
                  </span>
                </CardTitle>
                {mesas.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-block w-2 h-2 rounded-full bg-secondary border border-border" />
                    {mesas.filter((m) => m.estado === "libre").length} libres
                    <span className="inline-block w-2 h-2 rounded-full bg-primary ml-1" />
                    {mesas.filter((m) => m.estado === "ocupada").length} ocupadas
                    <span className="inline-block w-2 h-2 rounded-full bg-accent ml-1" />
                    {mesas.filter((m) => m.estado === "reservada").length} reservadas
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {mesas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-3xl mb-3">🪑</p>
                  <p className="text-sm font-medium">No hay mesas registradas</p>
                  <p className="text-xs mt-1">
                    Agrega la primera mesa usando el formulario.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {mesas.map((mesa) => (
                    <div
                      key={mesa.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-base border border-border">
                          🪑
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {mesa.numero_mesa}
                          </p>
                          <Badge
                            className={`mt-0.5 text-xs border-0 h-4 px-1.5 capitalize ${estadoColors[mesa.estado]}`}
                          >
                            {mesa.estado}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete(mesa)}
                        disabled={deletingId === mesa.id}
                        className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        {deletingId === mesa.id ? "..." : "Eliminar"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Diálogo confirmación eliminar */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar mesa</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar{" "}
              <strong>&ldquo;{confirmDelete?.numero_mesa}&rdquo;</strong>?
              Se perderán los pedidos asociados si los hubiera.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)} disabled={!!deletingId}>
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={!!deletingId}>
              {deletingId ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
