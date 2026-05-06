import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
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
import { InvoicesTable } from "@/components/dashboard/invoices-table";
import { SectionHeader } from "@/components/dashboard/section-header";
import { DrillLink } from "@/components/ui/drill-link";
import {
  getCustomerContacts,
  getCustomerInvoices,
  getCustomerProfile,
  getCustomerTopParts,
  getCustomerUnits,
} from "@/lib/queries/customers";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ customerId: string }>;
}

export default async function CustomerProfilePage({ params }: Props) {
  const { customerId: id } = await params;
  const customerId = Number(id);
  if (!Number.isFinite(customerId)) notFound();

  const [profile, invoices, parts, units, contacts] = await Promise.all([
    getCustomerProfile(customerId),
    getCustomerInvoices(customerId, 40),
    getCustomerTopParts(customerId, 20),
    Promise.resolve(getCustomerUnits(customerId, 20)),
    Promise.resolve(getCustomerContacts(customerId)),
  ]);
  if (!profile) notFound();

  const lastPurchase = profile.lastPurchase?.slice(0, 10);
  const lastPurchaseLabel = lastPurchase
    ? (() => {
        try {
          return format(parseISO(lastPurchase), "MMM d, yyyy");
        } catch {
          return lastPurchase;
        }
      })()
    : "—";

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title={profile.customerName}
        description={`Customer #${profile.customerNo} • ${profile.isBusiness ? "Business" : "Individual"} • Last posted purchase ${lastPurchaseLabel}`}
      />

      <div className="flex flex-wrap gap-2">
        <DrillLink href="/customers">All customers</DrillLink>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Posted revenue (all time)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {formatCurrency(profile.totalRevenue)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Posted invoices</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {formatNumber(profile.invoiceCount)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Avg invoice (posted)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {formatCurrency(profile.avgInvoice, { fractional: true })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Credit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="tabular-nums">Limit {formatCurrency(profile.credLimit)}</div>
            {profile.creditHold ? (
              <Badge variant="destructive">Credit hold</Badge>
            ) : (
              <Badge variant="secondary">No hold</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts on file.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((c) => (
                    <TableRow key={c.contactId}>
                      <TableCell>
                        {c.firstName} {c.lastName}
                        {c.isPrimary ? (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            Primary
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground">
                        {c.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Units & history</CardTitle>
          </CardHeader>
          <CardContent>
            {units.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unit history rows.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((u) => (
                    <TableRow key={`${u.unitId}-${u.eventDate}`}>
                      <TableCell>
                        <Link href={`/inventory/${u.unitId}`} className="font-mono text-sm text-primary hover:underline">
                          {u.stockNo}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {u.make} {u.model} {u.year}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{u.activity ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{u.eventDate?.slice(0, 10) ?? ""}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {u.invoiceAmount != null ? formatCurrency(u.invoiceAmount) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top purchased parts (posted)</CardTitle>
        </CardHeader>
        <CardContent>
          {parts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No part lines on posted invoices.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((p) => (
                  <TableRow key={p.partId}>
                    <TableCell>
                      <Link href={`/parts/${p.partId}`} className="font-mono text-sm text-primary hover:underline">
                        {p.partNo}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{p.description}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(p.qty)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Recent posted invoices</h3>
        <InvoicesTable rows={invoices} showCustomer={false} pageSize={15} />
      </div>
    </div>
  );
}
