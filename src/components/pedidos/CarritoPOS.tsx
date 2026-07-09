"use client";

import { useState } from "react";
import { Minus, Plus, Trash2, ChefHat, Loader2, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CartItem } from "./PosInterface";
import { fmtLps as formatPrecio } from "@/lib/format";

interface CarritoPOSProps {
  cartItems: CartItem[];
  total: number;
  onIncrease: (productoId: number) => void;
  onDecrease: (productoId: number) => void;
  onRemove: (productoId: number) => void;
  onSetNota: (productoId: number, nota: string) => void;
  onEnviarCocina: () => void;
  enviando: boolean;
  error: string | null;
  modoAgregar?: boolean;
}

export function CarritoPOS({ cartItems, total, onIncrease, onDecrease, onRemove, onSetNota, onEnviarCocina, enviando, error, modoAgregar = false }: CarritoPOSProps) {
  const totalItems = cartItems.reduce((s, i) => s + i.cantidad, 0);
  const isEmpty = cartItems.length === 0;
  const [notasAbiertas, setNotasAbiertas] = useState<Set<number>>(new Set());

  const toggleNota = (productoId: number) => {
    setNotasAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(productoId)) next.delete(productoId);
      else next.add(productoId);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Lista de ítems */}
      <div className="flex-1 overflow-auto px-5 py-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-10">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <ChefHat className="w-7 h-7 text-slate-300" />
            </div>
            <p className="font-semibold text-slate-600 text-sm">Comanda vacía</p>
            <p className="text-xs mt-1 text-slate-400">
              Selecciona productos del catálogo.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {cartItems.map((item) => {
              const notaVisible = notasAbiertas.has(item.producto.id) || item.nota !== "";
              return (
                <div
                  key={item.producto.id}
                  className="bg-slate-50 rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-center gap-3">
                    {/* Miniatura */}
                    <div className="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                      {item.producto.imagen_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.producto.imagen_url}
                          alt={item.producto.nombre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-1">
                        {item.producto.nombre}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatPrecio(item.producto.precio)} c/u
                      </p>
                    </div>

                    {/* Controles */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onDecrease(item.producto.id)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3 h-3 text-slate-600" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold text-slate-800">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => onIncrease(item.producto.id)}
                        className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3 h-3 text-white" />
                      </button>
                    </div>

                    {/* Subtotal + eliminar */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <p className="text-xs font-bold text-slate-800">
                        {formatPrecio(item.producto.precio * item.cantidad)}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleNota(item.producto.id)}
                          className={[
                            "transition-colors",
                            notaVisible ? "text-amber-500" : "text-slate-300 hover:text-amber-400",
                          ].join(" ")}
                          aria-label="Agregar nota"
                          title="Nota para cocina"
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRemove(item.producto.id)}
                          className="text-slate-300 hover:text-red-400 transition-colors"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Nota para cocina */}
                  {notaVisible && (
                    <input
                      type="text"
                      value={item.nota}
                      onChange={(e) => onSetNota(item.producto.id, e.target.value)}
                      placeholder="Nota para cocina (ej. sin cebolla)"
                      maxLength={120}
                      className="w-full h-8 px-3 rounded-lg border border-amber-200 bg-amber-50/60 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {!isEmpty && (
        <div className="px-5 pb-5 pt-3 border-t border-slate-100 shrink-0 space-y-4">
          {/* Resumen */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal ({totalItems} ítem{totalItems !== 1 ? "s" : ""})</span>
              <span>{formatPrecio(total)}</span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-baseline">
            <span className="text-sm font-bold text-slate-800">TOTAL</span>
            <span className="text-xl font-black text-emerald-600">{formatPrecio(total)}</span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          <Button
            onClick={onEnviarCocina}
            disabled={enviando}
            className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-200 gap-2 transition-all"
          >
            {enviando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando a cocina...
              </>
            ) : (
              <>
                <ChefHat className="w-4 h-4" />
                {modoAgregar ? "Agregar al Pedido" : "Enviar a Cocina"}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
