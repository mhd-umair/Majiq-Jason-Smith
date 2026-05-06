import { MonthlyRevenueDrillChart } from "@/components/dashboard/monthly-revenue-drill-chart";
import { ChartCard } from "@/components/dashboard/chart-card";
import { InvoicesTable } from "@/components/dashboard/invoices-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SectionHeader } from "@/components/dashboard/section-header";
import { DonutChart } from "@/components/charts/donut-chart";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import { getDataAsOfDate } from "@/lib/asOf";
import { getIncludeArchived, postedRevenueShortLabel } from "@/lib/posted-preference";
import { getRevenueByMonth } from "@/lib/queries/kpis";
import {
  getInvoiceCountsByStatus,
  getRecentInvoices,
  getTaxableSplit,
  getTopSalespeople,
} from "@/lib/queries/sales";
import { formatCompactCurrency, formatCurrency, formatNumber } from "@/lib/utils";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const [includeArchived, revByMonth, recent, topPeople, taxable, statusCounts] = await Promise.all([
    getIncludeArchived(),
    getRevenueByMonth(24),
    getRecentInvoices(50),
    getTopSalespeople(12, 10),
    getTaxableSplit(12),
    getInvoiceCountsByStatus(12),
  ]);

  const asOf = getDataAsOfDate();
  const asOfLabel = format(asOf, "MMMM d, yyyy");
  const postedLabel = postedRevenueShortLabel(includeArchived);
  const rev12 = revByMonth.slice(-12).reduce((s, r) => s + r.revenue, 0);
  const inv12 = revByMonth.slice(-12).reduce((s, r) => s + r.invoices, 0);
  const taxablePct =
    taxable.total > 0 ? (taxable.taxable / taxable.total) * 100 : 0;

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Sales"
        description={`Posted invoice activity through ${asOfLabel}. Metrics use ${postedLabel} unless noted.`}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Posted revenue (12 mo)"
          value={formatCurrency(rev12)}
          helpText={`Sum of invoice totals for ${postedLabel}, trailing 12 months by activity month (matches revenue trend).`}
        />
        <KpiCard
          label="Posted invoices (12 mo)"
          value={formatNumber(inv12)}
          helpText={`Invoice count for ${postedLabel} in the same trailing-12-month window.`}
        />
        <KpiCard
          label="Taxable share (12 mo)"
          value={`${taxablePct.toFixed(1)}%`}
          hint={`${formatCompactCurrency(taxable.taxable)} taxable`}
          helpText="From SalesTax rows joined to posted invoices in the trailing 12 months (taxable ÷ total sales on those rows)."
        />
        <KpiCard
          label="Top salesperson revenue"
          value={topPeople[0] ? formatCurrency(topPeople[0].revenue) : "—"}
          hint={topPeople[0]?.salesPersonName ?? "No named rep"}
          helpText="Highest trailing-12-month posted revenue among invoices with a non-blank SalesPersonName."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title="Revenue trend"
          description={`Posted revenue (${postedLabel}). Click a bar for invoices in that month.`}
          className="xl:col-span-2"
        >
          <MonthlyRevenueDrillChart
            data={revByMonth.map((r) => ({
              monthLabel: r.monthLabel,
              month: r.month,
              revenue: r.revenue,
              invoices: r.invoices,
            }))}
          />
        </ChartCard>

        <ChartCard
          title="Invoice status mix"
          description="All statuses with activity in the trailing 12 months (not limited to posted revenue filter)."
        >
          <DonutChart
            data={statusCounts.map((s) => ({ name: s.status || "—", value: s.count }))}
            valueFormat="number"
            height={260}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Taxable vs non-taxable" description={`SalesTax totals, ${postedLabel}, trailing 12 months.`}>
          <DonutChart
            data={[
              { name: "Taxable", value: taxable.taxable },
              { name: "Non-taxable", value: taxable.nonTaxable },
            ]}
            valueFormat="currency"
            height={240}
          />
        </ChartCard>

        <ChartCard title="Top salespeople" description={`By posted revenue (${postedLabel}), trailing 12 months.`}>
          <HorizontalBars
            data={topPeople.map((p) => ({
              label: p.salesPersonName,
              value: p.revenue,
              sublabel: `${formatNumber(p.invoices)} invoices • avg ${formatCurrency(p.avgInvoice, { fractional: true })}`,
            }))}
            valueFormat="currency"
            emptyText="No invoices with a salesperson in this window."
          />
        </ChartCard>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-1 text-sm font-semibold">Recent posted invoices</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Latest {recent.length} by activity date ({postedLabel}). Open an invoice for line detail and payments.
        </p>
        <InvoicesTable rows={recent} pageSize={15} filterPlaceholder="Filter invoices..." />
      </div>
    </div>
  );
}
