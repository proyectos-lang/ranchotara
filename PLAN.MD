# PLAN.MD — Rancho Tara: Sistema de Gestión de Restaurante
> **Fuente única de verdad del proyecto.** Actualizar este archivo en cada avance significativo.

---

## Stack Tecnológico
| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Estilos | Tailwind CSS v4 + shadcn/ui v4.7 |
| Backend / DB | Supabase (esquema: `ranchotara`) |
| Lenguaje | TypeScript |
| Paleta | Beige · Crema · Café/Tierra |

---

## Estado General del Proyecto

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| **Setup Inicial** | ✅ Completado | Next.js, Tailwind, shadcn/ui, Supabase config |
| **Módulo 1** | ✅ Completado | Configuración de Artículos |
| **Módulo 2** | ✅ Completado | Panel General y Mesas |
| **Módulo 3** | ✅ Completado | Toma de Pedidos (POS) |
| **Módulo 4** | ✅ Completado | Monitor de Cocina (Tiempo Real) |
| **Módulo 5** | ✅ Completado | Gestión de Pagos |
| **Módulo 6** | ✅ Completado | Cierre del Día y Analítica |
| **Módulo 7** | ✅ Completado | Reportería Avanzada y Tiempos de Cocina |

---

## Módulo 1 — Configuración de Artículos
**Estado: ✅ Completado**

### Alcance
- CRUD de **Categorías** (ej. Entradas, Platos Fuertes, Bebidas, Postres)
- CRUD de **Platos** y **Bebidas** por categoría
- Gestión de **Precios** (con soporte a variantes opcionales)
- Subida y gestión de **Imágenes** (Supabase Storage)
- Vista de galería con imagen, nombre y precio

### Tablas Supabase necesarias (`schema: ranchotara`)
```sql
categories     (id, name, description, icon, sort_order, active)
menu_items     (id, category_id, name, description, price, image_url, active, sort_order)
```

### Storage de Supabase
- Bucket: `ranchotara` (público)
- Path de subida: `productos/{timestamp}-{filename}`
- El campo `imagen_url` almacena la URL pública devuelta por `getPublicUrl`
- Flujo: selección de archivo → upload al Storage → obtener URL pública → INSERT producto

### Rutas Next.js
- `/articulos` — listado y gestión
- `/articulos/categorias` — CRUD categorías
- `/articulos/nuevo` — alta de artículo
- `/articulos/[id]/editar` — edición

---

## Módulo 2 — Panel General y Configuración de Mesas
**Estado: ✅ Completado**

### Alcance
- Dashboard home con accesos rápidos a todos los módulos
- CRUD de **Mesas** (número, capacidad, zona, estado: libre/ocupada/reservada)
- Vista de planta del restaurante (grid visual de mesas)

### Tablas Supabase necesarias
```sql
tables         (id, number, capacity, zone, status, active)
```

### Archivos creados
- `src/types/database.ts` — tipos `Mesa` y `EstadoMesa` añadidos
- `src/components/admin/MesasAdmin.tsx` — CRUD de mesas en admin
- `src/app/admin/mesas/page.tsx` — ruta `/admin/mesas`
- `src/app/panel/layout.tsx` — layout limpio del panel operativo
- `src/app/panel/page.tsx` — ruta `/panel`
- `src/components/panel/MapaMesas.tsx` — grid visual + Supabase Realtime + Dialog

### Rutas Next.js
- `/admin/mesas` — configuración administrativa de mesas
- `/panel` — panel operativo con mapa de mesas en tiempo real

---

## Módulo 3 — Toma de Pedidos (POS)
**Estado: ✅ Completado**

### Alcance
- Selección de mesa activa
- Buscador de artículos por nombre/categoría
- Selección con **clic en imagen** del artículo
- Carrito de pedido: agregar, modificar cantidad, eliminar
- Notas por ítem
- Envío del pedido a cocina (cambia estado a "En Preparación")

### Tablas Supabase necesarias
```sql
orders         (id, table_id, status, created_at, updated_at, total)
order_items    (id, order_id, menu_item_id, quantity, unit_price, notes, status)
```

