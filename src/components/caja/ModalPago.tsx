"use client";

import { useState, useCallback } from "react";
import { Calculator, Delete } from "lucide-react";
import type { MetodoPago } from "@/types/database";
import type { CuentaPendiente } from "./CajaMonitor";

/* ── Métodos de pago ────────────────────────────────────────────── */
const METODOS: { value: MetodoPago; label: string; emoji: string; desc: string }[] = [
  { value: "efectivo",      label: "Efectivo",      emoji: "💵", desc: "Pago en billetes o monedas" },
  { value: "tarjeta",       label: "Tarjeta",        emoji: "💳", desc: "Débito o crédito" },
  { value: "transferencia", label: "Transferencia",  emoji: "📲", desc: "Transferencia bancaria" },
];

/* ── Denominaciones de billetes hondureños ──────────────────────── */
const BILLETES = [20, 50, 100, 200, 500, 1000];

/* ── Lógica de calculadora ──────────────────────────────────────── */
type CalcState = {
  display: string;
  pending: number | null;
  operator: string | null;
  fresh: boolean;
};

const CALC_INIT: CalcState = { display: "0", pending: null, operator: null, fresh: false };

const fmtCalc = (n: number) =>
  new Intl.NumberFormat("es-HN", { minimumFractionDigits: 0, maximumFractionDigits: 6 }).format(n);

function applyOp(a: number, op: string, b: number): number {
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "×") return a * b;
  if (op === "÷") return b !== 0 ? a / b : 0;
  return b;
}

function useCalculadora(totalCuenta: number) {
  const [calc, setCalc] = useState<CalcState>(CALC_INIT);

  const pressDigit = useCallback((d: string) => {
    setCalc((prev) => {
      if (prev.fresh) return { ...prev, display: d === "." ? "0." : d, fresh: false };
      if (prev.display === "0" && d !== ".") return { ...prev, display: d };
      if (d === "." && prev.display.includes(".")) return prev;
      return { ...prev, display: prev.display + d };
    });
  }, []);

  const pressOp = useCallback((op: string) => {
    setCalc((prev) => {
      const current = parseFloat(prev.display.replace(/,/g, "")) || 0;
      if (prev.operator && !prev.fresh) {
        const result = applyOp(prev.pending!, prev.operator, current);
        return { display: fmtCalc(result), pending: result, operator: op, fresh: true };
      }
      return { ...prev, pending: current, operator: op, fresh: true };
    });
  }, []);

  const pressEquals = useCallback(() => {
    setCalc((prev) => {
      if (!prev.operator || prev.pending === null) return prev;
      const current = parseFloat(prev.display.replace(/,/g, "")) || 0;
      const result = applyOp(prev.pending, prev.operator, current);
      return { display: fmtCalc(result), pending: null, operator: null, fresh: true };
    });
  }, []);

  const pressClear = useCallback(() => setCalc(CALC_INIT), []);

  const pressBack = useCallback(() => {
    setCalc((prev) => {
      if (prev.fresh || prev.display.length <= 1) return { ...prev, display: "0", fresh: false };
      return { ...prev, display: prev.display.slice(0, -1) };
    });
  }, []);

  const loadTotal = useCallback(() => {
    setCalc({ display: fmtCalc(totalCuenta), pending: null, operator: null, fresh: true });
  }, [totalCuenta]);

  /* Vuelto simple: resultado sin operador pendiente vs total */
  const calcResult = calc.operator === null && calc.pending === null
    ? parseFloat(calc.display.replace(/,/g, "")) || 0
    : null;
  const vueltoCalc = calcResult !== null && calcResult > totalCuenta
    ? calcResult - totalCuenta
    : null;

  return { calc, pressDigit, pressOp, pressEquals, pressClear, pressBack, loadTotal, vueltoCalc };
}

