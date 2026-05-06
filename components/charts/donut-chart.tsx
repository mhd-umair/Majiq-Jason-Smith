"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCompactCurrency, formatCompactNumber, formatNumber } from "@/lib/utils";

interface DonutChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
  valueFormat?: "currency" | "number";
  innerRadius?: number;
  outerRadius?: number;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
];

export function DonutChart({
  data,
  height = 240,
  valueFormat = "number",
  innerRadius = 60,
  outerRadius = 90,
}: DonutChartProps) {
  const fmt = valueFormat === "currency" ? formatCompactCurrency : formatCompactNumber;
  const total = data.reduce((s, d) => s + (d.value ?? 0), 0);
  return (
    <div className="@container w-full min-w-0">
      <div className="flex flex-col items-stretch gap-4 @min-[32rem]:flex-row @min-[32rem]:items-center">
        <div className="mx-auto w-full max-w-[220px] shrink-0 @min-[32rem]:mx-0">
          <ResponsiveContainer width="100%" height={height} minWidth={0}>
          <PieChart>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                borderColor: "hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => fmt(Number(value))}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        </div>
        <ul className="min-w-0 flex-1 grid grid-cols-1 gap-2 text-sm @min-[32rem]:grid-cols-2">
        {data.map((d, i) => (
          <li
            key={d.name}
            className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-md border bg-background/40 px-3 py-2"
          >
            <div className="flex min-w-0 max-w-full items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="min-w-0 break-words" title={d.name}>
                {d.name}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{fmt(d.value)}</span>
              <span>{total > 0 ? `(${((d.value / total) * 100).toFixed(0)}%)` : ""}</span>
            </div>
          </li>
        ))}
        {data.length === 0 ? (
          <li className="text-sm text-muted-foreground">No data</li>
        ) : null}
        {data.length > 0 ? (
          <li className="col-span-full mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Total</span>
            <span className="font-medium text-foreground">
              {valueFormat === "currency" ? formatCompactCurrency(total) : formatNumber(total)}
            </span>
          </li>
        ) : null}
        </ul>
      </div>
    </div>
  );
}
