"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { UsuarioFormDialog } from "./UsuarioFormDialog";
import type { Usuario, PermisoUsuario } from "@/types/database";

type UsuarioConPermisos = Usuario & { permisos: PermisoUsuario[] };

export function UsuariosManager() {
  const { session } = useSession();
  const [usuarios, setUsuarios] = useState<UsuarioConPermisos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<UsuarioConPermisos | null>(null);

  const fetchUsuarios = useCallback(async () => {
    if (!session) return;
    setError(null);
    const { data, error: err } = await supabase
      .from("usuarios")
      .select("*, permisos_usuario(*)")
      .eq("id_empresa", session.id_empresa)
      .order("id");
    if (err) { setError(err.message); return; }
    setUsuarios((data ?? []) as unknown as UsuarioConPermisos[]);
  }, [session]);

  useEffect(() => {
    setLoading(true);
    fetchUsuarios().finally(() => setLoading(false));
  }, [fetchUsuarios]);

  const handleNuevo = () => {
    setEditando(null);
    setDialogOpen(true);
  };

  const handleEditar = (u: UsuarioConPermisos) => {
    setEditando(u);
    setDialogOpen(true);
  };

  const handleToggleActivo = async (u: UsuarioConPermisos) => {
    if (u.id === session?.id_usuario) return;
    await supabase.from("usuarios").update({ activo: !u.activo }).eq("id", u.id);
    await fetchUsuarios();
  };

  if (loading) {
    return (
      <div className="p-8 space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-96" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Usuarios</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gestiona los usuarios de <strong>{session?.nombre_empresa}</strong> y sus permisos de acceso.
          </p>
        </div>
        <Button onClick={handleNuevo} className="shrink-0 gap-2">
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Usuario</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Módulos</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rol</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                  <p className="text-3xl mb-3">👥</p>
                  No hay usuarios registrados
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary uppercase">
                          {u.nombre.charAt(0)}
                        </span>
                      </div>
                      {u.nombre}
                      {u.id === session?.id_usuario && (
                        <Badge className="text-[10px] h-4 px-1.5 bg-muted text-muted-foreground border-border">Tú</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">@{u.username}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {u.es_admin ? (
                      <span className="text-xs text-muted-foreground italic">Todos los módulos</span>
                    ) : u.permisos.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Sin permisos</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{u.permisos.length} módulo{u.permisos.length !== 1 ? "s" : ""}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.es_admin
                      ? <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Admin</Badge>
                      : <Badge className="bg-muted text-muted-foreground border-border text-xs">Usuario</Badge>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActivo(u)}
                      disabled={u.id === session?.id_usuario}
                      className="disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {u.activo
                        ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs cursor-pointer hover:bg-green-200 transition-colors">Activo</Badge>
                        : <Badge className="bg-red-100 text-red-700 border-red-200 text-xs cursor-pointer hover:bg-red-200 transition-colors">Inactivo</Badge>
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEditar(u)} className="text-xs h-7 px-3">
                      Editar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <UsuarioFormDialog
        open={dialogOpen}
        usuario={editando}
        onClose={() => { setDialogOpen(false); setEditando(null); }}
        onSaved={fetchUsuarios}
      />
    </div>
  );
}
