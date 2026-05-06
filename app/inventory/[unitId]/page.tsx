import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SectionHeader } from "@/components/dashboard/section-header";
import { DrillLink } from "@/components/ui/drill-link";
import { getUnitDetail, getUnitHistory } from "@/lib/queries/units";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ unitId: string }>;
}

export default async function UnitDetailPage({ params }: Props) {
  const { unitId: id } = await params;
  const unitId = Number(id);
  if (!Number.isFinite(unitId)) notFound();

  const unit = getUnitDetail(unitId);
  if (!unit) notFound();

  const history = getUnitHistory(unitId);

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title={`${unit.stockNo}`}
        description={`${unit.make} ${unit.model} ${unit.year} • ${unit.description}`}
      />
      <div className="flex flex-wrap gap-2">
        <DrillLink href="/inventory">All inventory</DrillLink>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Status: {unit.stockStatus}</Badge>
        {unit.rental ? <Badge variant="secondary">Rental</Badge> : null}
        {unit.attachment ? <Badge variant="secondary">Attachment</Badge> : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Retail / cost</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm tabular-nums">
            <div>{formatCurrency(unit.baseRetail)} retail</div>
            <div className="text-muted-foreground">{formatCurrency(unit.baseCost)} cost</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Margin %</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">{formatNumber(unit.marginPct)}%</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Days in stock</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {unit.daysInStock != null ? formatNumber(unit.daysInStock) : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Serial / warranty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="font-mono">{unit.serialNo ?? "—"}</div>
            <div className="text-muted-foreground">Warranty {unit.warrantyDate?.slice(0, 10) ?? "—"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer / unit history</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history rows.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="text-right">Invoice amt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.customerUnitId}>
                    <TableCell className="tabular-nums text-sm">{h.eventDate?.slice(0, 10) ?? "—"}</TableCell>
                    <TableCell>
                      {h.customerId ? (
                        <Link href={`/customers/${h.customerId}`} className="text-sm hover:underline">
                          {h.customerName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{h.activity ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {h.invoiceAmount != null ? formatCurrency(h.invoiceAmount) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
