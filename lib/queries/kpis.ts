import { getDb } from "@/lib/db";
import { getDataAsOfDate } from "@/lib/asOf";
import { memo } from "@/lib/cache";
import { getIncludeArchived, postedStatusSql } from "@/lib/posted-preference";
import { addDays, addMonths, format, startOfMonth, subMonths } from "date-fns";

const sqlDate = (d: Date) => format(d, "yyyy-MM-dd HH:mm:ss");

export interface ExecKpis {
  revenue12mo: number;
  revenue12moPrior: number;
  revenue12moDelta: number | null;
  mtdRevenue: number;
  mtdRevenuePrior: number;
  mtdRevenueDelta: number | null;
  activeCustomers90d: number;
  activeCustomers90dPrior: number;
  activeCustomers90dDelta: number | null;
  avgInvoice12mo: number;
  avgInvoice12moPrior: number;
  avgInvoice12moDelta: number | null;
  openWorkOrders: number;
  inStockUnits: number;
  inStockRetail: number;
  openAR: number;
  openARInvoices: number;
}

export async function getExecKpis(): Promise<ExecKpis> {
  const includeArchived = await getIncludeArchived();
  const posted = postedStatusSql(includeArchived);
  const postedIh = postedStatusSql(includeArchived, "ih");
  return memo(`kpis:exec:${includeArchived}`, 60_000, () => {
    const db = getDb();
    const asOf = getDataAsOfDate();
    const since12 = sqlDate(subMonths(asOf, 12));
    const since24 = sqlDate(subMonths(asOf, 24));
    const startMtd = sqlDate(startOfMonth(asOf));
    const startMtdPrior = sqlDate(startOfMonth(subMonths(asOf, 1)));
    const endMtdPrior = sqlDate(addDays(startOfMonth(asOf), -1));
    const since90 = sqlDate(addDays(asOf, -90));
    const since180 = sqlDate(addDays(asOf, -180));
    const upTo = sqlDate(asOf);

    const sumPosted = db.prepare<[string, string], { total: number; n: number }>(
      `SELECT COALESCE(SUM(TotalInvoice), 0) AS total, COUNT(*) AS n
       FROM InvoiceHeader
       WHERE ${posted}
         AND ActivityDate >= ? AND ActivityDate <= ?`,
    );
    const r12 = sumPosted.get(since12, upTo)!;
    const r12prior = sumPosted.get(since24, since12)!;
    const mtd = sumPosted.get(startMtd, upTo)!;
    const mtdPrior = sumPosted.get(startMtdPrior, endMtdPrior)!;

    const customers90 = db
      .prepare<[string, string], { n: number }>(
        `SELECT COUNT(DISTINCT CustomerId) AS n
         FROM InvoiceHeader
         WHERE ${posted}
           AND ActivityDate >= ? AND ActivityDate <= ?`,
      )
      .get(since90, upTo)!.n;
    const customers90prior = db
      .prepare<[string, string], { n: number }>(
        `SELECT COUNT(DISTINCT CustomerId) AS n
         FROM InvoiceHeader
         WHERE ${posted}
           AND ActivityDate >= ? AND ActivityDate <= ?`,
      )
      .get(since180, since90)!.n;

    const openWO = db
      .prepare<unknown[], { n: number }>(
        `SELECT COUNT(*) AS n
         FROM InvoiceHeader
         WHERE InvoiceType = 'wo'
           AND Status NOT IN ('finalized','archived','voided')`,
      )
      .get()!.n;

    const stock = db
      .prepare<unknown[], { n: number; retail: number }>(
        `SELECT COUNT(*) AS n, COALESCE(SUM(BaseRetail), 0) AS retail
         FROM UnitBase
         WHERE TRIM(StockStatus) = 'instock'
           AND IsActive = 1`,
      )
      .get()!;

    const ar = db
      .prepare<[string], { open_ar: number; n: number }>(
        `WITH paid AS (
           SELECT InvoiceDocId, SUM(Amount) AS total_paid
           FROM Payment
           WHERE IsActive = 1
           GROUP BY InvoiceDocId
         )
         SELECT
           COALESCE(SUM(MAX(0, ih.TotalInvoice - COALESCE(p.total_paid, 0))), 0) AS open_ar,
           SUM(CASE WHEN ih.TotalInvoice > COALESCE(p.total_paid, 0) THEN 1 ELSE 0 END) AS n
         FROM InvoiceHeader ih
         LEFT JOIN paid p ON p.InvoiceDocId = ih.InvoiceDocId
         WHERE ${postedIh}
           AND ih.ActivityDate >= ?`,
      )
      .get(since24)!;

    const delta = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null);
    const avg12 = r12.n > 0 ? r12.total / r12.n : 0;
    const avg12prior = r12prior.n > 0 ? r12prior.total / r12prior.n : 0;

    return {
      revenue12mo: r12.total,
      revenue12moPrior: r12prior.total,
      revenue12moDelta: delta(r12.total, r12prior.total),
      mtdRevenue: mtd.total,
      mtdRevenuePrior: mtdPrior.total,
      mtdRevenueDelta: delta(mtd.total, mtdPrior.total),
      activeCustomers90d: customers90,
      activeCustomers90dPrior: customers90prior,
      activeCustomers90dDelta: delta(customers90, customers90prior),
      avgInvoice12mo: avg12,
      avgInvoice12moPrior: avg12prior,
      avgInvoice12moDelta: delta(avg12, avg12prior),
      openWorkOrders: openWO,
      inStockUnits: stock.n,
      inStockRetail: stock.retail,
      openAR: ar.open_ar,
      openARInvoices: ar.n,
    };
  });
}

