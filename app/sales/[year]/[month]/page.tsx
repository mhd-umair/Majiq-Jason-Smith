import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoicesTable } from "@/components/dashboard/invoices-table";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Button } from "@/components/ui/button";
import { getIncludeArchived, postedRevenueShortLabel } from "@/lib/posted-preference";
import { getInvoicesByMonth } from "@/lib/queries/sales";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { format, parse } from "date-fns";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ year: string; month: string }>;
}

export default async function SalesMonthPage({ params }: PageProps) {
  const { year: yStr, month: mStr } = await params;
  const year = Number(yStr);
  const month = Number(mStr);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) notFound();
  if (!Number.isInteger(month) || month < 1 || month > 12) notFound();

  const [includeArchived, rows] = await Promise.all([getIncludeArchived(), getInvoicesByMonth(year, month)]);
  const postedLabel = postedRevenueShortLabel(includeArchived);
  const monthDate = parse(`${year}-${String(month).padStart(2, "0")}-01`, "yyyy-MM-dd", new Date());
  const title = format(monthDate, "MMMM yyyy");
  const total = rows.reduce((s, r) => s + r.totalInvoice, 0);

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title={title}
        description={`Posted invoices (${postedLabel}) with activity in this calendar month. ${formatNumber(rows.length)} shown (max 1000). Total ${formatCurrency(total)}.`}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/sales">Back to sales</Link>
          </Button>
        }
      />

      <div className="rounded-lg border bg-card p-4">
        <InvoicesTable
          rows={rows}
          pageSize={25}
          filterPlaceholder="Filter by customer, invoice, or salesperson..."
          emptyText="No posted invoices in this month for the current archived preference."
        />
      </div>
    </div>
  );
}