### Archivos creados / modificados
- `src/types/database.ts` — tipos `Pedido`, `DetallePedido`, `EstadoPedido`, `EstadoCocina`
- `src/components/panel/MapaMesas.tsx` — botón "Tomar Pedido" funcional en el Dialog (solo mesas libres)
- `src/app/pedidos/layout.tsx` — layout full-screen para el POS
- `src/app/pedidos/[mesa_id]/page.tsx` — ruta dinámica del POS
- `src/components/pedidos/PosInterface.tsx` — orquestador: fetch mesa+productos, gestión del carrito, envío a Supabase
- `src/components/pedidos/CatalogoPOS.tsx` — buscador + grid de tarjetas con imagen y precio
- `src/components/pedidos/CarritoPOS.tsx` — lista de ítems, controles ±, subtotales, total y botón "Enviar a Cocina"

### Flujo de guardado (Enviar a Cocina)
1. `INSERT INTO pedidos` (mesa_id, estado='pendiente', total) → recupera `id`
2. `INSERT INTO detalles_pedido` (bulk: pedido_id, producto_id, cantidad, subtotal, estado_cocina='pendiente')
3. `UPDATE mesas SET estado='ocupada'` WHERE id=mesa_id
4. `router.push('/panel')`

### Rutas Next.js
- `/pedidos/[mesa_id]` — POS de pantalla completa para la mesa seleccionada

---

## Módulo 4 — Monitor / Cola de Cocina (KDS, Tiempo Real)
**Estado: ✅ Completado + Mejorado**

### Alcance
- Vista tipo KDS (Kitchen Display System) — pantalla con tema claro, optimizada para tablets de cocina
- **Dos secciones diferenciadas** con separadores visuales:
  - 🟡 **En Cola** (`estado = 'pendiente'`): comandas recibidas, aún sin iniciar
  - 🔵 **Cocinando** (`estado = 'en_preparacion'`): comandas activamente en preparación
- Badges semánticos shadcn/ui en dos niveles:
  - **Nivel comanda** (header de tarjeta): "En Cola" (amber) / "Cocinando" (azul)
  - **Nivel ítem** (cada plato): "Pendiente" (amber) / "Listo" (emerald) / "Entregado" (slate)
- Imagen del producto visible en cada ítem de la comanda
- Actualización en tiempo real con Supabase Realtime (detalles_pedido + pedidos)
- Cambio de estado por ítem: `pendiente` → `listo` → `entregado`
- Alerta visual de pedidos urgentes (borde rojo + badge pulsante si >15 min)
- Auto-cierre de pedido cuando todos los ítems quedan en `entregado`
- Pedidos de barra (`mesa_id = null`) muestran "Barra" en lugar de número de mesa

### Campos del esquema `ranchotara` (nombres en español)
| Tabla | Campo | Tipo | Descripción |
|-------|-------|------|-------------|
| `pedidos` | `fecha_creacion` | `TIMESTAMPTZ` | Timestamp de apertura del pedido |
| `pedidos` | `fecha_pago` | `TIMESTAMPTZ` | Timestamp de cierre/cobro |
| `detalles_pedido` | `hora_listo` | `TIMESTAMPTZ` | Timestamp en que el ítem fue marcado listo |

### Métricas de tiempo exactas (para analítica futura)
Estos tres campos permiten calcular indicadores de rendimiento de cocina sin datos adicionales:

| Métrica | Cálculo | Fuente |
|---------|---------|--------|
| **Tiempo de preparación por plato** | `hora_listo − fecha_creacion` | `detalles_pedido` + `pedidos` |
| **Tiempo de servicio total por mesa** | `fecha_pago − fecha_creacion` | `pedidos` |
| **Tiempo promedio por franja horaria** | agrupar por `EXTRACT(HOUR FROM fecha_creacion)` | `pedidos` |
| **Platos más lentos** | promedio de `hora_listo − fecha_creacion` por `producto_id` | `detalles_pedido` |

> Estos cálculos están disponibles en los datos actuales — no requieren cambios de esquema. El módulo de Analítica puede incorporarlos en futuras iteraciones.

