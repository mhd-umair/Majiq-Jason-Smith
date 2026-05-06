"use client";

/**
 * Placeholder for a future date-range filter. The MVP uses fixed trailing windows
 * aligned to the dataset "as of" date from the server.
 */
export function DateRangePickerPlaceholder({ label }: { label?: string }) {
  return (
    <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      {label ?? "Date range filters can be added here; KPIs use trailing windows from data as-of."}
    </div>
  );
}
