"use client";

import { useRouter } from "next/navigation";
import { BarChart } from "@/components/charts/bar-chart";

interface RevRow {
  month: string;
  monthLabel: string;
  revenue: number;
  invoices: number;
}

/** Posted revenue by month; bar click navigates to `/sales/[year]/[month]`. */
export function MonthlyRevenueDrillChart({ data }: { data: RevRow[] }) {
  const router = useRouter();
  return (
    <BarChart
      data={data.map((r) => ({
        monthLabel: r.monthLabel,
        month: r.month,
        revenue: r.revenue,
      }))}
      xKey="monthLabel"
      series={[{ dataKey: "revenue", label: "Revenue" }]}
      valueFormat="currency"
      height={280}
      onBarClick={(d) => {
        const month = String(d.month);
        if (!month) return;
        const [year, m] = month.split("-");
        router.push(`/sales/${year}/${parseInt(m, 10)}`);
      }}
    />
  );
}