### SQL necesario en Supabase
```sql
-- Si hora_listo no existe aún en detalles_pedido:
ALTER TABLE ranchotara.detalles_pedido ADD COLUMN IF NOT EXISTS hora_listo TIMESTAMPTZ;
-- Si fecha_pago no existe en pedidos:
ALTER TABLE ranchotara.pedidos ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ;
ALTER TABLE ranchotara.pedidos ADD COLUMN IF NOT EXISTS metodo_pago TEXT;
-- Habilitar Realtime:
ALTER PUBLICATION supabase_realtime ADD TABLE ranchotara.detalles_pedido;
ALTER PUBLICATION supabase_realtime ADD TABLE ranchotara.pedidos;
```

### Archivos
- `src/app/cocina/layout.tsx` — layout pasthrough (tema claro, integrado con sidebar global)
- `src/app/cocina/page.tsx` — renderiza `<MonitorCocina />`
- `src/components/cocina/MonitorCocina.tsx` — orquestador: fetch, Realtime, secciones "En Cola" / "Cocinando", handleNextState
- `src/components/cocina/ComandaCard.tsx` — tarjeta por pedido: badges de estado (nivel comanda + nivel ítem), imagen de producto, botones táctiles, urgency alert

### Rutas Next.js
- `/cocina` — KDS monitor de cocina (integrado con sidebar global)

---

## Módulo 5 — Registro y Gestión de Pagos (Caja)
**Estado: ✅ Completado**

### Alcance
- Grid de **cuentas pendientes** por mesa (todos los pedidos no `pagado` ni `cancelado`)
- Tarjeta destacada: número de mesa grande, total en Lempiras, estado del pedido
- Modal de cobro: total destacado + selector de método de pago (Efectivo / Tarjeta / Transferencia)
- Transacción de pago: UPDATE pedidos (estado→pagado, metodo_pago, fecha_pago=NOW) + UPDATE mesas (estado→libre)
- Actualización automática vía Supabase Realtime al registrar cada pago

### Archivos creados / modificados
- `src/types/database.ts` — tipo `MetodoPago`, campos `metodo_pago` y `fecha_pago` añadidos a `Pedido`
- `src/app/caja/layout.tsx` — layout con header de navegación (links a Cocina y Panel)
- `src/app/caja/page.tsx` — renderiza `<CajaMonitor />`
- `src/components/caja/CajaMonitor.tsx` — orquestador: fetch, Realtime, handleRegistrarPago, barra de totales
- `src/components/caja/CuentaCard.tsx` — tarjeta clickeable: mesa grande, total, badge de estado, CTA "Cobrar →"
- `src/components/caja/ModalPago.tsx` — modal overlay: total destacado, 3 botones de método con radio indicator, botón "Registrar Pago"

### SQL necesario en Supabase
```sql
-- Añadir columnas si no existen:
ALTER TABLE ranchotara.pedidos ADD COLUMN IF NOT EXISTS metodo_pago TEXT;
ALTER TABLE ranchotara.pedidos ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ;
-- Habilitar Realtime (si no estaba ya):
ALTER PUBLICATION supabase_realtime ADD TABLE ranchotara.pedidos;
```

### Rutas Next.js
- `/caja` — monitor de caja con cuentas pendientes y flujo de cobro

---

## Módulo 6 — Cierre del Día y Analítica Avanzada
**Estado: ✅ Completado**

### Alcance implementado

**Sección 1 — Cierre del Día (Hoy)**
- KPI: Ingresos totales del día en Lempiras (L.)
- KPI: Total pedidos cobrados y ticket promedio
- Desglose de ingresos por método de pago (Efectivo / Tarjeta / Transferencia)
- Tabla de platos vendidos hoy: nombre, cantidad, barra de porcentaje

**Sección 2 — Analítica Histórica (últimos 30 días)**
- BarChart de ingresos diarios (últimos 30 días) con tooltips en L.
- PieChart + BarChart horizontal de Top 5 platos más vendidos históricamente
- Tarjeta "Hora pico": franja horaria con mayor concentración de pedidos
- Tarjeta "Día más activo": día de la semana con más pedidos cobrados

