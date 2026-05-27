"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/articulos", label: "Artículos",    emoji: "🍽️" },
  { href: "/admin/mesas",     label: "Mesas",         emoji: "🪑" },
  { href: "/panel",           label: "Panel Mesas",   emoji: "🗺️" },
  { href: "/pedidos",         label: "Pedidos (POS)", emoji: "📋" },
  { href: "/cocina",          label: "Cocina",        emoji: "👨‍🍳" },
  { href: "/caja",            label: "Caja / Pagos",  emoji: "💰" },
  { href: "/analitica",       label: "Analítica",     emoji: "📊" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 mb-2">
        Módulos
      </p>
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            <span className="text-base w-5 text-center">{item.emoji}</span>
            <span>{item.label}</span>
            {isActive && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
