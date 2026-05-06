import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
  finalized: "success",
  archived: "secondary",
  voided: "destructive",
  quote: "warning",
  committed: "warning",
  draft: "outline",
};

const TYPE_LABEL: Record<string, string> = {
  in: "Sales",
  wo: "Service",
  rl: "Rental",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "outline"} className="capitalize">
      {status}
    </Badge>
  );
}

export function InvoiceTypeBadge({ type }: { type: string }) {
  return <Badge variant="outline">{TYPE_LABEL[type] ?? type}</Badge>;
}
