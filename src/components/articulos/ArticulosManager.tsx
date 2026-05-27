"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Categoria, Producto } from "@/types/database";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoriasPanel } from "./CategoriasPanel";
import { ProductosPanel } from "./ProductosPanel";

export function ArticulosManager() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    const [catsResult, prodsResult] = await Promise.all([
      supabase.from("categorias").select("*").order("id"),
      supabase.from("productos").select("*").order("id"),
    ]);
    if (catsResult.error) {
      setError(`Error al cargar categorías: ${catsResult.error.message}`);
      return;
    }
    if (prodsResult.error) {
      setError(`Error al cargar productos: ${prodsResult.error.message}`);
      return;
    }
    setCategorias(catsResult.data ?? []);
    setProductos(prodsResult.data ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const handleCreateCategoria = async (data: { nombre: string; descripcion: string }) => {
    const { error: err } = await supabase.from("categorias").insert(data);
    if (err) throw new Error(err.message);
    await fetchData();
  };

  const handleDeleteCategoria = async (id: number) => {
    const { error: err } = await supabase.from("categorias").delete().eq("id", id);
    if (err) throw new Error(err.message);
    await fetchData();
  };

  const handleCreateProducto = async (data: Omit<Producto, "id">) => {
    const { error: err } = await supabase.from("productos").insert(data);
    if (err) throw new Error(err.message);
    await fetchData();
  };

  const handleUpdateProducto = async (id: number, data: Omit<Producto, "id">) => {
    const { error: err } = await supabase.from("productos").update(data).eq("id", id);
    if (err) throw new Error(err.message);
    await fetchData();
  };

  const handleDeleteProducto = async (id: number) => {
    const { error: err } = await supabase.from("productos").delete().eq("id", id);
    if (err) throw new Error(err.message);
    await fetchData();
  };

  const handleToggleDisponible = async (id: number, currentValue: boolean) => {
    const { error: err } = await supabase
      .from("productos")
      .update({ disponible: !currentValue })
      .eq("id", id);
    if (err) throw new Error(err.message);
    // Actualización optimista
    setProductos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, disponible: !currentValue } : p))
    );
  };

  if (loading) {
    return (
      <div className="p-8 space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-10 w-64" />
        <div className="space-y-3">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Configuración de Artículos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gestiona las categorías y los productos del menú del restaurante.
        </p>
      </div>

      {/* Error global */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="categorias">
        <TabsList className="mb-6 bg-card border border-border">
          <TabsTrigger value="categorias">
            Categorías ({categorias.length})
          </TabsTrigger>
          <TabsTrigger value="productos">
            Productos ({productos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categorias">
          <CategoriasPanel
            categorias={categorias}
            onCreateCategoria={handleCreateCategoria}
            onDeleteCategoria={handleDeleteCategoria}
          />
        </TabsContent>

        <TabsContent value="productos">
          <ProductosPanel
            productos={productos}
            categorias={categorias}
            onCreateProducto={handleCreateProducto}
            onUpdateProducto={handleUpdateProducto}
            onDeleteProducto={handleDeleteProducto}
            onToggleDisponible={handleToggleDisponible}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
