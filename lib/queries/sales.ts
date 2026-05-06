import { getDb } from "@/lib/db";
import { getDataAsOfDate } from "@/lib/asOf";
import { memo } from "@/lib/cache";
import { getIncludeArchived, postedStatusSql } from "@/lib/posted-preference";
import { format, subMonths } from "date-fns";

const sqlDate = (d: Date) => format(d, "yyyy-MM-dd HH:mm:ss");

export interface InvoiceRow {
  invoiceDocId: number;
  invoiceNo: string;
  docNo: string;
  status: string;
  invoiceType: string;
  activityDate: string;
  customerId: number;
  customerName: string;
  customerNo: string;
  salesPersonName: string;
  totalInvoice: number;
}

export async function getInvoicesByMonth(year: number, month: number): Promise<InvoiceRow[]> {
  const includeArchived = await getIncludeArchived();
  const posted = postedStatusSql(includeArchived);
  const db = getDb();
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  return db
    .prepare<[string], InvoiceRow>(
      `SELECT InvoiceDocId AS invoiceDocId,
              InvoiceNo AS invoiceNo,
              DocNo AS docNo,
              Status AS status,
              InvoiceType AS invoiceType,
              ActivityDate AS activityDate,
              CustomerId AS customerId,
              CustomerName AS customerName,
              CustomerNo AS customerNo,
              SalesPersonName AS salesPersonName,
              TotalInvoice AS totalInvoice
       FROM InvoiceHeader
       WHERE ${posted}
         AND substr(ActivityDate, 1, 7) = ?
       ORDER BY ActivityDate DESC, InvoiceDocId DESC
       LIMIT 1000`,
    )
    .all(monthKey);
}

export interface InvoiceCountByStatus {
  status: string;
  count: number;
  total: number;
}

export async function getInvoiceCountsByStatus(monthsBack = 12): Promise<InvoiceCountByStatus[]> {
  return memo(`sales:counts-by-status:${monthsBack}`, 60_000, () => {
    const db = getDb();
    const since = sqlDate(subMonths(getDataAsOfDate(), monthsBack));
    return db
      .prepare<[string], InvoiceCountByStatus>(
        `SELECT Status AS status, COUNT(*) AS count, COALESCE(SUM(TotalInvoice), 0) AS total
         FROM InvoiceHeader
         WHERE ActivityDate >= ?
         GROUP BY Status
         ORDER BY count DESC`,
      )
      .all(since);
  });
}

export interface SalespersonRow {
  salesPersonName: string;
  revenue: number;
  invoices: number;
  avgInvoice: number;
}

export async function getTopSalespeople(monthsBack = 12, limit = 10): Promise<SalespersonRow[]> {
  const includeArchived = await getIncludeArchived();
  const posted = postedStatusSql(includeArchived);
  return memo(`sales:top-people:${monthsBack}:${limit}:${includeArchived}`, 60_000, () => {
    const db = getDb();
    const since = sqlDate(subMonths(getDataAsOfDate(), monthsBack));
    return db
      .prepare<[string, number], SalespersonRow>(
        `SELECT SalesPersonName AS salesPersonName,
                SUM(TotalInvoice) AS revenue,
                COUNT(*) AS invoices,
                AVG(TotalInvoice) AS avgInvoice
         FROM InvoiceHeader
         WHERE ${posted}
           AND ActivityDate >= ?
           AND TRIM(SalesPersonName) <> ''
         GROUP BY SalesPersonName
         ORDER BY revenue DESC
         LIMIT ?`,
      )
      .all(since, limit);
  });
}

export interface TaxableSplit {
  taxable: number;
  nonTaxable: number;
  total: number;
}

export async function getTaxableSplit(monthsBack = 12): Promise<TaxableSplit> {
  const includeArchived = await getIncludeArchived();
  const postedIh = postedStatusSql(includeArchived, "ih");
  return memo(`sales:taxable-split:${monthsBack}:${includeArchived}`, 60_000, () => {
    const db = getDb();
    const since = sqlDate(subMonths(getDataAsOfDate(), monthsBack));
    const row = db
      .prepare<[string], { taxable: number; nonTaxable: number; total: number }>(
        `SELECT
            COALESCE(SUM(st.TaxableAmount), 0) AS taxable,
            COALESCE(SUM(st.NonTaxableAmount), 0) AS nonTaxable,
            COALESCE(SUM(st.TotalSales), 0) AS total
         FROM SalesTax st
         INNER JOIN InvoiceHeader ih ON ih.InvoiceDocId = st.InvoiceDocId
         WHERE ${postedIh}
           AND ih.ActivityDate >= ?`,
      )
      .get(since)!;
    return row;
  });
}

export async function getRecentInvoices(limit = 50): Promise<InvoiceRow[]> {
  const includeArchived = await getIncludeArchived();
  const posted = postedStatusSql(includeArchived);
  const db = getDb();
  return db
    .prepare<[number], InvoiceRow>(
      `SELECT InvoiceDocId AS invoiceDocId,
              InvoiceNo AS invoiceNo,
              DocNo AS docNo,
              Status AS status,
              InvoiceType AS invoiceType,
              ActivityDate AS activityDate,
              CustomerId AS customerId,
              CustomerName AS customerName,
              CustomerNo AS customerNo,
              SalesPersonName AS salesPersonName,
              TotalInvoice AS totalInvoice
       FROM InvoiceHeader
       WHERE ${posted}
       ORDER BY ActivityDate DESC, InvoiceDocId DESC
       LIMIT ?`,
    )
    .all(limit);
}
