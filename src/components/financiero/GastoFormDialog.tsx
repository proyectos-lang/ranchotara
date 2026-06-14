"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { Gasto, TipoCosto } from "@/types/database";

interface Props {
  open: boolean;
  gasto: Gasto | null;
  tiposCosto: TipoCosto[];
  onSave: (data: {
    tipo_costo_id: number;
    concepto: string;
    monto: number;
    fecha: string;
    notas: string;
  }) => Promise<void>;
  onClose: () => void;
}

export function GastoFormDialog({ open, gasto, tiposCosto, onSave, onClose }: Props) {
  const [tipoCostoId, setTipoCostoId] = useState<string>("");
  const [concepto, setConcepto]       = useState("");
  const [monto, setMonto]             = useState("");
  const [fecha, setFecha]             = useState<Date | undefined>(() => new Date());
  const [notas, setNotas]             = useState("");
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);

  useEffect(() => {
    if (gasto) {
      setTipoCostoId(String(gasto.tipo_costo_id));
      setConcepto(gasto.concepto);
      setMonto(String(gasto.monto));
      setFecha(new Date(gasto.fecha + "T12:00:00"));
      setNotas(gasto.notas ?? "");
    } else {
      setTipoCostoId("");
      setConcepto("");
      setMonto("");
      setFecha(new Date());
      setNotas("");
    }
    setFormError(null);
  }, [gasto, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoCostoId) { setFormError("Selecciona un tipo de costo."); return; }
    if (!concepto.trim()) { setFormError("El concepto es obligatorio."); return; }
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) { setFormError("El monto debe ser mayor a cero."); return; }
    if (!fecha) { setFormError("Selecciona una fecha."); return; }

    setSaving(true);
    setFormError(null);
    try {
      await onSave({
        tipo_costo_id: Number(tipoCostoId),
        concepto: concepto.trim(),
        monto: parseFloat(montoNum.toFixed(2)),
        fecha: format(fecha, "yyyy-MM-dd"),
        notas: notas.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const tiposActivos = tiposCosto.filter((t) => t.activo);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {gasto ? "Editar Gasto" : "Nuevo Gasto"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de costo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tipo de Costo *</Label>
            <Select value={tipoCostoId} onValueChange={(v) => setTipoCostoId(v ?? "")}>
              <SelectTrigger className="h-9 text-sm w-full">
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {tiposActivos.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Concepto */}
          <div className="space-y-1.5">
            <Label htmlFor="g-concepto" className="text-xs font-medium">Concepto *</Label>
            <Input
              id="g-concepto"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej. Pago nómina enero"
              className="h-9 text-sm"
            />
          </div>

          {/* Monto y Fecha en fila */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-monto" className="text-xs font-medium">Monto (L.) *</Label>
              <Input
                id="g-monto"
                type="number"
                min="0.01"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Fecha *</Label>
              <Popover>
                <PopoverTrigger
                  render={<button type="button" />}
                  className="inline-flex items-center gap-2 h-9 w-full px-3 text-sm rounded-lg border border-input bg-background text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className={fecha ? "text-foreground" : "text-muted-foreground"}>
                    {fecha ? format(fecha, "dd/MM/yy") : "Fecha"}
                  </span>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={fecha} onSelect={setFecha} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="g-notas" className="text-xs font-medium">
              Notas <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="g-notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="text-sm resize-none"
              placeholder="Observaciones adicionales..."
            />
          </div>

          {formError && <p className="text-xs text-destructive">{formError}</p>}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Guardando..." : gasto ? "Actualizar" : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
