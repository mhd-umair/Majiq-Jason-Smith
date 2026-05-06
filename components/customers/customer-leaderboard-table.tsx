"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { DataTable } from "@/components/dashboard/data-table";
import { formatCurrency } from "@/lib/utils";
import type { CustomerLeaderboardRow } from "@/lib/queries/customers";

export function CustomerLeaderboardTable({ rows }: { rows: CustomerLeaderboardRow[] }) {
  const columns: ColumnDef<CustomerLeaderboardRow, unknown>[] = React.useMemo(
    () => [
      {
        accessorKey: "customerName",
        header: "Customer",
        cell: ({ row }) => (
          <Link href={`/customers/${row.original.customerId}`} className="font-medium hover:underline">
            {row.original.customerName}
            <div className="text-xs font-normal text-muted-foreground">{row.original.customerNo}</div>
          </Link>
        ),
      },
      {
        accessorKey: "revenue12mo",
        header: () => <span className="text-right">12 mo revenue</span>,
        cell: ({ getValue }) => (
          <div className="text-right tabular-nums">{formatCurrency(Number(getValue() ?? 0))}</div>
        ),
      },
      {
        accessorKey: "invoices12mo",
        header: () => <span className="text-right">Invoices</span>,
        cell: ({ getValue }) => (
          <div className="text-right tabular-nums">{Number(getValue() ?? 0)}</div>
        ),
      },
      {
        accessorKey: "avgInvoice12mo",
        header: () => <span className="text-right">Avg invoice</span>,
        cell: ({ getValue }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(Number(getValue() ?? 0), { fractional: true })}
          </div>
        ),
      },
      {
        accessorKey: "lastPurchase",
        header: "Last purchase",
        cell: ({ getValue }) => {
          const v = String(getValue() ?? "");
          if (!v) return "—";
          const day = v.slice(0, 10);
          try {
            return <span className="tabular-nums text-sm">{format(parseISO(day), "MMM d, yyyy")}</span>;
          } catch {
            return v;
          }
        },
      },
    ],
    [],
  );

  return (
    <DataTable
      data={rows}
      columns={columns}
      pageSize={25}
      filterPlaceholder="Filter by name or customer #…"
      filterColumn="customerName"
      emptyText="No customers with posted activity in the leaderboard window."
    />
  );
}
