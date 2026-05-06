export const POSTED_STATUSES = ["finalized", "archived"] as const;
export const NON_POSTED_STATUSES = ["voided", "quote", "committed", "draft"] as const;

export const INVOICE_TYPE_LABELS: Record<string, string> = {
  in: "Sales",
  wo: "Service",
  rl: "Rental",
};

export const STOCK_STATUS_LABELS: Record<string, string> = {
  instock: "In stock",
  customer: "Sold / customer",
  expected: "On order",
};

export const POSTED_FILTER = `Status IN ('finalized','archived')`;

/** Use {@link postedStatusSql} from `@/lib/posted-preference` for UI-driven finalized vs archived+finalized. */
