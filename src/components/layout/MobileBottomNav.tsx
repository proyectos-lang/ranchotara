"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ChefHat, CreditCard, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/context/SessionContext";
import type { ModuloSlug } from "@/types/session";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  modulo?: ModuloSlug;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/",          label: "Inicio",   icon: Home,        exact: true },
  { href: "/panel",     label: "Mesas",    icon: LayoutGrid,  modulo: "panel" },
  { href: "/cocina",    label: "Cocina",   icon: ChefHat,     modulo: "cocina" },
  { href: "/caja",      label: "Caja",     icon: CreditCard,  modulo: "caja" },
  { href: "/analitica", label: "Reportes", icon: BarChart2,   modulo: "analitica" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { session } = useSession();

  if (pathname.startsWith("/pedidos")) return null;

  const tieneAcceso = (modulo?: ModuloSlug) => {
    if (!modulo) return true;
    if (!session) return false;
    return session.es_admin || session.permisos.includes(modulo);
  };

  const visibles = NAV_ITEMS.filter((item) => tieneAcceso(item.modulo));

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-slate-200"
      style={{ background: "linear-gradient(175deg, oklch(0.08 0.03 258) 0%, oklch(0.22 0.14 305) 100%)" }}
    >
      {visibles.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center py-2.5 gap-0.5 transition-colors",
              active ? "text-emerald-400" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
