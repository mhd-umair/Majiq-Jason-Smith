"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { setIncludeArchived } from "@/app/actions/posted-preference";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  includeArchived: boolean;
}

export function IncludeArchivedToggle({ includeArchived }: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const toggle = async () => {
    setPending(true);
    try {
      await setIncludeArchived(!includeArchived);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={includeArchived ? "secondary" : "outline"}
            size="sm"
            className={cn(
              "flex h-9 gap-1.5 px-2.5 text-xs font-normal",
              !includeArchived && "border-amber-500/50 bg-amber-500/5 text-amber-900 dark:text-amber-200",
            )}
            disabled={pending}
            onClick={toggle}
            aria-pressed={includeArchived}
            aria-label={
              includeArchived
                ? "Posted totals include archived invoices. Click to use finalized invoices only."
                : "Posted totals use finalized invoices only. Click to include archived invoices."
            }
          >
            <Archive className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="whitespace-nowrap text-left leading-tight">
              {includeArchived ? "Archived included" : "Finalized only"}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {includeArchived ? (
            <>
              <strong>Archived included:</strong> posted revenue and related metrics count both{" "}
              <strong>finalized</strong> and <strong>archived</strong> invoices. Click to show{" "}
              <strong>finalized</strong> invoices only.
            </>
          ) : (
            <>
              <strong>Finalized only:</strong> archived invoices are excluded from posted revenue and related
              views. Click to include <strong>archived</strong> again alongside finalized.
            </>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
