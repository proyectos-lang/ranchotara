"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, LayoutGrid, ChefHat, CreditCard, BarChart2,
  Utensils, Settings, ChevronLeft, ChevronRight, GlassWater, ClipboardList,
  TrendingUp, Users, LogOut,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSession } from "@/context/SessionContext";
import type { ModuloSlug } from "@/types/session";

/* ── Secciones de navegación ──────────────────────────────────── */
type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  modulo?: ModuloSlug;
};

const sections: { label: string; items: NavItem[] }[] = [
  {
    label: "Operativo",
    items: [
      { href: "/",               label: "Inicio",       icon: Home,        exact: true },
      { href: "/panel",          label: "Panel Mesas",  icon: LayoutGrid,  modulo: "panel" },
      { href: "/pedidos/barra",  label: "Barra",        icon: GlassWater,  modulo: "pedidos" },
      { href: "/cocina",         label: "Cocina",       icon: ChefHat,     modulo: "cocina" },
      { href: "/caja",           label: "Caja",         icon: CreditCard,  modulo: "caja" },
      { href: "/analitica",      label: "Analítica",    icon: BarChart2,   modulo: "analitica" },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/admin/articulos",  label: "Artículos",  icon: Utensils,      modulo: "admin.articulos" },
      { href: "/admin/mesas",      label: "Mesas",      icon: Settings,      modulo: "admin.mesas" },
      { href: "/admin/reporteria", label: "Reportería", icon: ClipboardList, modulo: "admin.reporteria" },
      { href: "/admin/financiero", label: "Financiero", icon: TrendingUp,    modulo: "admin.financiero" },
      { href: "/admin/usuarios",   label: "Usuarios",   icon: Users,         modulo: "admin.usuarios" },
    ],
  },
];

/* ── Componente ────────────────────────────────────────────────── */
export function AppSidebar() {
  const pathname = usePathname();
  const { session, logout } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("rt-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem("rt-sidebar-collapsed", String(!prev));
      return !prev;
    });
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const tieneAcceso = (modulo?: ModuloSlug) => {
    if (!modulo) return true;
    if (!session) return false;
    return session.es_admin || session.permisos.includes(modulo);
  };

  return (
    <aside
      className={cn(
        "h-screen flex-shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out overflow-hidden",
        "hidden md:flex",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* ── Logo + toggle ── */}
      <div className={cn(
        "flex items-center border-b border-sidebar-border shrink-0",
        collapsed ? "justify-center py-4 px-0" : "justify-between px-4 py-4"
      )}>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">🌿</span>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-none text-sidebar-primary truncate">
                {session?.nombre_empresa ?? "Rancho Alba"}
              </p>
              <p className="text-[10px] text-sidebar-foreground/40 mt-0.5">POS System</p>
            </div>
          </Link>
        )}
        <button
          onClick={toggle}
          className={cn(
            "flex items-center justify-center rounded-lg w-8 h-8 transition-colors hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground shrink-0",
            collapsed && "mx-auto"
          )}
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Navegación ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        {sections.map((section) => {
          const visibles = section.items.filter((item) => tieneAcceso(item.modulo));
          if (visibles.length === 0) return null;
          return (
            <div key={section.label} className="mb-2">
              {!collapsed && (
                <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35">
                  {section.label}
                </p>
              )}
              {collapsed && (
                <div className="mx-3 my-1 h-px bg-sidebar-border" />
              )}

              {visibles.map((item) => {
                const active = isActive(item.href, item.exact);
                const Icon = item.icon;

                const linkEl = (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg mx-2 transition-colors",
                      collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
                      active
                        ? "bg-emerald-500 text-white"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && (
                      <span className="text-sm font-medium truncate">{item.label}</span>
                    )}
                    {!collapsed && active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
                    )}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger render={<div />}>
                        {linkEl}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs font-medium">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return linkEl;
              })}
            </div>
          );
        })}
      </nav>

      {/* ── Footer de usuario ── */}
      <div className={cn(
        "shrink-0 border-t border-sidebar-border",
        collapsed ? "py-3 flex flex-col items-center gap-2" : "px-3 py-3"
      )}>
        {!collapsed && session && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-emerald-400 uppercase">
                {session.nombre_usuario.charAt(0)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">
                {session.nombre_usuario}
              </p>
              <p className="text-[10px] text-sidebar-foreground/40 truncate">
                @{session.username}
              </p>
            </div>
          </div>
        )}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger render={<div />}>
              <button
                onClick={logout}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Cerrar sesión</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-400/10 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="font-medium">Cerrar sesión</span>
          </button>
        )}
      </div>
    </aside>
  );
}
