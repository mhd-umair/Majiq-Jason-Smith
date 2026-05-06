import { getDb } from "@/lib/db";
import { getDataAsOfDate } from "@/lib/asOf";
import { memo } from "@/lib/cache";
import { getIncludeArchived, postedStatusSql } from "@/lib/posted-preference";
import { addMonths, format, startOfMonth, subMonths } from "date-fns";

const sqlDate = (d: Date) => format(d, "yyyy-MM-dd HH:mm:ss");

export interface PaymentByMethod {
  paymentMethodId: number;
  method: string;
  payType: string;
  amount: number;
  count: number;
}

export async function getPaymentsByMethod(monthsBack = 12): Promise<PaymentByMethod[]> {
  return memo(`payments:by-method:${monthsBack}`, 60_000, () => {
    const db = getDb();
    const since = sqlDate(subMonths(getDataAsOfDate(), monthsBack));
    return db
      .prepare<[string], PaymentByMethod>(
        `SELECT pm.PaymentMethodId AS paymentMethodId,
                pm.DisplayText AS method,
                pm.PayType AS payType,
                COALESCE(SUM(p.Amount), 0) AS amount,
                COUNT(p.PaymentId) AS count
         FROM Payment p
         INNER JOIN PaymentMethod pm ON pm.PaymentMethodId = p.PaymentMethodId
         WHERE p.IsActive = 1 AND p.EntDate >= ?
         GROUP BY pm.PaymentMethodId, pm.DisplayText, pm.PayType
         ORDER BY amount DESC`,
      )
      .all(since);
  });
}

export interface PaymentVolumeRow {
  month: string;
  monthLabel: string;
  amount: number;
  count: number;
}

export async function getPaymentVolume(monthsBack = 12): Promise<PaymentVolumeRow[]> {
  return memo(`payments:volume:${monthsBack}`, 60_000, () => {
    const db = getDb();
    const asOf = getDataAsOfDate();
    const start = startOfMonth(subMonths(asOf, monthsBack - 1));
    const since = sqlDate(start);
    const rows = db
      .prepare<[string], { month: string; amount: number; count: number }>(
        `SELECT substr(EntDate, 1, 7) AS month,
                COALESCE(SUM(Amount), 0) AS amount,
                COUNT(*) AS count
         FROM Payment
         WHERE IsActive = 1 AND EntDate >= ?
         GROUP BY substr(EntDate, 1, 7)
         ORDER BY month`,
      )
      .all(since);
    const byMonth = new Map(rows.map((r) => [r.month, r]));
    const result: PaymentVolumeRow[] = [];
    for (let i = 0; i < monthsBack; i += 1) {
      const d = addMonths(start, i);
      const key = format(d, "yyyy-MM");
      const r = byMonth.get(key);
      result.push({
        month: key,
        monthLabel: format(d, "MMM yy"),
        amount: r?.amount ?? 0,
        count: r?.count ?? 0,
      });
    }
    return result;
  });
}

export interface OpenAROverview {
  totalOpen: number;
  invoiceCount: number;
  current30: number;
  d31to60: number;
  d61to90: number;
  d90plus: number;
}

export async function getOpenAROverview(): Promise<OpenAROverview> {
  const includeArchived = await getIncludeArchived();
  const postedIh = postedStatusSql(includeArchived, "ih");
  return memo(`payments:ar-overview:${includeArchived}`, 60_000, () => {
    const db = getDb();
    const asOf = sqlDate(getDataAsOfDate());
    const since = sqlDate(subMonths(getDataAsOfDate(), 24));
    return db
      .prepare<[string, string], OpenAROverview>(
        `WITH paid AS (
            SELECT InvoiceDocId, SUM(Amount) AS total_paid
            FROM Payment WHERE IsActive = 1
            GROUP BY InvoiceDocId
         ),
         open_inv AS (
            SELECT ih.InvoiceDocId,
                   MAX(0, ih.TotalInvoice - COALESCE(p.total_paid, 0)) AS open_amt,
                   CAST(julianday(?) - julianday(COALESCE(ih.FinalizedDate, ih.ActivityDate)) AS INT) AS age_days
            FROM InvoiceHeader ih
            LEFT JOIN paid p ON p.InvoiceDocId = ih.InvoiceDocId
            WHERE ${postedIh}
              AND ih.ActivityDate >= ?
              AND ih.TotalInvoice > COALESCE(p.total_paid, 0)
         )
         SELECT
            COALESCE(SUM(open_amt), 0) AS totalOpen,
            COUNT(*) AS invoiceCount,
            COALESCE(SUM(CASE WHEN age_days <= 30 THEN open_amt ELSE 0 END), 0) AS current30,
            COALESCE(SUM(CASE WHEN age_days BETWEEN 31 AND 60 THEN open_amt ELSE 0 END), 0) AS d31to60,
            COALESCE(SUM(CASE WHEN age_days BETWEEN 61 AND 90 THEN open_amt ELSE 0 END), 0) AS d61to90,
            COALESCE(SUM(CASE WHEN age_days > 90 THEN open_amt ELSE 0 END), 0) AS d90plus
         FROM open_inv`,
      )
      .get(asOf, since)!;
  });
}

