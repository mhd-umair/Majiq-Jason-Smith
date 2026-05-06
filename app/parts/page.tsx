import { ChartCard } from "@/components/dashboard/chart-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SectionHeader } from "@/components/dashboard/section-header";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import { DonutChart } from "@/components/charts/donut-chart";
import {
  getPartsStockingPolicy,
  getRevenueByManufacturer,
  getRevenueByPartGroup,
  getTopPartsByQty,
  getTopPartsByRevenue,
} from "@/lib/queries/parts";
import { formatNumber, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PartsPage() {
  const [topRev, topQty, byMfg, byGroup, policy] = await Promise.all([
    getTopPartsByRevenue(12, 20),
    getTopPartsByQty(12, 20),
    getRevenueByManufacturer(12),
    getRevenueByPartGroup(12),
    getPartsStockingPolicy(),
  ]);

  const withPolicyPct = policy.totalParts > 0 ? (policy.withMinMax / policy.totalParts) * 100 : 0;
  const stale30Pct = policy.totalParts > 0 ? (policy.staleCount30d / policy.totalParts) * 100 : 0;

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Parts"
        description="Posted parts sales, estimated margin (where AvgCost exists), manufacturer mix, and stocking policy signals. On-hand quantity is not modeled in this dataset."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Part locations (active)"
          value={formatNumber(policy.totalParts)}
          helpText="Rows in PartLocation with IsActive=1."
        />
        <KpiCard
          label="With min/max policy"
          value={formatPercent(withPolicyPct, 0)}
          hint={`${formatNumber(policy.withMinMax)} rows`}
          helpText="Locations where MinStock or MaxStock is greater than zero."
        />
        <KpiCard
          label="No min/max"
          value={formatNumber(policy.withoutMinMax)}
          helpText="Active part locations with both MinStock and MaxStock at zero."
        />
        <KpiCard
          label="Stale counts (30d+)"
          value={formatPercent(stale30Pct, 0)}
          hint={`${formatNumber(policy.staleCount30d)} rows`}
          helpText="Locations where LastCountDate is null or older than 30 days before data as-of."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Top parts by revenue" description="Posted sales, trailing 12 months.">
          <HorizontalBars
            data={topRev.map((p) => ({
              label: p.partNo,
              sublabel: p.description,
              value: p.revenue,
              href: `/parts/${p.partId}`,
            }))}
            maxItems={15}
          />
        </ChartCard>
        <ChartCard title="Top parts by quantity" description="Posted sales, trailing 12 months.">
          <HorizontalBars
            data={topQty.map((p) => ({
              label: p.partNo,
              sublabel: p.description,
              value: p.qty,
              href: `/parts/${p.partId}`,
            }))}
            valueFormat="number"
            maxItems={15}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Revenue by manufacturer" description="Trailing 12 months, posted.">
          <DonutChart
            data={byMfg
              .filter((m) => m.revenue > 0)
              .map((m) => ({ name: m.displayText || m.mfgCode, value: m.revenue }))}
            valueFormat="currency"
            height={260}
          />
        </ChartCard>
        <ChartCard title="Revenue by part group" description="Trailing 12 months, posted.">
          <HorizontalBars
            data={byGroup
              .filter((g) => g.revenue > 0)
              .map((g) => ({
                label: g.displayText,
                sublabel: `${formatNumber(g.qty)} qty`,
                value: g.revenue,
              }))}
            maxItems={12}
          />
        </ChartCard>
      </div>
    </div>
  );
}
