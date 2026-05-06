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
import { InvoiceTypeBadge, StatusBadge } from "@/components/dashboard/status-badge";
import { DrillLink } from "@/components/ui/drill-link";
import { getInvoiceFull, getInvoiceLines, getInvoiceSegments } from "@/lib/queries/invoice";
import { getInvoicePayments } from "@/lib/queries/payments";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ invoiceDocId: string }>;
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { invoiceDocId: id } = await params;
  const invoiceDocId = Number(id);
  if (!Number.isFinite(invoiceDocId)) notFound();

  const inv = getInvoiceFull(invoiceDocId);
  if (!inv) notFound();

  const [lines, segments, payments] = await Promise.all([
    Promise.resolve(getInvoiceLines(invoiceDocId)),
    Promise.resolve(getInvoiceSegments(invoiceDocId)),
    Promise.resolve(getInvoicePayments(invoiceDocId)),
  ]);

  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = inv.totalInvoice - paid;

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title={`Invoice ${inv.invoiceNo}`}
        description={`Doc ${inv.docNo} • Activity ${inv.activityDate?.slice(0, 10)}`}
      />

      <div className="flex flex-wrap gap-2">
        <DrillLink href={`/customers/${inv.customerId}`}>Customer</DrillLink>
        {inv.invoiceType === "wo" ? (
          <DrillLink href={`/service/${invoiceDocId}`}>Work order view</DrillLink>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={inv.status} />
        <InvoiceTypeBadge type={inv.invoiceType} />
        {inv.woStatusLabel ? (
          <span className="text-xs text-muted-foreground">WO status: {inv.woStatusLabel}</span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/customers/${inv.customerId}`} className="font-medium hover:underline">
              {inv.customerName}
            </Link>
            <div className="text-xs text-muted-foreground">{inv.customerNo}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Salesperson</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{inv.salesPersonName || "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            {formatCurrency(inv.totalInvoice, { fractional: true })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Paid / balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm tabular-nums">
            <div>{formatCurrency(paid, { fractional: true })} paid</div>
            <div className={balance > 0 ? "font-semibold text-amber-600" : ""}>
              {formatCurrency(balance, { fractional: true })} balance
            </div>
          </CardContent>
        </Card>
      </div>

      {inv.invoiceType === "wo" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work order</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Unit</span> {inv.woUnitDescription || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Unit #</span> {inv.woUnitNo || "—"}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Links</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.itemId}>
                  <TableCell className="font-mono text-xs">{l.lineNo}</TableCell>
                  <TableCell className="text-xs">{l.itemType}</TableCell>
                  <TableCell className="max-w-md">
                    <div className="text-sm font-medium">{l.displayText}</div>
                    <div className="truncate text-xs text-muted-foreground">{l.description}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{formatNumber(l.qty)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatCurrency(l.netExt, { fractional: true })}
                  </TableCell>
                  <TableCell className="text-xs">
                    {l.partId ? (
                      <Link href={`/parts/${l.partId}`} className="text-primary hover:underline">
                        Part
                      </Link>
                    ) : null}
                    {l.unitId ? (
                      <>
                        {l.partId ? " · " : null}
                        <Link href={`/inventory/${l.unitId}`} className="text-primary hover:underline">
                          Unit
                        </Link>
                      </>
                    ) : null}
                    {!l.partId && !l.unitId ? "—" : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {segments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service segments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Text</TableHead>
                  <TableHead className="text-right">Hrs</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.map((s) => (
                  <TableRow key={s.segmentId}>
                    <TableCell className="text-sm">{s.status}</TableCell>
                    <TableCell className="max-w-md truncate text-sm">{s.displayText}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatNumber(s.actualHrs)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatCurrency(s.netExt, { fractional: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment rows.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.paymentId}>
                    <TableCell className="text-xs tabular-nums">{p.paymentDate?.slice(0, 16)}</TableCell>
                    <TableCell className="text-sm">{p.method}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatCurrency(p.amount, { fractional: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {inv.printableComment ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comments</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">{inv.printableComment}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