export interface OpenARCustomerRow {
  customerId: number;
  customerName: string;
  customerNo: string;
  openAR: number;
  openInvoices: number;
}

export async function getTopOpenARCustomers(limit = 15): Promise<OpenARCustomerRow[]> {
  const includeArchived = await getIncludeArchived();
  const postedIh = postedStatusSql(includeArchived, "ih");
  return memo(`payments:top-ar:${limit}:${includeArchived}`, 60_000, () => {
    const db = getDb();
    const since = sqlDate(subMonths(getDataAsOfDate(), 24));
    return db
      .prepare<[string, number], OpenARCustomerRow>(
        `WITH paid AS (
           SELECT InvoiceDocId, SUM(Amount) AS total_paid
           FROM Payment WHERE IsActive = 1
           GROUP BY InvoiceDocId
         )
         SELECT ih.CustomerId AS customerId,
                ih.CustomerName AS customerName,
                ih.CustomerNo AS customerNo,
                SUM(MAX(0, ih.TotalInvoice - COALESCE(p.total_paid, 0))) AS openAR,
                SUM(CASE WHEN ih.TotalInvoice > COALESCE(p.total_paid, 0) THEN 1 ELSE 0 END) AS openInvoices
         FROM InvoiceHeader ih
         LEFT JOIN paid p ON p.InvoiceDocId = ih.InvoiceDocId
         WHERE ${postedIh}
           AND ih.ActivityDate >= ?
           AND ih.TotalInvoice > COALESCE(p.total_paid, 0)
         GROUP BY ih.CustomerId, ih.CustomerName, ih.CustomerNo
         ORDER BY openAR DESC
         LIMIT ?`,
      )
      .all(since, limit);
  });
}

export interface DaysToPayResult {
  averageDays: number;
  medianDays: number;
  invoicesAnalyzed: number;
}

export async function getDaysToPay(monthsBack = 12): Promise<DaysToPayResult> {
  const includeArchived = await getIncludeArchived();
  const postedIh = postedStatusSql(includeArchived, "ih");
  return memo(`payments:days-to-pay:${monthsBack}:${includeArchived}`, 60_000, () => {
    const db = getDb();
    const since = sqlDate(subMonths(getDataAsOfDate(), monthsBack));
    const rows = db
      .prepare<[string], { days: number }>(
        `SELECT julianday(MIN(p.EntDate)) - julianday(ih.FinalizedDate) AS days
         FROM InvoiceHeader ih
         INNER JOIN Payment p ON p.InvoiceDocId = ih.InvoiceDocId
         WHERE ${postedIh}
           AND ih.FinalizedDate IS NOT NULL
           AND ih.FinalizedDate >= ?
           AND p.IsActive = 1
         GROUP BY ih.InvoiceDocId, ih.FinalizedDate
         HAVING days >= 0`,
      )
      .all(since);
    if (rows.length === 0) return { averageDays: 0, medianDays: 0, invoicesAnalyzed: 0 };
    const sorted = rows.map((r) => r.days).sort((a, b) => a - b);
    const avg = sorted.reduce((s, d) => s + d, 0) / sorted.length;
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    return { averageDays: avg, medianDays: median, invoicesAnalyzed: sorted.length };
  });
}

export interface InvoicePaymentRow {
  paymentId: number;
  paymentDate: string;
  method: string;
  amount: number;
  authorized: number;
}

export function getInvoicePayments(invoiceDocId: number): InvoicePaymentRow[] {
  const db = getDb();
  return db
    .prepare<[number], InvoicePaymentRow>(
      `SELECT p.PaymentId AS paymentId,
              p.EntDate AS paymentDate,
              pm.DisplayText AS method,
              p.Amount AS amount,
              p.Authorized AS authorized
       FROM Payment p
       INNER JOIN PaymentMethod pm ON pm.PaymentMethodId = p.PaymentMethodId
       WHERE p.InvoiceDocId = ? AND p.IsActive = 1
       ORDER BY p.EntDate DESC`,
    )
    .all(invoiceDocId);
}
