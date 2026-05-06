"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { DataTable } from "@/components/dashboard/data-table";
import { InvoiceTypeBadge, StatusBadge } from "@/components/dashboard/status-badge";
import { formatCurrency } from "@/lib/utils";

interface InvoiceRow {
  invoiceDocId: number;
  invoiceNo: string;
  status: string;
  invoiceType: string;
  activityDate: string;
  customerId: number;
  customerName: string;
  customerNo: string;
  salesPersonName: string;
  totalInvoice: number;
}

interface InvoicesTableProps {
  rows: InvoiceRow[];
  showCustomer?: boolean;
  pageSize?: number;
  filterPlaceholder?: string;
  emptyText?: string;
}

export function InvoicesTable({
  rows,
  showCustomer = true,
  pageSize = 25,
  filterPlaceholder = "Filter by customer or invoice...",
  emptyText = "No invoices in the selected window.",
}: InvoicesTableProps) {
  const columns: ColumnDef<InvoiceRow, unknown>[] = React.useMemo(() => {
    const cols: ColumnDef<InvoiceRow, unknown>[] = [
      {
        accessorKey: "invoiceNo",
        header: "Invoice",
        cell: ({ row }) => (
          <Link
            href={`/invoices/${row.original.invoiceDocId}`}
            className="font-mono text-sm text-primary hover:underline"
          >
            #{row.original.invoiceNo}
          </Link>
        ),
      },
      {
        accessorKey: "activityDate",
        header: "Date",
        cell: ({ getValue }) => {
          const v = String(getValue() ?? "");
          if (!v) return "—";
          const day = v.slice(0, 10);
          try {
            return <span className="tabular-nums">{format(parseISO(day), "MMM d, yyyy")}</span>;
          } catch {
            return v;
          }
        },
      },
      {
        accessorKey: "invoiceType",
        header: "Type",
        cell: ({ getValue }) => <InvoiceTypeBadge type={String(getValue() ?? "")} />,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => <StatusBadge status={String(getValue() ?? "")} />,
      },
    ];
    if (showCustomer) {
      cols.push({
        accessorKey: "customerName",
        header: "Customer",
        cell: ({ row }) => (
          <Link
            href={`/customers/${row.original.customerId}`}
            className="text-sm hover:underline"
          >
            <div className="font-medium">{row.original.customerName}</div>
            <div className="text-xs text-muted-foreground">{row.original.customerNo}</div>
          </Link>
        ),
      });
    }
    cols.push({
      accessorKey: "salesPersonName",
      header: "Salesperson",
      cell: ({ getValue }) => <span className="text-sm">{String(getValue() ?? "—") || "—"}</span>,
    });
    cols.push({
      accessorKey: "totalInvoice",
      header: () => <span className="text-right">Total</span>,
      cell: ({ getValue }) => (
        <div className="text-right font-medium tabular-nums">
          {formatCurrency(Number(getValue() ?? 0), { fractional: true })}
        </div>
      ),
    });
    return cols;
  }, [showCustomer]);

  return (
    <DataTable
      data={rows}
      columns={columns}
      pageSize={pageSize}
      filterPlaceholder={filterPlaceholder}
      emptyText={emptyText}
    />
  );
}
