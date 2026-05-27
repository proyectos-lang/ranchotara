"use client";

import * as React from "react";
import { ResponsiveContainer, Tooltip, type TooltipProps } from "recharts";
import { cn } from "@/lib/utils";

/* ── Colores del tema (alineados con globals.css) ──────────────── */
export const CHART_COLORS = [
  "oklch(0.42 0.085 45)",  // chart-1 café
  "oklch(0.55 0.07 50)",   // chart-2
  "oklch(0.72 0.07 62)",   // chart-3 dorado
  "oklch(0.82 0.04 75)",   // chart-4 beige
  "oklch(0.35 0.06 45)",   // chart-5 café oscuro
];

/* ── ChartContainer ────────────────────────────────────────────── */
type ChartContainerProps = {
  children: React.ReactElement;
  className?: string;
  height?: number;
};

export function ChartContainer({ children, className, height = 300 }: ChartContainerProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/* ── ChartTooltipContent ───────────────────────────────────────── */
type TooltipEntry = { value?: number | string; name?: string; color?: string };

type ChartTooltipContentProps = {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  formatter?: (value: number, name: string) => [string, string];
  labelFormatter?: (label: string) => string;
};

export function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg text-xs">
      {label !== undefined && (
        <p className="font-semibold text-foreground mb-1.5">
          {labelFormatter ? labelFormatter(String(label)) : String(label)}
        </p>
      )}
      {payload.map((entry, i) => {
        const rawVal = typeof entry.value === "number" ? entry.value : 0;
        const rawName = entry.name ?? "";
        const [fVal, fName] = formatter ? formatter(rawVal, rawName) : [String(rawVal), rawName];
        return (
          <div key={i} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: entry.color }}
            />
            <span className="text-muted-foreground">{fName}:</span>
            <span className="font-semibold text-foreground">{fVal}</span>
          </div>
        );
      })}
    </div>
  );
}

export { Tooltip as ChartTooltip };
