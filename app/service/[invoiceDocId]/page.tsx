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
import { StatusBadge } from "@/components/dashboard/status-badge";
import { DrillLink } from "@/components/ui/drill-link";
import {
  getWODetail,
  getWOSegments,
  getWOWIP,
  getWorkOrderScheduleForInvoice,
} from "@/lib/queries/service";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ invoiceDocId: string }>;
}

export default async function ServiceDetailPage({ params }: Props) {
  const { invoiceDocId: id } = await params;
  const invoiceDocId = Number(id);
  if (!Number.isFinite(invoiceDocId)) notFound();

  const wo = getWODetail(invoiceDocId);
  if (!wo) notFound();

  const segments = getWOSegments(invoiceDocId);
  const wip = getWOWIP(invoiceDocId);
  const sched = getWorkOrderScheduleForInvoice(invoiceDocId);

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title={`Work order ${wo.invoiceNo}`}
        description={`${wo.customerName} • ${wo.unitDescription ?? ""}`}
      />
      <div className="flex flex-wrap gap-3 text-sm">
        <DrillLink href="/service">All service</DrillLink>
        <DrillLink href={`/invoices/${invoiceDocId}`}>Invoice view</DrillLink>
        <Link href={`/customers/${wo.customerId}`} className="text-primary hover:underline">
          Customer profile
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={wo.status} />
        <span className="text-sm text-muted-foreground">WO status: {wo.woStatus}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Technician</CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-medium">{wo.techName || "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Estimate</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            {formatCurrency(wo.estimate)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Invoice total</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            {formatCurrency(wo.total)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Unit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div>{wo.unitNo}</div>
            <div className="text-muted-foreground">{wo.unitModel}</div>
            <div className="font-mono text-muted-foreground">{wo.unitBaseSerial}</div>
            <div>Meter: {formatNumber(wo.meter)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description & comments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="text-xs font-medium text-muted-foreground">WO description</div>
            <p className="mt-1 whitespace-pre-wrap">{wo.woDescription || "—"}</p>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Printable comment</div>
            <p className="mt-1 whitespace-pre-wrap">{wo.printableComment || "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {sched.length === 0 ? (
            <p className="text-sm text-muted-foreground">No schedule rows.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Required</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Actual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sched.map((s) => (
                  <TableRow key={s.workOrderScheduleId}>
                    <TableCell className="text-xs tabular-nums">
                      {s.requiredStartTime?.slice(0, 16) ?? "—"} → {s.requiredEndTime?.slice(0, 16) ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {s.scheduledStartTime?.slice(0, 16) ?? "—"} → {s.scheduledEndTime?.slice(0, 16) ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {s.actualStartTime?.slice(0, 16) ?? "—"} → {s.actualEndTime?.slice(0, 16) ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Segments</CardTitle>
        </CardHeader>
        <CardContent>
          {segments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No segments.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Text</TableHead>
                  <TableHead className="text-right">Hrs</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.map((s) => (
                  <TableRow key={s.segmentId}>
                    <TableCell className="font-mono text-xs">{s.segmentId}</TableCell>
                    <TableCell className="text-sm">{s.status}</TableCell>
                    <TableCell className="max-w-md truncate text-sm">{s.displayText}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatNumber(s.actualHrs)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatCurrency(s.netExt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Work in progress</CardTitle>
        </CardHeader>
        <CardContent>
          {wip.length === 0 ? (
            <p className="text-sm text-muted-foreground">No WIP clock entries.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tech</TableHead>
                  <TableHead>On</TableHead>
                  <TableHead>Off</TableHead>
                  <TableHead className="text-right">Hrs</TableHead>
                  <TableHead>Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wip.map((w) => (
                  <TableRow key={w.wipId}>
                    <TableCell className="text-sm">{w.techName}</TableCell>
                    <TableCell className="text-xs tabular-nums">{w.timeOn?.slice(0, 16)}</TableCell>
                    <TableCell className="text-xs tabular-nums">{w.timeOff?.slice(0, 16) ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatNumber(w.elapsedHours)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{w.comment}</TableCell>
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
