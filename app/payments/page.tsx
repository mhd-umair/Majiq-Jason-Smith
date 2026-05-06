import { BarChart } from "@/components/charts/bar-chart";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SectionHeader } from "@/components/dashboard/section-header";
import {
  getDaysToPay,
  getOpenAROverview,
  getPaymentVolume,
  getPaymentsByMethod,
  getTopOpenARCustomers,
} from "@/lib/queries/payments";
import { formatCurrency, formatNumber } from "@/lib/utils";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [byMethod, volume, ar, topAr, dtp] = await Promise.all([
    getPaymentsByMethod(12),
    getPaymentVolume(12),
    getOpenAROverview(),
    getTopOpenARCustomers(15),
    getDaysToPay(12),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Payments & receivables"
        description="Payment mix, cash-in trend, open A/R aging from posted invoices, and days-to-first-payment."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open A/R"
          value={formatCurrency(ar.totalOpen)}
          hint={`${formatNumber(ar.invoiceCount)} invoices`}
          accent="warning"
          helpText="Posted invoices in last 24 months where TotalInvoice exceeds sum of active payments."
        />
        <KpiCard
          label="A/R 0–30d"
          value={formatCurrency(ar.current30)}
          helpText="Open balance on invoices aged 0–30 days from finalized (or activity) date."
        />
        <KpiCard
          label="A/R 90d+"
          value={formatCurrency(ar.d90plus)}
          accent="destructive"
          helpText="Open balance on invoices older than 90 days."
        />
        <KpiCard
          label="Avg days to pay"
          value={dtp.invoicesAnalyzed > 0 ? `${dtp.averageDays.toFixed(1)} d` : "—"}
          hint={`Median ${dtp.medianDays.toFixed(1)} d • n=${formatNumber(dtp.invoicesAnalyzed)}`}
          helpText="Days from FinalizedDate to first payment EntDate, posted invoices in trailing 12 months."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Payments by method" description="Trailing 12 months, active payment rows.">
          <DonutChart
            data={byMethod.map((m) => ({ name: m.method, value: m.amount }))}
            valueFormat="currency"
            height={260}
          />
        </ChartCard>
        <ChartCard title="Payment volume" description="Sum of payment amounts by month.">
          <BarChart
            data={volume.map((v) => ({
              monthLabel: v.monthLabel,
              amount: v.amount,
            }))}
            xKey="monthLabel"
            series={[{ dataKey: "amount", label: "Amount" }]}
            valueFormat="currency"
            height={280}
          />
        </ChartCard>
      </div>

      <ChartCard title="A/R aging (open posted)" description="Bucketed by days since finalize/activity.">
        <HorizontalBars
          data={[
            { label: "0–30 days", value: ar.current30 },
            { label: "31–60 days", value: ar.d31to60 },
            { label: "61–90 days", value: ar.d61to90 },
            { label: "90+ days", value: ar.d90plus },
          ]}
          valueFormat="currency"
          maxItems={8}
        />
      </ChartCard>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">Top customers by open A/R</h3>
        <p className="mb-4 text-xs text-muted-foreground">Posted invoices, 24-month window.</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Open A/R</TableHead>
              <TableHead className="text-right">Invoices</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topAr.map((r) => (
              <TableRow key={r.customerId}>
                <TableCell>
                  <Link href={`/customers/${r.customerId}`} className="font-medium hover:underline">
                    {r.customerName}
                  </Link>
                  <div className="text-xs text-muted-foreground">{r.customerNo}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatCurrency(r.openAR)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.openInvoices}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
