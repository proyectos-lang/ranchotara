"use client";

import { useEffect, useRef, useState } from "react";
import { MODULOS, MODULO_LABELS } from "@/types/session";
import type { ModuloSlug } from "@/types/session";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const MASTER_KEY = "Parchita2026colorbag";

type Empresa = { id: number; nombre: string; activo: boolean; created_at: string };
type UsuarioRow = {
  id: number;
  id_empresa: number;
  username: string;
  nombre: string;
  es_admin: boolean;
  activo: boolean;
  empresas: { nombre: string } | null;
};

function masterFetch(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", "x-master-key": MASTER_KEY, ...(options.headers ?? {}) },
  });
}

/* ── Tab Empresas ──────────────────────────────────────────────── */
function TabEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    const res = await masterFetch("/api/master/empresas");
    const data = await res.json();
    setEmpresas(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    setError(null);
    const res = await masterFetch("/api/master/empresas", {
      method: "POST",
      body: JSON.stringify({ nombre }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    setNombre("");
    await cargar();
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Formulario nueva empresa */}
      <form onSubmit={handleCrear} className="flex gap-2">
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de la nueva empresa"
          className="h-9 text-sm flex-1"
        />
        <Button type="submit" size="sm" disabled={saving || !nombre.trim()} className="shrink-0">
          {saving ? "..." : "Crear empresa"}
        </Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : empresas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No hay empresas registradas.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase">ID</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Nombre</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Creada</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">#{e.id}</td>
                  <td className="px-3 py-2.5 font-medium text-foreground">{e.nombre}</td>
                  <td className="px-3 py-2.5">
                    {e.activo
                      ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Activa</Badge>
                      : <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Inactiva</Badge>
                    }
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                    {new Date(e.created_at).toLocaleDateString("es-HN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Tab Usuarios ──────────────────────────────────────────────── */
function TabUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [idEmpresa, setIdEmpresa] = useState<number | "">("");
  const [esAdmin, setEsAdmin] = useState(false);
  const [permisos, setPermisos] = useState<Set<ModuloSlug>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    const [usRes, empRes] = await Promise.all([
      masterFetch("/api/master/usuarios"),
      masterFetch("/api/master/empresas"),
    ]);
    const usData = await usRes.json();
    const empData = await empRes.json();
    setUsuarios(Array.isArray(usData) ? usData : []);
    setEmpresas(Array.isArray(empData) ? empData : []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const togglePermiso = (modulo: ModuloSlug) => {
    setPermisos((prev) => {
      const next = new Set(prev);
      if (next.has(modulo)) next.delete(modulo);
      else next.add(modulo);
      return next;
    });
  };

  const resetForm = () => {
    setNombre(""); setUsername(""); setPassword("");
    setIdEmpresa(""); setEsAdmin(false); setPermisos(new Set());
    setError(null);
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !username.trim() || !password.trim() || idEmpresa === "") {
      setError("Todos los campos son requeridos."); return;
    }
    setSaving(true);
    setError(null);
    const res = await masterFetch("/api/master/usuarios", {
      method: "POST",
      body: JSON.stringify({
        id_empresa: idEmpresa,
        nombre, username, password,
        es_admin: esAdmin,
        permisos: esAdmin ? [] : Array.from(permisos),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    resetForm();
    setShowForm(false);
    await cargar();
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""} en total
        </p>
        <Button size="sm" variant={showForm ? "outline" : "default"} onClick={() => { setShowForm(!showForm); resetForm(); }}>
          {showForm ? "Cancelar" : "+ Nuevo usuario"}
        </Button>
      </div>

      {/* Formulario nuevo usuario */}
      {showForm && (
        <form onSubmit={handleCrear} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Nombre completo *</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="María García" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Usuario *</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="mgarcia" className="h-9 text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Contraseña *</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Empresa *</Label>
              <select
                value={idEmpresa}
                onChange={(e) => setIdEmpresa(e.target.value === "" ? "" : Number(e.target.value))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Seleccionar empresa...</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 py-1">
            <Label className="text-xs font-medium">Administrador</Label>
            <Switch checked={esAdmin} onCheckedChange={setEsAdmin} />
          </div>

          {!esAdmin && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Módulos con acceso</Label>
              <div className="grid grid-cols-2 gap-1">
                {MODULOS.map((modulo) => (
                  <label key={modulo} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors">
                    <input type="checkbox" checked={permisos.has(modulo)} onChange={() => togglePermiso(modulo)} className="w-3.5 h-3.5 accent-primary" />
                    <span className="text-xs text-foreground">{MODULO_LABELS[modulo]}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Creando..." : "Crear usuario"}</Button>
          </div>
        </form>
      )}

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : usuarios.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No hay usuarios registrados.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="border-b border-border bg-card">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Nombre</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase">@usuario</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Empresa</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Rol</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2 font-medium text-foreground text-xs">{u.nombre}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">@{u.username}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">
                    {u.empresas?.nombre ?? `#${u.id_empresa}`}
                  </td>
                  <td className="px-3 py-2">
                    {u.es_admin
                      ? <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Admin</Badge>
                      : <Badge className="bg-muted text-muted-foreground border-border text-[10px]">Usuario</Badge>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Componente principal ──────────────────────────────────────── */
type Tab = "empresas" | "usuarios";

export function MasterAccessDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"locked" | "unlocked">("locked");
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("empresas");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setStep("locked");
      setPwInput("");
      setPwError(false);
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwInput === MASTER_KEY) {
      setStep("unlocked");
      setPwError(false);
    } else {
      setPwError(true);
      setPwInput("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-muted-foreground/50 hover:text-muted-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/40"
      >
        Acceso master
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className={step === "unlocked" ? "max-w-2xl max-h-[90vh] overflow-y-auto" : "max-w-sm"}>
          {step === "locked" ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">Acceso master</DialogTitle>
                <DialogDescription className="text-xs">
                  Introduce la contraseña de desarrollador para continuar.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUnlock} className="space-y-3 mt-1">
                <Input
                  ref={inputRef}
                  type="password"
                  value={pwInput}
                  onChange={(e) => { setPwInput(e.target.value); setPwError(false); }}
                  placeholder="Contraseña"
                  className={`h-9 text-sm ${pwError ? "border-destructive ring-destructive" : ""}`}
                  autoFocus
                />
                {pwError && <p className="text-xs text-destructive">Contraseña incorrecta.</p>}
                <Button type="submit" size="sm" className="w-full">Acceder</Button>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-base flex items-center gap-2">
                  <span className="text-lg">🔑</span> Panel Master — Desarrollador
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Gestión global de empresas y usuarios del sistema.
                </DialogDescription>
              </DialogHeader>

              {/* Tabs */}
              <div className="flex gap-0 border-b border-border mt-1">
                {(["empresas", "usuarios"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                      activeTab === tab
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="mt-2">
                {activeTab === "empresas" ? <TabEmpresas /> : <TabUsuarios />}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