export interface RevenueByMonthRow {
  month: string;
  monthLabel: string;
  revenue: number;
  invoices: number;
}

export async function getRevenueByMonth(monthsBack = 24): Promise<RevenueByMonthRow[]> {
  const includeArchived = await getIncludeArchived();
  const posted = postedStatusSql(includeArchived);
  return memo(`kpis:rev-by-month:${monthsBack}:${includeArchived}`, 60_000, () => {
    const db = getDb();
    const asOf = getDataAsOfDate();
    const start = startOfMonth(subMonths(asOf, monthsBack - 1));
    const since = sqlDate(start);
    const upTo = sqlDate(asOf);
    const rows = db
      .prepare<[string, string], { month: string; revenue: number; invoices: number }>(
        `SELECT substr(ActivityDate, 1, 7) AS month,
                COALESCE(SUM(TotalInvoice), 0) AS revenue,
                COUNT(*) AS invoices
         FROM InvoiceHeader
         WHERE ${posted}
           AND ActivityDate >= ? AND ActivityDate <= ?
         GROUP BY substr(ActivityDate, 1, 7)
         ORDER BY month`,
      )
      .all(since, upTo);
    const byMonth = new Map(rows.map((r) => [r.month, r]));
    const result: RevenueByMonthRow[] = [];
    for (let i = 0; i < monthsBack; i += 1) {
      const d = addMonths(start, i);
      const key = format(d, "yyyy-MM");
      const row = byMonth.get(key);
      result.push({
        month: key,
        monthLabel: format(d, "MMM yy"),
        revenue: row?.revenue ?? 0,
        invoices: row?.invoices ?? 0,
      });
    }
    return result;
  });
}

export interface RevenueByTypeRow {
  type: string;
  label: string;
  revenue: number;
  invoices: number;
}

export async function getRevenueByType(monthsBack = 12): Promise<RevenueByTypeRow[]> {
  const includeArchived = await getIncludeArchived();
  const posted = postedStatusSql(includeArchived);
  return memo(`kpis:rev-by-type:${monthsBack}:${includeArchived}`, 60_000, () => {
    const db = getDb();
    const since = sqlDate(subMonths(getDataAsOfDate(), monthsBack));
    const rows = db
      .prepare<[string], { type: string; revenue: number; invoices: number }>(
        `SELECT InvoiceType AS type, SUM(TotalInvoice) AS revenue, COUNT(*) AS invoices
         FROM InvoiceHeader
         WHERE ${posted} AND ActivityDate >= ?
         GROUP BY InvoiceType
         ORDER BY revenue DESC`,
      )
      .all(since);
    const labels: Record<string, string> = { in: "Sales", wo: "Service", rl: "Rental" };
    return rows.map((r) => ({ ...r, label: labels[r.type] ?? r.type }));
  });
}

export interface TopCustomerRow {
  customerId: number;
  customerName: string;
  customerNo: string;
  revenue: number;
  invoices: number;
}

export async function getTopCustomers(limit = 10, monthsBack = 12): Promise<TopCustomerRow[]> {
  const includeArchived = await getIncludeArchived();
  const postedIh = postedStatusSql(includeArchived, "ih");
  return memo(`kpis:top-customers:${limit}:${monthsBack}:${includeArchived}`, 60_000, () => {
    const db = getDb();
    const since = sqlDate(subMonths(getDataAsOfDate(), monthsBack));
    return db
      .prepare<[string, number], TopCustomerRow>(
        `SELECT ih.CustomerId AS customerId,
                ih.CustomerName AS customerName,
                ih.CustomerNo AS customerNo,
                SUM(ih.TotalInvoice) AS revenue,
                COUNT(*) AS invoices
         FROM InvoiceHeader ih
         WHERE ${postedIh} AND ih.ActivityDate >= ?
         GROUP BY ih.CustomerId, ih.CustomerName, ih.CustomerNo
         ORDER BY revenue DESC
         LIMIT ?`,
      )
      .all(since, limit);
  });
}

export interface WorkOrderStatusRow {
  statusId: number | null;
  status: string;
  openWOs: number;
}

export async function getOpenWorkOrdersByStatus(): Promise<WorkOrderStatusRow[]> {
  return memo("kpis:wo-by-status", 60_000, () => {
    const db = getDb();
    return db
      .prepare<unknown[], WorkOrderStatusRow>(
        `SELECT ih.WOStatusId AS statusId,
                COALESCE(s.DisplayText, 'No status') AS status,
                COUNT(*) AS openWOs
         FROM InvoiceHeader ih
         LEFT JOIN SettingsWorkOrderStatus s ON s.WorkOrderStatusId = ih.WOStatusId
         WHERE ih.InvoiceType = 'wo'
           AND ih.Status NOT IN ('finalized','archived','voided')
         GROUP BY ih.WOStatusId, s.DisplayText
         ORDER BY openWOs DESC`,
      )
      .all();
  });
}
