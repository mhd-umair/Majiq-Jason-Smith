import Link from "next/link";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SectionHeader } from "@/components/dashboard/section-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getOpenWOByStatus,
  getOpenWOEstimateTotals,
  getOpenWorkOrders,
  getScheduleAdherence,
  getTechWorkload,
} from "@/lib/queries/service";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ServicePage() {
  const [byStatus, tech, schedule, openList, estTotals] = await Promise.all([
    getOpenWOByStatus(),
    getTechWorkload(),
    getScheduleAdherence(),
    getOpenWorkOrders(150),
    getOpenWOEstimateTotals(),
  ]);

  const laborHours = tech.reduce((s, t) => s + t.laborHours12mo, 0);

  const openWoCount = byStatus.reduce((s, r) => s + r.openWOs, 0);

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Service & work orders"
        description="Open work-order invoices, technician workload, schedule adherence, and estimate exposure."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open WO count"
          value={formatNumber(openWoCount)}
          helpText="All work-order invoices not finalized, archived, or voided."
        />
        <KpiCard
          label="Open WO estimates"
          value={formatCurrency(estTotals.totalEstimate)}
          helpText="Sum of WOEstimate on open work-order invoices."
        />
        <KpiCard
          label="Open WO current totals"
          value={formatCurrency(estTotals.totalCurrent)}
          hint="Invoice total today"
          helpText="Sum of TotalInvoice on the same open work-order population."
        />
        <KpiCard
          label="Labor hours (12 mo)"
          value={formatNumber(Math.round(laborHours))}
          helpText="Sum of WorkInProgress.ElapsedHours for service techs in trailing 12 months."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard title="Open WOs by status" description="Not finalized, archived, or voided.">
          <DonutChart
            data={byStatus.map((s) => ({ name: s.status, value: s.openWOs }))}
            valueFormat="number"
            height={240}
          />
        </ChartCard>
        <ChartCard title="Schedule adherence" description="WorkOrderSchedule rows.">
          <DonutChart
            data={schedule.map((s) => ({ name: s.status, value: s.count }))}
            valueFormat="number"
            height={240}
          />
        </ChartCard>
        <ChartCard title="Technicians — open WOs" description="Service techs only.">
          <HorizontalBars
            data={tech
              .filter((t) => t.openWOs > 0 || t.laborHours12mo > 0)
              .slice(0, 12)
              .map((t) => ({
                label: t.techName || `Tech ${t.techId}`,
                value: t.openWOs,
                sublabel: `${t.laborHours12mo.toFixed(1)} labor hrs (12 mo)`,
              }))}
            valueFormat="number"
            maxItems={12}
          />
        </ChartCard>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">Open work orders (by age)</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Click invoice # for work-order detail (segments, WIP, schedule).
        </p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tech</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Est.</TableHead>
                <TableHead className="text-right">Age (d)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openList.map((w) => (
                <TableRow key={w.invoiceDocId}>
                  <TableCell>
                    <Link
                      href={`/service/${w.invoiceDocId}`}
                      className="font-mono text-sm text-primary hover:underline"
                    >
                      #{w.invoiceNo}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{w.woStatus}</TableCell>
                  <TableCell className="text-sm">{w.techName || "—"}</TableCell>
                  <TableCell>
                    <Link href={`/customers/${w.customerId}`} className="text-sm hover:underline">
                      {w.customerName}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                    {w.unitDescription || w.unitNo || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatCurrency(w.estimate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{w.ageDays}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