### Lógica de datos
- Todo el procesamiento (agrupaciones, sumas, derivaciones) se realiza en el cliente tras un fetch crudo desde Supabase
- Fetch 1: `pedidos` (estado=pagado, últimos 30 días) → KPIs + ventas por día
- Fetch 2: `pedidos` (estado=pagado, histórico completo) → hora pico, día pico, top5
- Fetch 3: `detalles_pedido` con join a `productos` (IN pedidosIds) → conteos de platos
- Cero datos simulados; estados de loading con Skeleton components; mensajes vacíos si no hay datos

### Archivos creados
- `recharts` — instalado como dependencia
- `src/components/ui/chart.tsx` — ChartContainer (wrapper ResponsiveContainer), ChartTooltipContent estilizado, CHART_COLORS (alineados con paleta OKLCH)
- `src/app/analitica/layout.tsx` — header con links a Caja y Panel
- `src/app/analitica/page.tsx` — renderiza `<DashboardAnalitica />`
- `src/hooks/useAnalitica.ts` — hook con 3 fetches + 7 procesamientos → expone KpisHoy, PlatoConteo[], VentaDia[], InsightTrafico
- `src/components/analitica/DashboardAnalitica.tsx` — orquestador con skeleton loading y manejo de errores
- `src/components/analitica/SeccionHoy.tsx` — KPIs + desglose métodos + tabla platos
- `src/components/analitica/SeccionHistorica.tsx` — insights tráfico + BarChart diario + PieChart/BarChart top5

### Rutas Next.js
- `/analitica` — dashboard de analítica y cierre del día

---

## Módulo 7 — Reportería Avanzada y Tiempos de Cocina
**Estado: ✅ Completado**

### Alcance
- Módulo de administración en `/admin/reporteria` con dos pestañas independientes

**Pestaña 1 — Resumen de Ventas**
- Fetch de `pedidos` (estado=pagado) con join nested a `mesas`, `detalles_pedido`, `productos`
- Aplanado cliente-side a líneas individuales (`VentaLinea[]`) — una fila por ítem de pedido
- **Date picker**: Popover + Calendar (shadcn/ui) para rango Desde/Hasta — refetch al cambiar
- **Filtros cliente**: artículo (dropdown populated dinámicamente desde datos), bloque horario (Todo el día / Mañana / Mediodía / Tarde / Noche)
- Tabla: `max-h-[550px] overflow-y-auto`, cabeceras `sticky top-0 bg-white z-10 shadow-sm`, filas `even:bg-slate-50/50`
- Columnas: Fecha (DD/MM/AAAA), Hora (HH:MM), Mesa, Artículo, Cant., Total (L.)
- Barra de resumen: líneas, unidades vendidas, total en L.
- Estado vacío elegante con ícono 🔍

**Pestaña 2 — Control de Tiempos**
- Fetch en dos pasos: pedido IDs en rango → `detalles_pedido` con `estado_cocina='entregado'`
- Columnas: ID Pedido, Mesa, Plato/Bebida, Hora Pedido (HH:MM:SS), Inicio Cocina (`hora_inicio_preparacion`), Hora Entrega (`hora_entregado`), Tiempo Total
- Tiempo Total = `hora_entregado − fecha_creacion` formateado como "X min Ys"
- **Alerta visual**: filas con tiempo > 25 min → `bg-rose-50/70` + Badge "Retrasado" (rose)
- KPIs: platos entregados, tiempo promedio, contador de alertas (tarjeta rose si > 0)
- Filtros: rango de fechas (Popover/Calendar, re-fetch) + mesa (dropdown)
- Leyenda inferior cuando hay filas retrasadas
- Estado vacío elegante con ícono 🔍

### Lógica de datos
- `hora_inicio_preparacion` y `hora_entregado` en `detalles_pedido` son campos opcionales — si son `null` la celda muestra "—" y el Tiempo Total no se calcula
- Tiempo Total = `hora_entregado − pedidos.fecha_creacion` → tiempo total desde apertura hasta entrega al cliente

