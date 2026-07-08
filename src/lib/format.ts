/** Formatea un número con 2 decimales en localización es-HN (ej. 1,234.50). */
export const fmtL = (n: number): string =>
  new Intl.NumberFormat("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/** Formatea un monto en Lempiras con prefijo (ej. "L. 1,234.50"). */
export const fmtLps = (n: number): string => `L. ${fmtL(n)}`;
