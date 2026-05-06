import { format } from "date-fns";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { SectionHeader } from "@/components/dashboard/section-header";
import { MonthlyRevenueDrillChart } from "@/components/dashboard/monthly-revenue-drill-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import { getDataAsOfDate } from "@/lib/asOf";
import { getIncludeArchived, postedRevenueShortLabel } from "@/lib/posted-preference";
import {
  getExecKpis,
  getOpenWorkOrdersByStatus,
  getRevenueByMonth,
  getRevenueByType,
  getTopCustomers,
} from "@/lib/queries/kpis";
import { formatCompactCurrency, formatCurrency, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [includeArchived, kpis, revByMonth, revByType, topCustomers, woByStatus] = await Promise.all([
    getIncludeArchived(),
    getExecKpis(),
    getRevenueByMonth(24),
    getRevenueByType(12),
    getTopCustomers(10, 12),
    getOpenWorkOrdersByStatus(),
  ]);

  const asOf = getDataAsOfDate();
  const asOfLabel = format(asOf, "MMMM d, yyyy");
  const postedLabel = postedRevenueShortLabel(includeArchived);

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Executive dashboard"
        description={`Snapshot of dealership performance through ${asOfLabel}. Posted activity uses ${postedLabel}.`}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue (12 mo)"
          value={formatCurrency(kpis.revenue12mo)}
          delta={kpis.revenue12moDelta}
          hint={`vs prior 12 mo: ${formatCompactCurrency(kpis.revenue12moPrior)}`}
          helpText={`Total invoice amount over the trailing 12 months for ${postedLabel}.`}
        />
        <KpiCard
          label="MTD revenue"
          value={formatCurrency(kpis.mtdRevenue)}
          delta={kpis.mtdRevenueDelta}
          hint={`vs same period last month: ${formatCompactCurrency(kpis.mtdRevenuePrior)}`}
          helpText={`Posted revenue (${postedLabel}) from the start of the current month through the as-of date, compared to the same window in the prior month.`}
        />
        <KpiCard
          label="Active customers (90d)"
          value={formatNumber(kpis.activeCustomers90d)}
          delta={kpis.activeCustomers90dDelta}
          hint={`vs prior 90d: ${formatNumber(kpis.activeCustomers90dPrior)}`}
          helpText={`Distinct customers with at least one posted invoice (${postedLabel}) in the last 90 days.`}
        />
        <KpiCard
          label="Avg invoice (12 mo)"
          value={formatCurrency(kpis.avgInvoice12mo, { fractional: true })}
          delta={kpis.avgInvoice12moDelta}
          hint={`vs prior 12 mo: ${formatCompactCurrency(kpis.avgInvoice12moPrior)}`}
          helpText={`Mean invoice total over the trailing 12 months for ${postedLabel}.`}
        />
        <KpiCard
          label="Open work orders"
          value={formatNumber(kpis.openWorkOrders)}
          accent={kpis.openWorkOrders > 200 ? "warning" : "default"}
          helpText="Work-order invoices (InvoiceType='wo') that are not finalized, archived, or voided."
        />
        <KpiCard
          label="In-stock units"
          value={formatNumber(kpis.inStockUnits)}
          hint={`Retail: ${formatCompactCurrency(kpis.inStockRetail)}`}
          helpText="Active units with StockStatus='instock'. Retail uses BaseRetail; not deduplicated against pending sales."
        />
        <KpiCard
          label="Open A/R"
          value={formatCurrency(kpis.openAR)}
          hint={`${formatNumber(kpis.openARInvoices)} invoices`}
          accent="warning"
          helpText={`Posted invoices (${postedLabel}, last 24 months) where TotalInvoice exceeds sum of active payments.`}
        />
        <KpiCard
          label="Data range"
          value={format(asOf, "MMM yyyy")}
          hint="Treated as 'today' for trends"
          helpText="The dataset is historical; we use the most recent invoice activity date as the reference point for all trailing-period KPIs."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title="Revenue trend"
          description={`Posted revenue (${postedLabel}), last 24 months.`}
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

        <ChartCard title="Revenue by type" description={`Last 12 months, ${postedLabel}.`}>
          <DonutChart
            data={revByType.map((r) => ({ name: r.label, value: r.revenue }))}
            valueFormat="currency"
            height={220}
          />
        </ChartCard>

        <ChartCard
          title="Top customers"
          description={`By posted revenue (${postedLabel}), last 12 months.`}
          className="xl:col-span-2"
        >
          <HorizontalBars
            data={topCustomers.map((c) => ({
              label: c.customerName,
              sublabel: `${c.customerNo} • ${c.invoices} invoices`,
              value: c.revenue,
              href: `/customers/${c.customerId}`,
            }))}
            valueFormat="currency"
          />
        </ChartCard>

        <ChartCard
          title="Open work orders"
          description="By work-order status."
        >
          <DonutChart
            data={woByStatus.map((s) => ({ name: s.status, value: s.openWOs }))}
            valueFormat="number"
            height={220}
          />
        </ChartCard>
      </div>
    </div>
  );
}
