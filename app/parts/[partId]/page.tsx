import Link from "next/link";
import { notFound } from "next/navigation";
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
import { getInvoicesForPart, getPartDetail } from "@/lib/queries/parts";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ partId: string }>;
}

export default async function PartDetailPage({ params }: Props) {
  const { partId: id } = await params;
  const partId = Number(id);
  if (!Number.isFinite(partId)) notFound();

  const [detail, invoices] = await Promise.all([getPartDetail(partId), getInvoicesForPart(partId, 75)]);
  if (!detail) notFound();
  const margin = detail.revenue12mo - detail.cost12mo;
  const marginPct = detail.revenue12mo > 0 ? (margin / detail.revenue12mo) * 100 : null;

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title={`${detail.partNo}`}
        description={detail.description}
      />
      <DrillLink href="/parts">All parts</DrillLink>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">12 mo revenue (posted)</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            {formatCurrency(detail.revenue12mo)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">12 mo qty</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">{formatNumber(detail.qty12mo)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Est. margin (12 mo)</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            {formatCurrency(margin)}
            {marginPct != null ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({formatPercent(marginPct, 1)})
              </span>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Catalog</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <div>
              Mfg: <span className="text-foreground">{detail.mfgDisplay}</span> ({detail.mfgCode})
            </div>
            <div>Group: {detail.groupDisplay ?? "—"}</div>
            <div>
              Status: {detail.partStatus} • Type: {detail.partType}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stocking snapshot (first location row)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Min / max</span>{" "}
            <span className="tabular-nums">
              {detail.minStock ?? "—"} / {detail.maxStock ?? "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Bin</span> {detail.bin ?? "—"}
          </div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Last count</span> {detail.lastCountDate ?? "—"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent invoices with this part</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posted invoice lines found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((r) => (
                  <TableRow key={`${r.invoiceDocId}-${r.activityDate}`}>
                    <TableCell>
                      <Link
                        href={`/invoices/${r.invoiceDocId}`}
                        className="font-mono text-sm text-primary hover:underline"
                      >
                        #{r.invoiceNo}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">{r.activityDate?.slice(0, 10)}</TableCell>
                    <TableCell>
                      <Link href={`/customers/${r.customerId}`} className="text-sm hover:underline">
                        {r.customerName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(r.qty)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(r.netExt)}</TableCell>
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
