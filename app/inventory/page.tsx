import { ChartCard } from "@/components/dashboard/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SectionHeader } from "@/components/dashboard/section-header";
import { InventoryUnitsTable } from "@/components/inventory/inventory-units-table";
import {
  getInStockUnits,
  getInventoryAging,
  getInventoryByCategory,
  getInventoryByMake,
  getNewVsUsed,
  getRecentTradeIns,
  getStockStatusBreakdown,
} from "@/lib/queries/units";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [status, newUsed, aging, categories, makes, units, trades] = await Promise.all([
    getStockStatusBreakdown(),
    getNewVsUsed(),
    getInventoryAging(),
    getInventoryByCategory(),
    getInventoryByMake(12),
    Promise.resolve(getInStockUnits(800)),
    getRecentTradeIns(12),
  ]);

  const inStock = status.find((s) => s.status === "instock");
  const inStockRetail = inStock?.retail ?? 0;
  const inStockCount = inStock?.count ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Unit inventory"
        description="In-stock units (StockStatus='instock'), retail and cost exposure, aging from DateReceived, and recent trade-ins."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="In-stock units"
          value={formatNumber(inStockCount)}
          hint={`Retail ${formatCurrency(inStockRetail)}`}
          helpText="Active UnitBase rows with trimmed StockStatus equal to instock."
        />
        <KpiCard
          label="Stock status mix"
          value={formatNumber(status.reduce((s, r) => s + r.count, 0))}
          hint="All active units"
          helpText="Counts include non-in-stock statuses such as sold and expected."
        />
        <KpiCard
          label="Recent trade-ins"
          value={formatNumber(trades.length)}
          helpText="Most recent posted trade-in lines (sample)."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard title="Stock status" description="All active units.">
          <DonutChart
            data={status.map((s) => ({ name: s.label, value: s.count }))}
            valueFormat="number"
            height={240}
          />
        </ChartCard>
        <ChartCard title="New vs used (in stock)" description="In-stock units only.">
          <DonutChart
            data={newUsed.map((r) => ({ name: r.bucket, value: r.count }))}
            valueFormat="number"
            height={240}
          />
        </ChartCard>
        <ChartCard title="Aging (in stock)" description="Days since DateReceived vs data as-of.">
          <HorizontalBars
            data={aging.map((a) => ({
              label: `${a.bucket} days`,
              value: a.count,
              sublabel: formatCurrency(a.retail),
            }))}
            valueFormat="number"
            maxItems={8}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="By category (in stock)" description="Retail value.">
          <HorizontalBars
            data={categories.map((c) => ({
              label: c.category,
              value: c.retail,
              sublabel: `${c.count} units`,
            }))}
            maxItems={12}
          />
        </ChartCard>
        <ChartCard title="By make (in stock)" description="Top makes by retail.">
          <HorizontalBars
            data={makes.map((m) => ({
              label: m.make,
              value: m.retail,
              sublabel: `${m.count} units`,
            }))}
            maxItems={12}
          />
        </ChartCard>
      </div>

      <ChartCard title="Recent trade-ins" description="Posted trade-in lines (sample).">
        {trades.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trade-ins found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stock #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Trade value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((t) => (
                <TableRow key={t.tradeDetailId}>
                  <TableCell>
                    <Link href={`/inventory/${t.unitId}`} className="font-mono text-sm text-primary hover:underline">
                      {t.stockNo}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-md truncate text-sm text-muted-foreground">{t.description}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(t.tradeValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ChartCard>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">In-stock unit list</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Oldest received first (by days in stock). Click stock # for detail.
        </p>
        <InventoryUnitsTable rows={units} />
      </div>
    </div>
  );
}
