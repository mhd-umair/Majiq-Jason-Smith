"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCurrency, formatCompactNumber } from "@/lib/utils";

export interface LineSeries {
  dataKey: string;
  label: string;
  color?: string;
  area?: boolean;
}

interface LineChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: LineSeries[];
  height?: number;
  valueFormat?: "currency" | "number";
  xTickFormatter?: (value: string | number) => string;
}

const DEFAULT_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
];

export function LineChart({
  data,
  xKey,
  series,
  height = 280,
  valueFormat = "number",
  xTickFormatter,
}: LineChartProps) {
  const fmt = valueFormat === "currency" ? formatCompactCurrency : formatCompactNumber;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
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
          contentStyle={{
            background: "hsl(var(--popover))",
            borderColor: "hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value, name) => [fmt(Number(value)), String(name)]}
        />
        {series.map((s, i) => {
          const color = s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          return s.area ? (
            <Area
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.label}
              type="monotone"
              fill={color}
              fillOpacity={0.15}
              stroke={color}
              strokeWidth={2}
            />
          ) : (
            <Line
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.label}
              type="monotone"
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