/* ── Helpers de formato ─────────────────────────────────────────── */
const fmtL = (n: number) =>
  new Intl.NumberFormat("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/* ── Estilos botón calculadora ──────────────────────────────────── */
const BTN =
  "flex items-center justify-center h-12 rounded-xl font-semibold text-base transition-all active:scale-95 select-none focus:outline-none";

/* ── Props ──────────────────────────────────────────────────────── */
type Props = {
  cuenta: CuentaPendiente;
  procesando: boolean;
  onConfirmar: (metodo: MetodoPago) => Promise<void>;
  onClose: () => void;
};

/* ── Componente ─────────────────────────────────────────────────── */
export function ModalPago({ cuenta, procesando, onConfirmar, onClose }: Props) {
  const [metodo, setMetodo]     = useState<MetodoPago>("efectivo");
  const [showCalc, setShowCalc] = useState(false);

  /* Monto recibido del cliente */
  const [montoRecibido, setMontoRecibido] = useState("");

  const total = cuenta.total ?? 0;
  const { calc, pressDigit, pressOp, pressEquals, pressClear, pressBack, loadTotal, vueltoCalc } =
    useCalculadora(total);

  /* Vuelto a partir del campo de monto recibido */
  const montoNum     = parseFloat(montoRecibido.replace(/,/g, "")) || 0;
  const vuelto       = montoNum >= total ? montoNum - total : null;
  const pagoExacto   = montoNum === total;
  const montoInvalid = montoNum > 0 && montoNum < total;

  const mesa = cuenta.mesas?.numero_mesa ?? "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !procesando) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden max-h-[95vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Registrar Pago</p>
            <p className="text-lg font-bold text-foreground">Mesa {mesa}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCalc((v) => !v)}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                showCalc
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                  : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200",
              ].join(" ")}
              title="Abrir calculadora"
            >
              <Calculator className="w-3.5 h-3.5" />
              Calc.
            </button>
            <button
              onClick={onClose}
              disabled={procesando}
              className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none disabled:opacity-40"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Scroll area ── */}
        <div className="overflow-y-auto flex-1">

          {/* Total destacado */}
          <div className="px-6 py-5 bg-primary/5 border-b border-border text-center">
            <p className="text-xs text-muted-foreground mb-1">Total a cobrar</p>
            <p className="text-4xl font-black text-primary">L. {fmtL(total)}</p>
          </div>

          {/* ── Sección monto recibido ── */}
          <div className="px-6 py-4 border-b border-border space-y-3">
            <p className="text-sm font-semibold text-foreground">Monto recibido del cliente</p>

            {/* Input numérico */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">L.</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={fmtL(total)}
                value={montoRecibido}
                onChange={(e) => setMontoRecibido(e.target.value)}
                className={[
                  "w-full pl-9 pr-4 h-12 rounded-xl border text-base font-semibold text-slate-800 bg-slate-50 transition-colors focus:outline-none focus:ring-2",
                  montoInvalid
                    ? "border-red-300 focus:ring-red-400/30"
                    : pagoExacto
                    ? "border-emerald-400 bg-emerald-50 focus:ring-emerald-400/30"
                    : "border-slate-200 focus:ring-primary/30",
                ].join(" ")}
              />
            </div>

            {/* Atajos de billetes */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setMontoRecibido(String(total))}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                Cobro exacto
              </button>
              {BILLETES.filter((b) => b >= total).slice(0, 4).map((b) => (
                <button
                  key={b}
                  onClick={() => setMontoRecibido(String(b))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  L. {b}
                </button>
              ))}
            </div>

            {/* Resultado */}
            {montoRecibido !== "" && (
              <div className={[
                "flex items-center justify-between rounded-xl px-4 py-3 border",
                vuelto !== null
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-red-50 border-red-200",
              ].join(" ")}>
                {vuelto !== null ? (
                  <>
                    <div>
                      <p className="text-xs text-emerald-600 font-medium">
                        {pagoExacto ? "Pago exacto" : "Vuelto a devolver"}
                      </p>
                      {!pagoExacto && (
                        <p className="text-xs text-emerald-500 mt-0.5">
                          L. {fmtL(montoNum)} − L. {fmtL(total)}
                        </p>
                      )}
                    </div>
                    <p className="text-xl font-black text-emerald-700">
                      {pagoExacto ? "✓ Exacto" : `L. ${fmtL(vuelto)}`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-red-600 font-medium">Monto insuficiente</p>
                    <p className="text-sm font-bold text-red-600">
                      Faltan L. {fmtL(total - montoNum)}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Calculadora ── */}
          {showCalc && (
            <div className="border-b border-border bg-slate-50 px-4 py-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Calculadora</p>

              {/* Display */}
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 min-h-[64px] flex flex-col items-end justify-end shadow-inner overflow-hidden">
                {calc.operator && (
                  <p className="text-xs text-slate-400 font-mono">
                    {fmtCalc(calc.pending!)} {calc.operator}
                  </p>
                )}
                <p className="text-2xl font-black font-mono text-slate-800 tabular-nums leading-tight truncate max-w-full">
                  {calc.display}
                </p>
                {vueltoCalc !== null && (
                  <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                    Vuelto: L. {fmtL(vueltoCalc)}
                  </p>
                )}
              </div>

              {/* Botón cargar total */}
              <button
                onClick={loadTotal}
                className="w-full h-9 rounded-lg bg-primary/10 border border-primary/30 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                ← Cargar total (L. {fmtL(total)})
              </button>

              {/* Teclado */}
              <div className="grid grid-cols-4 gap-2">
                <button onClick={pressClear}           className={`${BTN} col-span-2 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-sm`}>C Limpiar</button>
                <button onClick={pressBack}            className={`${BTN} bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200`}><Delete className="w-4 h-4" /></button>
                <button onClick={() => pressOp("÷")}   className={`${BTN} ${calc.operator === "÷" ? "bg-emerald-500 text-white" : "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"}`}>÷</button>

                <button onClick={() => pressDigit("7")} className={`${BTN} bg-white border border-slate-200 text-slate-800 hover:bg-slate-50`}>7</button>
                <button onClick={() => pressDigit("8")} className={`${BTN} bg-white border border-slate-200 text-slate-800 hover:bg-slate-50`}>8</button>
                <button onClick={() => pressDigit("9")} className={`${BTN} bg-white border border-slate-200 text-slate-800 hover:bg-slate-50`}>9</button>
                <button onClick={() => pressOp("×")}    className={`${BTN} ${calc.operator === "×" ? "bg-emerald-500 text-white" : "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"}`}>×</button>

                <button onClick={() => pressDigit("4")} className={`${BTN} bg-white border border-slate-200 text-slate-800 hover:bg-slate-50`}>4</button>
                <button onClick={() => pressDigit("5")} className={`${BTN} bg-white border border-slate-200 text-slate-800 hover:bg-slate-50`}>5</button>
                <button onClick={() => pressDigit("6")} className={`${BTN} bg-white border border-slate-200 text-slate-800 hover:bg-slate-50`}>6</button>
                <button onClick={() => pressOp("-")}    className={`${BTN} ${calc.operator === "-" ? "bg-emerald-500 text-white" : "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"}`}>−</button>

                <button onClick={() => pressDigit("1")} className={`${BTN} bg-white border border-slate-200 text-slate-800 hover:bg-slate-50`}>1</button>
                <button onClick={() => pressDigit("2")} className={`${BTN} bg-white border border-slate-200 text-slate-800 hover:bg-slate-50`}>2</button>
                <button onClick={() => pressDigit("3")} className={`${BTN} bg-white border border-slate-200 text-slate-800 hover:bg-slate-50`}>3</button>
                <button onClick={() => pressOp("+")}    className={`${BTN} ${calc.operator === "+" ? "bg-emerald-500 text-white" : "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"}`}>+</button>

                <button onClick={() => pressDigit("0")} className={`${BTN} col-span-2 bg-white border border-slate-200 text-slate-800 hover:bg-slate-50`}>0</button>
                <button onClick={() => pressDigit(".")} className={`${BTN} bg-white border border-slate-200 text-slate-800 hover:bg-slate-50`}>.</button>
                <button onClick={pressEquals}           className={`${BTN} bg-emerald-500 text-white hover:bg-emerald-600`}>=</button>
              </div>
            </div>
          )}

          {/* ── Método de pago ── */}
          <div className="px-6 py-5">
            <p className="text-sm font-semibold text-foreground mb-3">Método de pago</p>
            <div className="flex flex-col gap-2">
              {METODOS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMetodo(m.value)}
                  disabled={procesando}
                  className={[
                    "flex items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    metodo === m.value
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-background hover:border-primary/40 hover:bg-primary/5",
                  ].join(" ")}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                  <span className={["w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0", metodo === m.value ? "border-primary" : "border-muted-foreground/40"].join(" ")}>
                    {metodo === m.value && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Acciones fijas ── */}
        <div className="px-6 pb-6 pt-3 border-t border-border flex gap-3 shrink-0 bg-card">
          <button
            onClick={onClose}
            disabled={procesando}
            className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(metodo)}
            disabled={procesando}
            className="flex-[2] rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {procesando ? "Registrando..." : "✓ Registrar Pago"}
          </button>
        </div>
      </div>
    </div>
  );
}
