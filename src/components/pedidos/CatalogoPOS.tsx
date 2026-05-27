"use client";

import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { Producto } from "@/types/database";
import { CartItem } from "./PosInterface";
import { cn } from "@/lib/utils";

interface CatalogoPOSProps {
  productos: Producto[];
  cartItems: CartItem[];
  onAddToCart: (producto: Producto) => void;
}

const formatPrecio = (precio: number) =>
  `L. ${new Intl.NumberFormat("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(precio)}`;

export function CatalogoPOS({ productos, cartItems, onAddToCart }: CatalogoPOSProps) {
  const [clickedId, setClickedId] = useState<number | null>(null);

  const handleClick = (producto: Producto) => {
    onAddToCart(producto);
    setClickedId(producto.id);
    setTimeout(() => setClickedId(null), 400);
  };

  const getQtyInCart = (id: number) =>
    cartItems.find((i) => i.producto.id === id)?.cantidad ?? 0;

  if (productos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center text-slate-400 p-8">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-semibold text-slate-600 text-sm">Sin resultados</p>
        <p className="text-xs mt-1">Intenta con otra categoría o término de búsqueda.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4">
      {productos.map((producto) => {
        const isClicked = clickedId === producto.id;
        const qty = getQtyInCart(producto.id);

        return (
          <button
            key={producto.id}
            onClick={() => handleClick(producto)}
            className={cn(
              "group relative flex flex-col rounded-2xl overflow-hidden border bg-white text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-sm",
              isClicked
                ? "scale-95 border-emerald-400 shadow-emerald-100 shadow-md"
                : "border-slate-200 hover:border-emerald-300 hover:shadow-md hover:scale-[1.02]"
            )}
          >
            {/* Imagen — 70% de la tarjeta */}
            <div className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden">
              {producto.imagen_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={producto.imagen_url}
                  alt={producto.nombre}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl bg-slate-50">
                  🍽️
                </div>
              )}

              {/* Badge de cantidad en carrito */}
              {qty > 0 && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-black flex items-center justify-center shadow-md">
                  {qty}
                </div>
              )}

              {/* Overlay al hacer clic */}
              {isClicked && (
                <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                    <Check className="w-5 h-5 text-white" strokeWidth={3} />
                  </div>
                </div>
              )}
            </div>

            {/* Info — 30% inferior */}
            <div className="flex items-center justify-between px-2.5 py-2 bg-slate-800">
              <div className="flex-1 min-w-0 pr-1.5">
                <p className="text-[11px] font-semibold text-white leading-tight line-clamp-1">
                  {producto.nombre}
                </p>
                <p className="text-[11px] font-black text-emerald-400 mt-0.5">
                  {formatPrecio(producto.precio)}
                </p>
              </div>
              <div className={cn(
                "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                isClicked ? "bg-emerald-500" : "bg-white/15 group-hover:bg-emerald-500"
              )}>
                <Plus className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
