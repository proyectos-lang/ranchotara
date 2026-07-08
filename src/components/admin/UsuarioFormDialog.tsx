"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { MODULOS, MODULO_LABELS } from "@/types/session";
import type { ModuloSlug } from "@/types/session";
import type { Usuario, PermisoUsuario } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type UsuarioConPermisos = Usuario & { permisos: PermisoUsuario[] };

interface Props {
  open: boolean;
  usuario: UsuarioConPermisos | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function UsuarioFormDialog({ open, usuario, onClose, onSaved }: Props) {
  const { session } = useSession();
  const esNuevo = !usuario;

  const [nombre, setNombre]       = useState("");
  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");
  const [esAdmin, setEsAdmin]     = useState(false);
  const [activo, setActivo]       = useState(true);
  const [permisos, setPermisos]   = useState<Set<ModuloSlug>>(new Set());
  const [saving, setSaving]       = useState(false);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNombre(usuario?.nombre ?? "");
      setUsername(usuario?.username ?? "");
      setPassword("");
      setEsAdmin(usuario?.es_admin ?? false);
      setActivo(usuario?.activo ?? true);
      setPermisos(
        new Set((usuario?.permisos ?? []).map((p) => p.modulo as ModuloSlug))
      );
      setErrorMsg(null);
    }
  }, [open, usuario]);

  const togglePermiso = (modulo: ModuloSlug) => {
    setPermisos((prev) => {
      const next = new Set(prev);
      if (next.has(modulo)) next.delete(modulo);
      else next.add(modulo);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!nombre.trim() || !username.trim()) {
      setErrorMsg("Nombre y usuario son obligatorios.");
      return;
    }
    if (esNuevo && !password.trim()) {
      setErrorMsg("La contraseña es obligatoria para nuevos usuarios.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const body = {
        id_empresa: session.id_empresa,
        nombre: nombre.trim(),
        username: username.trim().toLowerCase(),
        ...(password.trim() ? { password: password.trim() } : {}),
        es_admin: esAdmin,
        activo,
        permisos: esAdmin ? [] : Array.from(permisos),
        ...(usuario ? { id: usuario.id } : {}),
      };

      const url = "/api/auth/register";
      const method = esNuevo ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");

      await onSaved();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{esNuevo ? "Nuevo Usuario" : "Editar Usuario"}</DialogTitle>
          <DialogDescription>
            {esNuevo
              ? "Completa los datos del nuevo usuario."
              : `Editando a ${usuario?.nombre}`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="u-nombre" className="text-xs font-medium">Nombre completo *</Label>
            <Input
              id="u-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: María García"
              className="h-9 text-sm"
            />
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="u-username" className="text-xs font-medium">Nombre de usuario *</Label>
            <Input
              id="u-username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="Ej: mgarcia"
              className="h-9 text-sm font-mono"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="u-password" className="text-xs font-medium">
              Contraseña {!esNuevo && "(dejar vacío para no cambiar)"}
              {esNuevo && " *"}
            </Label>
            <Input
              id="u-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={esNuevo ? "Mínimo 6 caracteres" : "Nueva contraseña (opcional)"}
              className="h-9 text-sm"
            />
          </div>

          {/* Switches */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Administrador</Label>
              <Switch checked={esAdmin} onCheckedChange={setEsAdmin} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Activo</Label>
              <Switch checked={activo} onCheckedChange={setActivo} />
            </div>
          </div>

          {/* Permisos por módulo (solo si no es admin) */}
          {!esAdmin && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Módulos con acceso
              </p>
              <div className="grid grid-cols-1 gap-1 border border-border rounded-lg overflow-hidden">
                {MODULOS.map((modulo) => (
                  <label
                    key={modulo}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 cursor-pointer border-b border-border last:border-0 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={permisos.has(modulo)}
                      onChange={() => togglePermiso(modulo)}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-sm text-foreground">{MODULO_LABELS[modulo]}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {esAdmin && (
            <p className="text-xs text-muted-foreground p-3 rounded-lg bg-primary/5 border border-primary/10">
              Los administradores tienen acceso automático a todos los módulos.
            </p>
          )}

          {errorMsg && (
            <p className="text-xs text-destructive font-medium">{errorMsg}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Guardando..." : esNuevo ? "Crear Usuario" : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
