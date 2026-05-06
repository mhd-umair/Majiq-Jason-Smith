import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import { cn, formatDelta } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  helpText?: string;
  accent?: "default" | "success" | "warning" | "destructive";
}

export function KpiCard({ label, value, hint, delta, helpText, accent = "default" }: KpiCardProps) {
  const deltaText = formatDelta(delta);
  const deltaPositive = (delta ?? 0) > 0;
  const deltaNegative = (delta ?? 0) < 0;
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span>{label}</span>
            {helpText ? (
              <span
                title={helpText}
                aria-label={helpText}
                className="cursor-help text-muted-foreground/60"
              >
                <Info className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </div>
          {deltaText ? (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-xs font-medium",
                deltaPositive && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                deltaNegative && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                !deltaPositive && !deltaNegative && "bg-muted text-muted-foreground",
              )}
            >
              {deltaText}
            </span>
          ) : null}
        </div>
        <div
          className={cn(
            "mt-2 text-3xl font-semibold tracking-tight",
            accent === "destructive" && "text-rose-600 dark:text-rose-400",
            accent === "warning" && "text-amber-600 dark:text-amber-400",
            accent === "success" && "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {value}
        </div>
        {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}
