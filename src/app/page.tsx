import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const modulos = [
  { id: 1, title: "Artículos", description: "Gestiona categorías, platos, bebidas y precios.", href: "/admin/articulos", icon: "🍽️", activo: true },
  { id: 2, title: "Mesas (Admin)", description: "Crea y configura las mesas del restaurante.", href: "/admin/mesas", icon: "🪑", activo: true },
  { id: 3, title: "Pedidos", description: "Toma de pedidos con selección visual.", href: "/panel", icon: "📋", activo: true },
  { id: 4, title: "Cocina", description: "Monitor de cola en tiempo real.", href: "/cocina", icon: "👨‍🍳", activo: true },
  { id: 5, title: "Pagos", description: "Cuentas pendientes y gestión de cobros.", href: "/caja", icon: "💳", activo: true },
  { id: 6, title: "Cierre del Día", description: "Analítica avanzada y reporte diario.", href: "/analitica", icon: "📊", activo: true },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero / Header */}
      <div className="border-b border-border bg-card px-8 py-8 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">🌿</span>
              <h1 className="text-3xl font-bold text-foreground">Rancho Tara</h1>
            </div>
            <p className="text-muted-foreground text-sm">Sistema de Gestión de Restaurante</p>
          </div>
          <Link href="/panel">
            <Button size="lg" className="gap-2 px-6">
              🪑 Abrir Panel Operativo
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-8 py-10 max-w-5xl mx-auto">
        <h2 className="text-lg font-semibold text-foreground mb-1">Módulos Administrativos</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Configura el restaurante desde aquí. Para operación diaria usa el{" "}
          <Link href="/panel" className="text-primary underline-offset-2 hover:underline font-medium">
            Panel Operativo
          </Link>.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {modulos.map((mod) => (
            <Card
              key={mod.id}
              className={`border-border bg-card transition-shadow ${mod.activo ? "hover:shadow-md" : "opacity-60"}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{mod.icon}</span>
                  <CardTitle className="text-base text-foreground">{mod.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm mb-4">{mod.description}</CardDescription>
                {mod.activo ? (
                  <Link href={mod.href}>
                    <Button variant="outline" className="w-full text-sm">
                      Abrir módulo →
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" className="w-full text-sm" disabled>
                    Próximamente
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