### SQL necesario en Supabase (ejecutar antes de usar Pestaña 2)
```sql
ALTER TABLE ranchotara.detalles_pedido ADD COLUMN IF NOT EXISTS hora_inicio_preparacion TIMESTAMPTZ;
ALTER TABLE ranchotara.detalles_pedido ADD COLUMN IF NOT EXISTS hora_entregado TIMESTAMPTZ;

-- Trigger recomendado: registrar hora_inicio_preparacion al cambiar a 'en_preparacion'
-- y hora_entregado al cambiar a 'entregado' (puede hacerse también desde la app en MonitorCocina.tsx)
```

### Nuevas dependencias instaladas
- `src/components/ui/calendar.tsx` — shadcn Calendar (usa `react-day-picker`)
- `src/components/ui/popover.tsx` — shadcn Popover (usa `@base-ui/react/popover`)
- `date-fns` v4 — ya estaba en el proyecto, usado para `format(date, "dd/MM/yyyy")`

### Archivos creados / actualizados
- `src/components/reporteria/TabVentas.tsx` — Resumen de Ventas con Popover/Calendar
- `src/components/reporteria/TabTiempos.tsx` — Control de Tiempos con alertas "Retrasado"
- `src/components/reporteria/ReporteriaManager.tsx` — orquestador con shadcn/ui Tabs (`data-active:`)
- `src/app/admin/reporteria/page.tsx` — ruta `/admin/reporteria`
- `src/components/layout/AppSidebar.tsx` — enlace "Reportería" con icono `ClipboardList`

### Rutas Next.js
- `/admin/reporteria` — módulo de reportería (pestañas: Resumen de Ventas / Control de Tiempos)

---

## 🎉 Proyecto Base — Completado

**Todos los módulos funcionales han sido implementados exitosamente.**

El sistema de gestión de restaurante Rancho Tara cubre el ciclo operativo completo:

| Ruta | Módulo | Función |
|------|--------|---------|
| `/admin/articulos` | Módulo 1 | CRUD de categorías y productos con imágenes |
| `/admin/mesas` | Módulo 2 | Configuración administrativa de mesas |
| `/panel` | Módulo 2 | Vista operativa en tiempo real del estado de mesas |
| `/pedidos/[mesa_id]` | Módulo 3 | POS — toma de pedidos y envío a cocina |
| `/pedidos/barra` | Módulo 3+ | POS sin mesa — pedidos de barra |
| `/cocina` | Módulo 4 | KDS — monitor de cocina en tiempo real |
| `/caja` | Módulo 5 | Cobro de cuentas pendientes y liberación de mesas |
| `/analitica` | Módulo 6 | Cierre del día y analítica histórica con gráficos |
| `/admin/reporteria` | Módulo 7 | Reportería avanzada: ventas detalladas y tiempos de cocina |

### Flujo operativo completo
1. **Administración** → configurar mesas y carta en `/admin`
2. **Apertura** → el panel `/panel` muestra mesas libres en tiempo real
3. **Pedido** → mesero abre `/pedidos/[mesa]`, selecciona platos y envía a cocina
4. **Cocina** → `/cocina` muestra comandas; cocinero marca ítems como listos y entregados
5. **Cobro** → cajero abre `/caja`, selecciona cuenta, elige método de pago y confirma
6. **Cierre** → `/analitica` muestra KPIs del día, desglose por método, platos más vendidos y patrones de tráfico

---

## Convenciones del Proyecto

### Estructura de carpetas
```
src/
  app/                   # Rutas Next.js (App Router)
    (dashboard)/         # Grupo con layout principal (sidebar + nav)
    cocina/              # Sin sidebar (pantalla dedicada)
    ...
  components/
    ui/                  # shadcn/ui components
    layout/              # Sidebar, Header, Nav
    articulos/           # Componentes del Módulo 1
    pedidos/             # Componentes del Módulo 3
    cocina/              # Componentes del Módulo 4
    pagos/               # Componentes del Módulo 5
    cierre/              # Componentes del Módulo 6
  lib/
    supabase.ts          # Cliente Supabase (schema: ranchotara)
    utils.ts             # Utilidades generales
  hooks/                 # Custom hooks
  types/                 # TypeScript types/interfaces
```

