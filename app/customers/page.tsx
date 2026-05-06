import { DonutChart } from "@/components/charts/donut-chart";
import { ChartCard } from "@/components/dashboard/chart-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SectionHeader } from "@/components/dashboard/section-header";
import { DateRangePickerPlaceholder } from "@/components/ui/date-range-picker";
import { CustomerLeaderboardTable } from "@/components/customers/customer-leaderboard-table";
import {
  getActivitySegments,
  getContactCompleteness,
  getCustomerLeaderboard,
} from "@/lib/queries/customers";
import { formatNumber, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const [leaderboard, segments, contact] = await Promise.all([
    getCustomerLeaderboard(),
    getActivitySegments(),
    getContactCompleteness(),
  ]);

  const withBothPct = contact.customers > 0 ? (contact.withBoth / contact.customers) * 100 : 0;

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Customers"
        description="Leaderboard, activity segments, and contact coverage for active customer master records."
      />

      <DateRangePickerPlaceholder />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Active (90d)"
          value={formatNumber(segments.active)}
          helpText="Customers whose last posted invoice is within 90 days of the data as-of date."
        />
        <KpiCard
          label="Slowing (90–180d)"
          value={formatNumber(segments.slowing)}
          helpText="Last posted invoice between 90 and 180 days ago."
        />
        <KpiCard
          label="Dormant (180d+)"
          value={formatNumber(segments.dormant)}
          accent="warning"
          helpText="Last posted invoice more than 180 days ago."
        />
        <KpiCard
          label="Never purchased"
          value={formatNumber(segments.never)}
          helpText="Active customer master with no posted invoices."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Activity mix"
          description="Based on last posted invoice date per customer."
        >
          <DonutChart
            data={[
              { name: "Active", value: segments.active },
              { name: "Slowing", value: segments.slowing },
              { name: "Dormant", value: segments.dormant },
              { name: "Never", value: segments.never },
            ]}
            valueFormat="number"
            height={240}
          />
        </ChartCard>

        <div className="min-w-0 rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold">Contact completeness</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Share of active customers with at least one active email or phone on a contact.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Customers</dt>
              <dd className="text-lg font-semibold tabular-nums">{formatNumber(contact.customers)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">With email</dt>
              <dd className="text-lg font-semibold tabular-nums">{formatNumber(contact.withEmail)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">With phone</dt>
              <dd className="text-lg font-semibold tabular-nums">{formatNumber(contact.withPhone)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Both</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {formatNumber(contact.withBoth)}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({formatPercent(withBothPct, 0)})
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Customer leaderboard</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Top 500 by trailing-12-month posted revenue. Click a row for profile and drill-downs.
        </p>
        <CustomerLeaderboardTable rows={leaderboard} />
      </div>
    </div>
  );
}
