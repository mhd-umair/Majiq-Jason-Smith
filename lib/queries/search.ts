import { getDb } from "@/lib/db";

export interface SearchHit {
  type: "customer" | "invoice";
  id: string;
  primary: string;
  secondary?: string;
  href: string;
}

export function searchAll(query: string, limit = 8): SearchHit[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const db = getDb();
  const like = `%${trimmed}%`;

  const customers = db
    .prepare<[string, string, number], { customerId: number; customerName: string; customerNo: string }>(
      `SELECT CustomerId AS customerId,
              CustomerName AS customerName,
              CustomerNo AS customerNo
       FROM Customer
       WHERE IsActive = 1
         AND (CustomerName LIKE ? OR CustomerNo LIKE ?)
       ORDER BY CustomerName
       LIMIT ?`,
    )
    .all(like, like, limit);

  const invoices = db
    .prepare<[string, string, number], { invoiceDocId: number; invoiceNo: string; customerName: string; activityDate: string }>(
      `SELECT InvoiceDocId AS invoiceDocId,
              InvoiceNo AS invoiceNo,
              CustomerName AS customerName,
              ActivityDate AS activityDate
       FROM InvoiceHeader
       WHERE InvoiceNo LIKE ? OR DocNo LIKE ?
       ORDER BY ActivityDate DESC
       LIMIT ?`,
    )
    .all(like, like, limit);

  const hits: SearchHit[] = [];
  for (const c of customers) {
    hits.push({
      type: "customer",
      id: `c-${c.customerId}`,
      primary: c.customerName,
      secondary: c.customerNo,
      href: `/customers/${c.customerId}`,
    });
  }
  for (const inv of invoices) {
    hits.push({
      type: "invoice",
      id: `i-${inv.invoiceDocId}`,
      primary: `Invoice #${inv.invoiceNo}`,
      secondary: `${inv.customerName} • ${inv.activityDate?.slice(0, 10) ?? ""}`,
      href: `/invoices/${inv.invoiceDocId}`,
    });
  }
  return hits;
}
