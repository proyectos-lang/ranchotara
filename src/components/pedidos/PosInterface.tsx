"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, ShoppingCart, X, GlassWater, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Mesa, Producto } from "@/types/database";
import type { Categoria } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CatalogoPOS } from "./CatalogoPOS";
import { CarritoPOS } from "./CarritoPOS";
import { cn } from "@/lib/utils";

export type CartItem = { producto: Producto; cantidad: number };

const formatTotal = (n: number) =>
  `L. ${new Intl.NumberFormat("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;

interface PosInterfaceProps {
  barraMode?: boolean;
}

export function PosInterface({ barraMode = false }: PosInterfaceProps) {
  const params = useParams<{ mesa_id: string }>();
  const router = useRouter();
  const mesaId = barraMode ? null : Number(params.mesa_id);

  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState<number | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCarrito, setShowCarrito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [envioError, setEnvioError] = useState<string | null>(null);
  const [pedidoExitoso, setPedidoExitoso] = useState(false);

  /* ── Fetch inicial ─── */
  const fetchData = useCallback(async () => {
    if (barraMode) {
      const [productosRes, categoriasRes] = await Promise.all([
        supabase.from("productos").select("*").eq("disponible", true).order("nombre"),
        supabase.from("categorias").select("*").order("nombre"),
      ]);
      if (productosRes.error) { setError(`Error al cargar productos: ${productosRes.error.message}`); return; }
      setProductos(productosRes.data ?? []);
      setCategorias(categoriasRes.data ?? []);
      return;
    }

    const [mesaRes, productosRes, categoriasRes] = await Promise.all([
      supabase.from("mesas").select("*").eq("id", mesaId!).single(),
      supabase.from("productos").select("*").eq("disponible", true).order("nombre"),
      supabase.from("categorias").select("*").order("nombre"),
    ]);

    if (mesaRes.error) { setError(`Mesa no encontrada: ${mesaRes.error.message}`); return; }
    if (productosRes.error) { setError(`Error al cargar productos: ${productosRes.error.message}`); return; }

    setMesa(mesaRes.data);
    setProductos(productosRes.data ?? []);
    setCategorias(categoriasRes.data ?? []);
  }, [mesaId, barraMode]);

  useEffect(() => {
    if (!barraMode && (!mesaId || isNaN(mesaId))) {
      setError("ID de mesa inválido.");
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData, mesaId, barraMode]);

  /* ── Carrito ─── */
  const addToCart = useCallback((producto: Producto) => {
    setCartItems((prev) => {
      const ex = prev.find((i) => i.producto.id === producto.id);
      return ex
        ? prev.map((i) => i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i)
        : [...prev, { producto, cantidad: 1 }];
    });
  }, []);

  const increaseQty = useCallback((id: number) =>
    setCartItems((prev) => prev.map((i) => i.producto.id === id ? { ...i, cantidad: i.cantidad + 1 } : i)),
  []);

  const decreaseQty = useCallback((id: number) =>
    setCartItems((prev) => {
      const item = prev.find((i) => i.producto.id === id);
      if (!item) return prev;
      if (item.cantidad <= 1) return prev.filter((i) => i.producto.id !== id);
      return prev.map((i) => i.producto.id === id ? { ...i, cantidad: i.cantidad - 1 } : i);
    }),
  []);

  const removeFromCart = useCallback((id: number) =>
    setCartItems((prev) => prev.filter((i) => i.producto.id !== id)),
  []);

  const cartTotal = useMemo(
    () => cartItems.reduce((s, i) => s + i.producto.precio * i.cantidad, 0),
    [cartItems]
  );
  const cartCount = useMemo(() => cartItems.reduce((s, i) => s + i.cantidad, 0), [cartItems]);

  /* ── Productos filtrados ─── */
  const productosFiltrados = useMemo(() => {
    let list = productos;
    if (categoriaActiva !== null) list = list.filter((p) => p.categoria_id === categoriaActiva);
    const q = busqueda.toLowerCase().trim();
    if (q) list = list.filter((p) => p.nombre.toLowerCase().includes(q));
    return list;
  }, [productos, categoriaActiva, busqueda]);

  /* ── Enviar a Cocina ─── */
  const handleEnviarCocina = async () => {
    if (cartItems.length === 0) return;
    setEnviando(true);
    setEnvioError(null);
    try {
      const { data: pedidoData, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          mesa_id: barraMode ? null : mesaId,
          estado: "pendiente",
          total: parseFloat(cartTotal.toFixed(2)),
        })
        .select("id")
        .single();
      if (pedidoError) throw new Error(pedidoError.message);

      const { error: detallesError } = await supabase.from("detalles_pedido").insert(
        cartItems.map((item) => ({
          pedido_id: pedidoData.id,
          producto_id: item.producto.id,
          cantidad: item.cantidad,
          subtotal: parseFloat((item.producto.precio * item.cantidad).toFixed(2)),
          estado_cocina: "pendiente",
        }))
      );
      if (detallesError) throw new Error(detallesError.message);

      if (!barraMode && mesaId) {
        await supabase.from("mesas").update({ estado: "ocupada" }).eq("id", mesaId);
        router.push("/panel");
        return;
      }

      /* Modo barra: resetear carrito y mostrar confirmación */
      setCartItems([]);
      setShowCarrito(false);
      setPedidoExitoso(true);
      setTimeout(() => setPedidoExitoso(false), 3000);
    } catch (err: unknown) {
      setEnvioError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setEnviando(false);
    }
  };

  /* ── Loading ─── */
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-transparent">
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 flex-1 ml-4 rounded-xl" />
        </div>
        <div className="flex gap-2 px-4 py-3 bg-white border-b border-slate-100">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
        </div>
        <div className="flex-1 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || (!barraMode && !mesa)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center bg-transparent">
        <p className="text-3xl">⚠️</p>
        <p className="text-red-600 font-medium">{error ?? "Mesa no encontrada."}</p>
        <Link href="/panel" className="text-sm text-emerald-600 underline-offset-2 hover:underline">
          ← Volver al Panel
        </Link>
      </div>
    );
  }

  const headerLabel = barraMode ? "Barra" : mesa!.numero_mesa;
  const headerSub = barraMode ? "Pedido de consumo en barra" : mesa!.zona ?? undefined;

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* ── Toast de éxito (barra) ── */}
      {pedidoExitoso && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl shadow-emerald-200 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">¡Pedido enviado a cocina!</span>
        </div>
      )}

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <Link
          href="/panel"
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          {barraMode && <GlassWater className="w-4 h-4 text-emerald-500" />}
          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">{headerLabel}</p>
            {headerSub && <p className="text-[10px] text-slate-400">{headerSub}</p>}
          </div>
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            className="pl-9 pr-8 h-9 rounded-xl bg-transparent border-slate-200 text-sm focus-visible:ring-emerald-500"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* ── Tabs de categorías ── */}
      <div className="bg-white border-b border-slate-100 px-4 py-2.5 flex gap-2 overflow-x-auto shrink-0 scrollbar-none">
        <button
          onClick={() => setCategoriaActiva(null)}
          className={cn(
            "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
            categoriaActiva === null
              ? "bg-emerald-500 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          Todos
        </button>
        {categorias.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoriaActiva(cat.id)}
            className={cn(
              "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
              categoriaActiva === cat.id
                ? "bg-emerald-500 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {cat.nombre}
          </button>
        ))}
      </div>

      {/* ── Catálogo ── */}
      <div className="flex-1 overflow-auto pb-28 md:pb-24">
        <CatalogoPOS
          productos={productosFiltrados}
          cartItems={cartItems}
          onAddToCart={addToCart}
        />
      </div>

      {/* ── Barra sticky inferior "Comandar" ── */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/80 backdrop-blur-sm border-t border-slate-200">
        <button
          onClick={() => { if (cartCount > 0) setShowCarrito(true); }}
          disabled={cartCount === 0}
          className={cn(
            "w-full h-14 rounded-2xl flex items-center justify-between px-5 transition-all font-bold text-sm",
            cartCount > 0
              ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200 active:scale-[0.98]"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          )}
        >
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5" />
            <span>Comandar</span>
            {cartCount > 0 && (
              <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {cartCount} ítem{cartCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {cartCount > 0 && (
            <span className="text-base font-black">{formatTotal(cartTotal)}</span>
          )}
        </button>
      </div>

      {/* ── Sheet del carrito (bottom en móvil, derecha en desktop) ── */}
      <Sheet open={showCarrito} onOpenChange={setShowCarrito}>
        <SheetContent
          side="bottom"
          className="h-[88vh] p-0 flex flex-col rounded-t-2xl md:rounded-none md:h-full md:fixed md:right-0 md:top-0 md:left-auto md:w-full md:max-w-md"
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
            <SheetTitle className="text-base font-bold text-slate-800">
              Resumen del Pedido
            </SheetTitle>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              {barraMode && <GlassWater className="w-3 h-3" />}
              {headerLabel}
            </p>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <CarritoPOS
              cartItems={cartItems}
              total={cartTotal}
              onIncrease={increaseQty}
              onDecrease={decreaseQty}
              onRemove={removeFromCart}
              onEnviarCocina={handleEnviarCocina}
              enviando={enviando}
              error={envioError}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