### Reglas de desarrollo
- **Cero mock data** — todos los datos desde Supabase real
- Server Components por defecto; `"use client"` solo cuando necesario
- Moneda: Lempiras hondureños (HNL) — formato: `L 0,000.00`
- Imágenes: Supabase Storage, bucket `menu-images`
- Todos los componentes en español
- shadcn/ui como base de UI; extender con clases Tailwind de la paleta
- **Mobile-First**: clases base para móvil, `md:` y `lg:` para escritorio

---

## Soporte Mobile-First
**Estado: ✅ Implementado**

La aplicación cuenta con soporte completo para dispositivos móviles manteniendo la paleta "Minimalismo Botánico".

### Navegación
| Dispositivo | Navegación |
|-------------|-----------|
| Móvil (`< md`) | `MobileBottomNav` — barra inferior fija con gradiente oscuro, 5 atajos: Inicio · Mesas · Cocina · Caja · Reportes |
| Desktop (`≥ md`) | `AppSidebar` — barra lateral expandible/colapsable |
- Archivos: `src/components/layout/MobileBottomNav.tsx`, `src/components/layout/AppSidebar.tsx`
- El POS (`/pedidos/*`) oculta la bottom nav automáticamente (tiene su propia barra)

### POS / Toma de Pedidos
- Catálogo: `grid-cols-2` en móvil, `sm:grid-cols-3 lg:grid-cols-4` en desktop
- Carrito: Sheet desde abajo (`side="bottom"`, `h-[88vh]`, `rounded-t-2xl`) — se activa con el botón "Comandar" de la barra inferior
- Barra "Comandar": `fixed bottom-0 w-full`, siempre visible, muestra total

### Monitor de Cocina
- Grid: `grid-cols-1` en móvil, `md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Botones de ítem (Marcar Listo / Entregar): `w-full` en móvil, `sm:w-auto` en desktop
- Layout de ítem: `flex-col` en móvil, `sm:flex-row` en desktop
- Área táctil mínima: `min-h-[44px]`

### Tablas (Módulo 1, 6, 7)
- Todas las tablas envueltas en `overflow-x-auto` para swipe horizontal táctil
- `min-w-[400px]` en tablas para mantener legibilidad

### Reportería (Módulo 7)
- Filtros en móvil: ocultos detrás de botón "Filtros" + Sheet desde abajo
- Indicador visual (punto verde) cuando hay filtros activos
- Filtros en desktop: grid inline como antes

### KPIs y Cards
- `SeccionHoy` (Analítica): `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (ya tenía esto)
- `TabTiempos`: 3 KPIs en `grid-cols-3` — se mantienen por ser cortos

### Usabilidad Táctil
- Inputs y Selects: `h-9` base, `h-11` en drawers móviles
- Botones de acción: todos con `min-h-[44px]` o mayor
- Texto mínimo: `text-sm` en todos los inputs (evita zoom en iOS/Android)

---

## Historial de Cambios

