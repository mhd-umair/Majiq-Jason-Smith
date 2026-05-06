import * as React from "react";
import Link from "next/link";
import { cn, formatCompactCurrency, formatCompactNumber } from "@/lib/utils";

interface HorizontalBarsProps {
  data: Array<{ label: string; value: number; href?: string; sublabel?: string }>;
  valueFormat?: "currency" | "number";
  emptyText?: string;
  className?: string;
  maxItems?: number;
}

export function HorizontalBars({
  data,
  valueFormat = "currency",
  emptyText = "No data",
  className,
  maxItems = 10,
}: HorizontalBarsProps) {
  const items = data.slice(0, maxItems);
  const max = Math.max(0, ...items.map((d) => d.value ?? 0));
  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyText}</div>;
  }
  const fmt = valueFormat === "currency" ? formatCompactCurrency : formatCompactNumber;
  return (
    <ul className={cn("flex flex-col gap-1.5", className)}>
      {items.map((d) => {
        const pct = max > 0 ? Math.max(2, (d.value / max) * 100) : 0;
        const Wrapper = (d.href ? Link : "div") as React.ElementType;
        const wrapperProps = d.href ? { href: d.href } : {};
        return (
          <li key={d.label}>
            <Wrapper
              {...wrapperProps}
              className={cn(
                "block rounded-md border bg-background px-3 py-2 transition-colors",
                d.href && "hover:border-primary/50 hover:bg-accent",
              )}
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1 truncate font-medium" title={d.label}>
                  {d.label}
                </div>
                <div className="flex-shrink-0 text-xs font-semibold tabular-nums">
                  {fmt(d.value)}
                </div>
              </div>
              {d.sublabel ? (
                <div className="text-xs text-muted-foreground">{d.sublabel}</div>
              ) : null}
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Wrapper>
          </li>
        );
      })}
    </ul>
  );
}
