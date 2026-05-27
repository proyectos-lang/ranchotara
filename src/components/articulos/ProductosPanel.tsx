"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { Categoria, Producto } from "@/types/database";

interface ProductosPanelProps {
  productos: Producto[];
  categorias: Categoria[];
  onCreateProducto: (data: Omit<Producto, "id">) => Promise<void>;
  onUpdateProducto: (id: number, data: Omit<Producto, "id">) => Promise<void>;
  onDeleteProducto: (id: number) => Promise<void>;
  onToggleDisponible: (id: number, currentValue: boolean) => Promise<void>;
}

const FORM_INIT = {
  nombre: "",
  descripcion: "",
  precio: "",
  categoria_id: "",
  disponible: true,
};

const formatPrecio = (precio: number) =>
  `L. ${new Intl.NumberFormat("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(precio)}`;

export function ProductosPanel({
  productos,
  categorias,
  onCreateProducto,
  onUpdateProducto,
  onDeleteProducto,
  onToggleDisponible,
}: ProductosPanelProps) {
  const [form, setForm] = useState(FORM_INIT);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Producto | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  /* ── Estado edición ── */
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [editForm, setEditForm] = useState(FORM_INIT);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editUploading, setEditUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  };

  const openEdit = (prod: Producto) => {
    setEditingProducto(prod);
    setEditForm({
      nombre: prod.nombre,
      descripcion: prod.descripcion ?? "",
      precio: String(prod.precio),
      categoria_id: String(prod.categoria_id),
      disponible: prod.disponible,
    });
    setEditImageFile(null);
    setEditImagePreview(prod.imagen_url ?? null);
    setEditError(null);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setEditImageFile(file);
    if (file) setEditImagePreview(URL.createObjectURL(file));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProducto) return;
    if (!editForm.nombre.trim()) { setEditError("El nombre es obligatorio."); return; }
    if (!editForm.categoria_id) { setEditError("Debes seleccionar una categoría."); return; }
    const precio = parseFloat(editForm.precio);
    if (isNaN(precio) || precio < 0) { setEditError("El precio debe ser un número válido."); return; }
    setEditError(null);

    let imagen_url: string | null = editingProducto.imagen_url;

    if (editImageFile) {
      setEditUploading(true);
      const path = `productos/${Date.now()}-${editImageFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("ranchotara")
        .upload(path, editImageFile);
      setEditUploading(false);
      if (uploadError) { setEditError(`Error al subir imagen: ${uploadError.message}`); return; }
      const { data: publicUrlData } = supabase.storage.from("ranchotara").getPublicUrl(uploadData.path);
      imagen_url = publicUrlData.publicUrl;
    }

    setEditSaving(true);
    try {
      await onUpdateProducto(editingProducto.id, {
        nombre: editForm.nombre.trim(),
        descripcion: editForm.descripcion.trim() || null,
        precio,
        categoria_id: parseInt(editForm.categoria_id),
        imagen_url,
        disponible: editForm.disponible,
      });
      setEditingProducto(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setEditSaving(false);
    }
  };

  const getCategoryName = (categoryId: number) =>
    categorias.find((c) => c.id === categoryId)?.nombre ?? "—";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setFormError("El nombre del producto es obligatorio.");
      return;
    }
    if (!form.categoria_id) {
      setFormError("Debes seleccionar una categoría.");
      return;
    }
    const precio = parseFloat(form.precio);
    if (isNaN(precio) || precio < 0) {
      setFormError("El precio debe ser un número válido mayor o igual a 0.");
      return;
    }

    setFormError(null);

    /* ── Subir imagen al Storage si se seleccionó un archivo ── */
    let imagen_url: string | null = null;
    if (imageFile) {
      setUploading(true);
      const path = `productos/${Date.now()}-${imageFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("ranchotara")
        .upload(path, imageFile);
      setUploading(false);

      if (uploadError) {
        setFormError(`Error al subir imagen: ${uploadError.message}`);
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from("ranchotara")
        .getPublicUrl(uploadData.path);
      imagen_url = publicUrlData.publicUrl;
    }

    setSaving(true);
    try {
      await onCreateProducto({
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        precio,
        categoria_id: parseInt(form.categoria_id),
        imagen_url,
        disponible: form.disponible,
      });
      setForm(FORM_INIT);
      setImageFile(null);
      setImagePreview(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error al guardar el producto.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await onDeleteProducto(confirmDelete.id);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const noCategorias = categorias.length === 0;

  return (
    <>
      <div className="space-y-6">
        {/* Alerta si no hay categorías */}
        {noCategorias && (
          <div className="p-4 rounded-lg bg-accent/30 border border-accent text-sm text-foreground">
            <strong>Paso previo:</strong> Debes crear al menos una categoría en la pestaña
            &ldquo;Categorías&rdquo; antes de agregar productos.
          </div>
        )}

        {/* Formulario nuevo producto */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="text-lg">🍽️</span>
              Nuevo Producto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre */}
                <div className="space-y-1.5">
                  <Label htmlFor="prod-nombre" className="text-xs font-medium">
                    Nombre *
                  </Label>
                  <Input
                    id="prod-nombre"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej. Pollo a la parrilla"
                    className="bg-background border-input h-9 text-sm"
                    disabled={noCategorias}
                  />
                </div>

                {/* Categoría */}
                <div className="space-y-1.5">
                  <Label htmlFor="prod-categoria" className="text-xs font-medium">
                    Categoría *
                  </Label>
                  <Select
                    value={form.categoria_id}
                    onValueChange={(val) => setForm({ ...form, categoria_id: val ?? "" })}
                    disabled={noCategorias}
                  >
                    <SelectTrigger
                      id="prod-categoria"
                      className="bg-background border-input h-9 text-sm w-full"
                    >
                      <SelectValue placeholder="Seleccionar categoría..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Precio */}
                <div className="space-y-1.5">
                  <Label htmlFor="prod-precio" className="text-xs font-medium">
                    Precio (L.) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                      L.
                    </span>
                    <Input
                      id="prod-precio"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.precio}
                      onChange={(e) => setForm({ ...form, precio: e.target.value })}
                      placeholder="0.00"
                      className="bg-background border-input h-9 text-sm pl-8"
                      disabled={noCategorias}
                    />
                  </div>
                </div>

                {/* Imagen — input file con preview */}
                <div className="space-y-1.5">
                  <Label htmlFor="prod-imagen" className="text-xs font-medium">
                    Imagen
                    <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                  </Label>
                  <label
                    htmlFor="prod-imagen"
                    className={[
                      "flex items-center gap-3 rounded-lg border border-dashed border-input bg-background px-3 h-16 cursor-pointer transition-colors",
                      noCategorias ? "opacity-50 pointer-events-none" : "hover:border-primary/50 hover:bg-primary/5",
                    ].join(" ")}
                  >
                    {imagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagePreview}
                        alt="preview"
                        className="w-10 h-10 rounded-md object-cover border border-border shrink-0"
                      />
                    ) : (
                      <span className="text-2xl shrink-0">🖼️</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {imageFile ? imageFile.name : "Seleccionar archivo..."}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {imageFile
                          ? `${(imageFile.size / 1024).toFixed(0)} KB`
                          : "JPG, PNG, WEBP · máx. 5 MB"}
                      </p>
                    </div>
                    {imageFile && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="text-muted-foreground hover:text-destructive text-sm shrink-0"
                        aria-label="Quitar imagen"
                      >
                        ✕
                      </button>
                    )}
                  </label>
                  <input
                    id="prod-imagen"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={noCategorias}
                  />
                </div>

                {/* Descripción */}
                <div className="md:col-span-2 space-y-1.5">
                  <Label htmlFor="prod-desc" className="text-xs font-medium">
                    Descripción
                    <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                  </Label>
                  <Textarea
                    id="prod-desc"
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    placeholder="Describe el plato: ingredientes, acompañamientos..."
                    rows={2}
                    className="bg-background border-input text-sm resize-none"
                    disabled={noCategorias}
                  />
                </div>

                {/* Switch disponible */}
                <div className="md:col-span-2 flex items-center gap-3 py-1">
                  <Switch
                    id="prod-disponible"
                    checked={form.disponible}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, disponible: checked })
                    }
                    disabled={noCategorias}
                  />
                  <Label htmlFor="prod-disponible" className="text-sm cursor-pointer">
                    Disponible en el menú
                  </Label>
                </div>
              </div>

              {formError && (
                <p className="text-xs text-destructive font-medium mt-3">{formError}</p>
              )}

              <div className="mt-5 flex items-center justify-end gap-3">
                {uploading && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block" />
                    Subiendo imagen...
                  </span>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving || uploading || noCategorias}
                >
                  {uploading ? "Subiendo..." : saving ? "Guardando..." : "Agregar Producto"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Tabla de productos */}
        <Card className="border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">
              Productos del menú
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({productos.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {productos.length === 0 ? (
              <div className="text-center py-14 text-muted-foreground px-6">
                <p className="text-3xl mb-3">🍽️</p>
                <p className="text-sm font-medium">No hay productos aún</p>
                <p className="text-xs mt-1">
                  Agrega el primero usando el formulario de arriba.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-t">
                    <TableHead className="w-16 pl-6">Imagen</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead className="text-center">Disponible</TableHead>
                    <TableHead className="text-right pr-6">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productos.map((prod) => (
                    <TableRow key={prod.id}>
                      {/* Imagen */}
                      <TableCell className="pl-6">
                        {prod.imagen_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={prod.imagen_url}
                            alt={prod.nombre}
                            className="w-11 h-11 rounded-lg object-cover border border-border bg-muted"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center text-xl border border-border">
                            🍽️
                          </div>
                        )}
                      </TableCell>

                      {/* Nombre + descripción */}
                      <TableCell>
                        <p className="font-medium text-foreground text-sm leading-tight">
                          {prod.nombre}
                        </p>
                        {prod.descripcion && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[200px]">
                            {prod.descripcion}
                          </p>
                        )}
                      </TableCell>

                      {/* Categoría */}
                      <TableCell className="text-sm text-muted-foreground">
                        {getCategoryName(prod.categoria_id)}
                      </TableCell>

                      {/* Precio */}
                      <TableCell>
                        <span className="text-sm font-semibold text-foreground">
                          {formatPrecio(prod.precio)}
                        </span>
                      </TableCell>

                      {/* Toggle disponible + badge */}
                      <TableCell>
                        <div className="flex flex-col items-center gap-1.5">
                          <Switch
                            checked={prod.disponible}
                            onCheckedChange={() =>
                              onToggleDisponible(prod.id, prod.disponible)
                            }
                          />
                          <Badge
                            variant={prod.disponible ? "default" : "secondary"}
                            className={
                              prod.disponible
                                ? "text-xs bg-primary/15 text-primary border-0 h-4"
                                : "text-xs h-4"
                            }
                          >
                            {prod.disponible ? "Disponible" : "No disponible"}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(prod)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete(prod)}
                            disabled={deletingId === prod.id}
                            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {deletingId === prod.id ? "..." : "Eliminar"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo confirmación eliminar */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar producto</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar{" "}
              <strong>&ldquo;{confirmDelete?.nombre}&rdquo;</strong>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(null)}
              disabled={!!deletingId}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={!!deletingId}
            >
              {deletingId ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo editar producto */}
      <Dialog
        open={!!editingProducto}
        onOpenChange={(open) => { if (!open) setEditingProducto(null); }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
            <DialogDescription>
              Modifica los campos que deseas actualizar y guarda los cambios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              {/* Nombre */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-nombre" className="text-xs font-medium">Nombre *</Label>
                <Input
                  id="edit-nombre"
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  className="bg-background border-input h-9 text-sm"
                />
              </div>

              {/* Categoría */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-categoria" className="text-xs font-medium">Categoría *</Label>
                <Select
                  value={editForm.categoria_id}
                  onValueChange={(val) => setEditForm({ ...editForm, categoria_id: val ?? "" })}
                >
                  <SelectTrigger id="edit-categoria" className="bg-background border-input h-9 text-sm w-full">
                    <SelectValue placeholder="Seleccionar categoría..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Precio */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-precio" className="text-xs font-medium">Precio (L.) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">L.</span>
                  <Input
                    id="edit-precio"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.precio}
                    onChange={(e) => setEditForm({ ...editForm, precio: e.target.value })}
                    className="bg-background border-input h-9 text-sm pl-8"
                  />
                </div>
              </div>

              {/* Imagen */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-imagen" className="text-xs font-medium">
                  Imagen
                  <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                </Label>
                <label
                  htmlFor="edit-imagen"
                  className="flex items-center gap-3 rounded-lg border border-dashed border-input bg-background px-3 h-16 cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  {editImagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={editImagePreview}
                      alt="preview"
                      className="w-10 h-10 rounded-md object-cover border border-border shrink-0"
                    />
                  ) : (
                    <span className="text-2xl shrink-0">🖼️</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {editImageFile ? editImageFile.name : "Cambiar imagen..."}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {editImageFile
                        ? `${(editImageFile.size / 1024).toFixed(0)} KB`
                        : "JPG, PNG, WEBP · máx. 5 MB"}
                    </p>
                  </div>
                  {editImageFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setEditImageFile(null);
                        setEditImagePreview(editingProducto?.imagen_url ?? null);
                      }}
                      className="text-muted-foreground hover:text-destructive text-sm shrink-0"
                      aria-label="Quitar imagen nueva"
                    >
                      ✕
                    </button>
                  )}
                </label>
                <input
                  id="edit-imagen"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={handleEditFileChange}
                />
              </div>

              {/* Descripción */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="edit-desc" className="text-xs font-medium">
                  Descripción
                  <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                </Label>
                <Textarea
                  id="edit-desc"
                  value={editForm.descripcion}
                  onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
                  rows={2}
                  className="bg-background border-input text-sm resize-none"
                />
              </div>

              {/* Disponible */}
              <div className="sm:col-span-2 flex items-center gap-3 py-1">
                <Switch
                  id="edit-disponible"
                  checked={editForm.disponible}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, disponible: checked })}
                />
                <Label htmlFor="edit-disponible" className="text-sm cursor-pointer">
                  Disponible en el menú
                </Label>
              </div>
            </div>

            {editError && (
              <p className="text-xs text-destructive font-medium mt-1">{editError}</p>
            )}

            <DialogFooter className="mt-4">
              {editUploading && (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 mr-auto">
                  <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block" />
                  Subiendo imagen...
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingProducto(null)}
                disabled={editSaving || editUploading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={editSaving || editUploading}
              >
                {editUploading ? "Subiendo..." : editSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
