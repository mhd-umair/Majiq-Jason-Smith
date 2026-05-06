"use client";

import * as React from "react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCurrency, formatCompactNumber } from "@/lib/utils";

export interface BarSeries {
  dataKey: string;
  label: string;
  color?: string;
}

interface BarChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: BarSeries[];
  height?: number;
  valueFormat?: "currency" | "number";
  onBarClick?: (datum: Record<string, string | number>) => void;
  stacked?: boolean;
  xTickFormatter?: (value: string | number) => string;
}

const DEFAULT_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
];

export function BarChart({
  data,
  xKey,
  series,
  height = 280,
  valueFormat = "number",
  onBarClick,
  stacked = false,
  xTickFormatter,
}: BarChartProps) {
  const fmt = valueFormat === "currency" ? formatCompactCurrency : formatCompactNumber;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickFormatter={xTickFormatter}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickFormatter={(v) => fmt(Number(v))}
          width={56}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--accent))" }}
          contentStyle={{
            background: "hsl(var(--popover))",
            borderColor: "hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value, name) => [fmt(Number(value)), String(name)]}
        />
        {series.map((s, i) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.label}
            stackId={stacked ? "stack" : undefined}
            fill={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
            radius={[4, 4, 0, 0]}
            onClick={(d) => onBarClick?.(d.payload as Record<string, string | number>)}
            cursor={onBarClick ? "pointer" : "default"}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
