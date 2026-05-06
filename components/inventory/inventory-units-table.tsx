"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/dashboard/data-table";
import { formatCurrency } from "@/lib/utils";
import type { UnitListRow } from "@/lib/queries/units";

export function InventoryUnitsTable({ rows }: { rows: UnitListRow[] }) {
  const columns: ColumnDef<UnitListRow, unknown>[] = React.useMemo(
    () => [
      {
        accessorKey: "stockNo",
        header: "Stock #",
        cell: ({ row }) => (
          <Link href={`/inventory/${row.original.unitId}`} className="font-mono text-sm text-primary hover:underline">
            {row.original.stockNo}
          </Link>
        ),
      },
      {
        accessorKey: "make",
        header: "Make / model",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.make}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.model} {row.original.year}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ getValue }) => <span className="text-sm">{String(getValue() ?? "—")}</span>,
      },
      {
        accessorKey: "condition",
        header: "Condition",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.condition ?? "—"}
            {row.original.isNew === 1 ? (
              <span className="ml-1 text-xs text-muted-foreground">(new)</span>
            ) : null}
          </span>
        ),
      },
      {
        accessorKey: "daysInStock",
        header: () => <span className="text-right">Days</span>,
        cell: ({ getValue }) => (
          <div className="text-right tabular-nums text-sm">{getValue() != null ? String(getValue()) : "—"}</div>
        ),
      },
      {
        accessorKey: "baseRetail",
        header: () => <span className="text-right">Retail</span>,
        cell: ({ getValue }) => (
          <div className="text-right tabular-nums text-sm">{formatCurrency(Number(getValue() ?? 0))}</div>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      data={rows}
      columns={columns}
      pageSize={20}
      filterPlaceholder="Filter stock #, make, model…"
      filterColumn="stockNo"
      emptyText="No in-stock units."
    />
  );
}
