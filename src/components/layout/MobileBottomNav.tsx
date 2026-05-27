"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ChefHat, CreditCard, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",          label: "Inicio",   icon: Home,        exact: true },
  { href: "/panel",     label: "Mesas",    icon: LayoutGrid   },
  { href: "/cocina",    label: "Cocina",   icon: ChefHat      },
  { href: "/caja",      label: "Caja",     icon: CreditCard   },
  { href: "/analitica", label: "Reportes", icon: BarChart2    },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  /* El POS y la Barra tienen su propia barra inferior */
  if (pathname.startsWith("/pedidos")) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-slate-200"
      style={{ background: "linear-gradient(175deg, oklch(0.08 0.03 258) 0%, oklch(0.22 0.14 305) 100%)" }}
    >
      {NAV_ITEMS.map((item) => {
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
