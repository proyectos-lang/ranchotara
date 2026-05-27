"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, LayoutGrid, ChefHat, CreditCard, BarChart2,
  Utensils, Settings, ChevronLeft, ChevronRight, GlassWater, ClipboardList,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/* ── Secciones de navegación ──────────────────────────────────── */
const sections = [
  {
    label: "Operativo",
    items: [
      { href: "/",          label: "Inicio",       icon: Home,       exact: true },
      { href: "/panel",          label: "Panel Mesas",  icon: LayoutGrid  },
      { href: "/pedidos/barra",  label: "Barra",        icon: GlassWater  },
      { href: "/cocina",         label: "Cocina",        icon: ChefHat     },
      { href: "/caja",      label: "Caja",          icon: CreditCard  },
      { href: "/analitica", label: "Analítica",     icon: BarChart2   },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/admin/articulos",   label: "Artículos",  icon: Utensils      },
      { href: "/admin/mesas",       label: "Mesas",       icon: Settings      },
      { href: "/admin/reporteria",  label: "Reportería",  icon: ClipboardList },
    ],
  },
];

/* ── Componente ────────────────────────────────────────────────── */
export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  /* Persistir en localStorage */
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

  return (
    <aside
      className={cn(
        "h-screen flex-shrink-0 flex flex-col text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out overflow-hidden",
        collapsed ? "w-16" : "w-56"
      )}
      style={{
        background: "linear-gradient(175deg, oklch(0.08 0.03 258) 0%, oklch(0.14 0.10 278) 40%, oklch(0.22 0.14 305) 75%, oklch(0.28 0.16 318) 100%)",
      }}
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
                Rancho Tara
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
        {sections.map((section) => (
          <div key={section.label} className="mb-2">
            {/* Etiqueta de sección */}
            {!collapsed && (
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35">
                {section.label}
              </p>
            )}
            {collapsed && (
              <div className="mx-3 my-1 h-px bg-sidebar-border" />
            )}

            {/* Items */}
            {section.items.map((item) => {
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
        ))}
      </nav>
    </aside>
  );
}