| Fecha | Cambio |
|-------|--------|
| 2026-05-27 | **Caja — Calculadora y vuelto.** `ModalPago.tsx` reescrito. Nuevo campo "Monto recibido del cliente": input con prefijo L., atajos de denominaciones (billetes ≥ total, máx 4), botón "Cobro exacto", tarjeta de resultado en verde (vuelto o "✓ Exacto") o rojo (monto insuficiente). Nueva calculadora desplegable ("Calc." en header): hook `useCalculadora` con operadores +/−/×/÷, botón "Cargar total", vuelto automático cuando resultado > total. Layout modal reestructurado: `max-h-[95vh] flex flex-col`, zona scrollable `overflow-y-auto flex-1`, botones de acción fijos `shrink-0 border-t`. |
| 2026-05-27 | **Refactorización Mobile-First completa.** Bottom Navigation Bar en móvil (`MobileBottomNav.tsx`) con gradiente del sidebar. Sidebar lateral oculto en móvil (`hidden md:flex`). POS: Sheet del carrito desde abajo (`side="bottom"`, `h-[88vh]`). Cocina: botones de acción `w-full` en móvil, layout ítem en columna. Módulo 7 (Reportería): filtros ocultos detrás de botón "Filtros" + Sheet en móvil. Tablas envueltas en `overflow-x-auto`: Productos y Analítica. KPIs de Analítica apilados en móvil. Padding `p-4 md:p-8` en módulos admin. Área táctil mínima `min-h-[44px]` garantizada en botones críticos. |
| 2026-05-27 | **Módulo 7 completado (v2).** Reportería `/admin/reporteria` rediseñada. Pestaña 1 "Resumen de Ventas": date picker Popover+Calendar, filtro artículo+horario, tabla sticky headers `max-h-[550px]`. Pestaña 2 "Control de Tiempos": columnas `hora_inicio_preparacion`+`hora_entregado`, Badge "Retrasado" (rose) para >25 min, KPIs promedio+alertas. Instalados `calendar.tsx` y `popover.tsx` de shadcn. |
| 2026-05-27 | **KDS mejorado.** Badges shadcn/ui en dos niveles (comanda + ítem): amber=en cola, azul=cocinando, emerald=listo, slate=entregado. Monitor dividido en secciones "En Cola" / "Cocinando" con contadores en tiempo real. Documentados campos de tiempo exacto (`fecha_creacion`, `hora_listo`, `fecha_pago`) y métricas derivables para analítica futura. |
| 2026-05-27 | **Pedido en Barra.** Ruta `/pedidos/barra` — POS sin mesa asociada (`mesa_id = null`). Toast de confirmación al enviar, reseteo automático del carrito para pedidos consecutivos. Acceso desde sidebar y botón en Panel de Mesas. |
| 2026-05-26 | Setup inicial: Next.js 16, Tailwind v4, shadcn/ui v4.7, Supabase client, PLAN.MD |
| 2026-05-26 | **Rediseño POS.** Paleta global → slate-50/white/emerald-500. MapaMesas: tabs zona, cards Lucide + indicador tiempo. POS: header+search+category tabs+sticky "Comandar"+Sheet carrito. Cards 70% imagen / 30% franja oscura con precio. |
| 2026-05-26 | **Módulo 1 — Storage nativo.** Campo URL de imagen reemplazado por input file con upload directo al bucket `ranchotara` de Supabase Storage. Preview en vivo, spinner de subida, bloqueo anti-doble-envío. |
| 2026-05-26 | **Módulo 6 completado.** Analítica `/analitica` — KPIs diarios, desglose métodos, tabla platos hoy, BarChart 30 días, PieChart top5, insights hora pico y día pico. Recharts instalado. |
| 2026-05-26 | **Módulo 5 completado.** Caja `/caja` — CajaMonitor (fetch+Realtime), CuentaCard (mesa+total), ModalPago (método selector), transacción UPDATE pedidos+mesas al cobrar. |
| 2026-05-26 | **Módulo 4 completado.** KDS `/cocina` — layout oscuro, MonitorCocina (fetch+Realtime+auto-cierre), ComandaCard (ítem buttons, urgency alert). |
| 2026-05-26 | **Módulo 3 completado.** POS `/pedidos/[mesa_id]` — catálogo búsqueda+grid, carrito con ±, flujo Supabase: INSERT pedido → INSERT detalles → UPDATE mesa → redirect /panel. |
| 2026-05-26 | **Módulo 2 completado.** `/admin/mesas` (CRUD mesas), `/panel` (grid Realtime, Dialog con cambio de estado). Tipo `Mesa` y `EstadoMesa` añadidos. |
| 2026-05-26 | **Módulo 1 completado.** Archivos creados: `src/types/database.ts`, `src/components/ui/switch.tsx`, `src/components/ui/table.tsx`, `src/components/admin/AdminNav.tsx`, `src/app/admin/layout.tsx`, `src/app/admin/articulos/page.tsx`, `src/components/articulos/ArticulosManager.tsx`, `src/components/articulos/CategoriasPanel.tsx`, `src/components/articulos/ProductosPanel.tsx`. Ruta: `/admin/articulos`. |
