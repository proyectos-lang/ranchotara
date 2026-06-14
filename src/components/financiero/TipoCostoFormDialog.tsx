"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TipoCosto } from "@/types/database";

interface Props {
  tipo: TipoCosto | null;
  onSave: (data: { nombre: string; descripcion: string; activo: boolean }) => Promise<void>;
  onClose: () => void;
}

export function TipoCostoFormDialog({ tipo, onSave, onClose }: Props) {
  const [nombre, setNombre]         = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo]         = useState(true);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);

  useEffect(() => {
    if (tipo) {
      setNombre(tipo.nombre);
      setDescripcion(tipo.descripcion ?? "");
      setActivo(tipo.activo);
    }
  }, [tipo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) { setFormError("El nombre es obligatorio."); return; }
    setSaving(true);
    setFormError(null);
    try {
      await onSave({ nombre: nombre.trim(), descripcion: descripcion.trim(), activo });
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!tipo} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Editar Tipo de Costo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              rows={2}
              className="text-sm resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="tc-activo" checked={activo} onCheckedChange={setActivo} />
            <Label htmlFor="tc-activo" className="text-sm cursor-pointer">
              {activo ? "Activo" : "Inactivo"}
            </Label>
          </div>
          {formError && <p className="text-xs text-destructive">{formError}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
