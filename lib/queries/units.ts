import { getDb } from "@/lib/db";
import { getDataAsOfDate } from "@/lib/asOf";
import { memo } from "@/lib/cache";
import { getIncludeArchived, postedStatusSql } from "@/lib/posted-preference";
import { addDays, format } from "date-fns";

const sqlDate = (d: Date) => format(d, "yyyy-MM-dd HH:mm:ss");

export interface StockStatusRow {
  status: string;
  label: string;
  count: number;
  retail: number;
  cost: number;
}

export async function getStockStatusBreakdown(): Promise<StockStatusRow[]> {
  return memo("units:stock-status", 60_000, () => {
    const db = getDb();
    const labels: Record<string, string> = {
      instock: "In stock",
      customer: "Sold / customer",
      expected: "On order",
    };
    return db
      .prepare<unknown[], { status: string; count: number; retail: number; cost: number }>(
        `SELECT TRIM(StockStatus) AS status,
                COUNT(*) AS count,
                COALESCE(SUM(BaseRetail), 0) AS retail,
                COALESCE(SUM(BaseCost), 0) AS cost
         FROM UnitBase
         WHERE IsActive = 1
         GROUP BY TRIM(StockStatus)
         ORDER BY count DESC`,
      )
      .all()
      .map((r) => ({ ...r, label: labels[r.status] ?? r.status }));
  });
}

export interface NewVsUsedRow {
  bucket: string;
  count: number;
  retail: number;
}

export async function getNewVsUsed(): Promise<NewVsUsedRow[]> {
  return memo("units:new-vs-used", 60_000, () => {
    const db = getDb();
    return db
      .prepare<unknown[], NewVsUsedRow>(
        `SELECT CASE WHEN cond.IsNew = 1 THEN 'New' ELSE 'Used' END AS bucket,
                COUNT(*) AS count,
                COALESCE(SUM(u.BaseRetail), 0) AS retail
         FROM UnitBase u
         LEFT JOIN UnitCondition cond ON cond.UnitConditionId = u.UnitConditionId
         WHERE u.IsActive = 1 AND TRIM(u.StockStatus) = 'instock'
         GROUP BY bucket
         ORDER BY count DESC`,
      )
      .all();
  });
}

export interface AgingBucketRow {
  bucket: string;
  ord: number;
  count: number;
  retail: number;
}

export async function getInventoryAging(): Promise<AgingBucketRow[]> {
  return memo("units:aging", 60_000, () => {
    const db = getDb();
    const asOf = getDataAsOfDate();
    const buckets = [
      { name: "0-30", ord: 0, gte: 0, lt: 30 },
      { name: "31-60", ord: 1, gte: 30, lt: 60 },
      { name: "61-90", ord: 2, gte: 60, lt: 90 },
      { name: "91-180", ord: 3, gte: 90, lt: 180 },
      { name: "180+", ord: 4, gte: 180, lt: 999_999 },
    ];
    const stmt = db.prepare<unknown[], { count: number; retail: number }>(
      `SELECT COUNT(*) AS count, COALESCE(SUM(BaseRetail), 0) AS retail
       FROM UnitBase
       WHERE IsActive = 1
         AND TRIM(StockStatus) = 'instock'
         AND DateReceived IS NOT NULL
         AND CAST(julianday(@asOf) - julianday(DateReceived) AS INT) >= @gte
         AND CAST(julianday(@asOf) - julianday(DateReceived) AS INT) < @lt`,
    );
    const asOfStr = sqlDate(asOf);
    return buckets.map((b) => {
      const row = stmt.get({ asOf: asOfStr, gte: b.gte, lt: b.lt }) as {
        count: number;
        retail: number;
      };
      return { bucket: b.name, ord: b.ord, count: row.count, retail: row.retail };
    });
  });
}

export interface CategoryMixRow {
  categoryId: number;
  category: string;
  count: number;
  retail: number;
}

export async function getInventoryByCategory(): Promise<CategoryMixRow[]> {
  return memo("units:by-category", 60_000, () => {
    const db = getDb();
    return db
      .prepare<unknown[], CategoryMixRow>(
        `SELECT u.UnitCategoryId AS categoryId,
                COALESCE(c.DisplayText, '(unspecified)') AS category,
                COUNT(*) AS count,
                COALESCE(SUM(u.BaseRetail), 0) AS retail
         FROM UnitBase u
         LEFT JOIN UnitCategory c ON c.UnitCategoryId = u.UnitCategoryId
         WHERE u.IsActive = 1 AND TRIM(u.StockStatus) = 'instock'
         GROUP BY u.UnitCategoryId, c.DisplayText
         ORDER BY retail DESC`,
      )
      .all();
  });
}

export interface MakeMixRow {
  make: string;
  count: number;
  retail: number;
}

export async function getInventoryByMake(limit = 15): Promise<MakeMixRow[]> {
  return memo(`units:by-make:${limit}`, 60_000, () => {
    const db = getDb();
    return db
      .prepare<[number], MakeMixRow>(
        `SELECT TRIM(u.Make) AS make,
                COUNT(*) AS count,
                COALESCE(SUM(u.BaseRetail), 0) AS retail
         FROM UnitBase u
         WHERE u.IsActive = 1 AND TRIM(u.StockStatus) = 'instock'
         GROUP BY TRIM(u.Make)
         ORDER BY retail DESC
         LIMIT ?`,
      )
      .all(limit);
  });
}

export interface UnitListRow {
  unitId: number;
  stockNo: string;
  make: string;
  model: string;
  year: number;
  description: string;
  category: string | null;
  condition: string | null;
  isNew: number | null;
  baseRetail: number;
  baseCost: number;
  dateReceived: string | null;
  daysInStock: number | null;
  stockStatus: string;
}

export function getInStockUnits(limit = 1000): UnitListRow[] {
  const db = getDb();
  const asOf = sqlDate(getDataAsOfDate());
  return db
    .prepare<[string, number], UnitListRow>(
      `SELECT u.UnitId AS unitId,
              u.StockNo AS stockNo,
              u.Make AS make,
              u.Model AS model,
              u.Year AS year,
              u.Description AS description,
              c.DisplayText AS category,
              cond.DisplayText AS condition,
              cond.IsNew AS isNew,
              u.BaseRetail AS baseRetail,
              u.BaseCost AS baseCost,
              u.DateReceived AS dateReceived,
              CASE WHEN u.DateReceived IS NULL THEN NULL
                   ELSE CAST(julianday(?) - julianday(u.DateReceived) AS INT) END AS daysInStock,
              TRIM(u.StockStatus) AS stockStatus
       FROM UnitBase u
       LEFT JOIN UnitCategory c ON c.UnitCategoryId = u.UnitCategoryId
       LEFT JOIN UnitCondition cond ON cond.UnitConditionId = u.UnitConditionId
       WHERE u.IsActive = 1 AND TRIM(u.StockStatus) = 'instock'
       ORDER BY daysInStock DESC NULLS LAST
       LIMIT ?`,
    )
    .all(asOf, limit);
}

export interface UnitDetail extends UnitListRow {
  serialNo: string | null;
  warrantyDate: string | null;
  marginPct: number;
  rental: number;
  attachment: number;
}

export function getUnitDetail(unitId: number): UnitDetail | null {
  const db = getDb();
  const asOf = sqlDate(getDataAsOfDate());
  const row = db
    .prepare<[string, number], UnitDetail>(
      `SELECT u.UnitId AS unitId,
              u.StockNo AS stockNo,
              u.Make AS make,
              u.Model AS model,
              u.Year AS year,
              u.Description AS description,
              c.DisplayText AS category,
              cond.DisplayText AS condition,
              cond.IsNew AS isNew,
              u.BaseRetail AS baseRetail,
              u.BaseCost AS baseCost,
              u.DateReceived AS dateReceived,
              CASE WHEN u.DateReceived IS NULL THEN NULL
                   ELSE CAST(julianday(?) - julianday(u.DateReceived) AS INT) END AS daysInStock,
              TRIM(u.StockStatus) AS stockStatus,
              u.BaseSerial AS serialNo,
              u.BaseWarrantyDate AS warrantyDate,
              u.MarginPct AS marginPct,
              u.Rental AS rental,
              u.Attachment AS attachment
       FROM UnitBase u
       LEFT JOIN UnitCategory c ON c.UnitCategoryId = u.UnitCategoryId
       LEFT JOIN UnitCondition cond ON cond.UnitConditionId = u.UnitConditionId
       WHERE u.UnitId = ?`,
    )
    .get(asOf, unitId);
  return row ?? null;
}

export interface UnitHistoryRow {
  customerUnitId: number;
  customerId: number | null;
  customerName: string | null;
  activity: string | null;
  eventDate: string | null;
  invoiceAmount: number | null;
  tradeAmount: number;
  comment: string;
}

export function getUnitHistory(unitId: number): UnitHistoryRow[] {
  const db = getDb();
  return db
    .prepare<[number], UnitHistoryRow>(
      `SELECT uc.CustomerUnitId AS customerUnitId,
              uc.CustomerId AS customerId,
              c.CustomerName AS customerName,
              uc.Activity AS activity,
              uc.EventDate AS eventDate,
              uc.InvoiceAmount AS invoiceAmount,
              uc.TradeAmount AS tradeAmount,
              uc.Comment AS comment
       FROM UnitCustomer uc
       LEFT JOIN Customer c ON c.CustomerId = uc.CustomerId
       WHERE uc.UnitId = ?
       ORDER BY uc.EventDate DESC`,
    )
    .all(unitId);
}

export interface TradeInRow {
  tradeDetailId: number;
  unitId: number;
  stockNo: string;
  description: string;
  retail: number;
  tradeValue: number;
  meterReading: number;
}

export async function getRecentTradeIns(limit = 25): Promise<TradeInRow[]> {
  const includeArchived = await getIncludeArchived();
  const postedIh = postedStatusSql(includeArchived, "ih");
  return memo(`units:recent-trades:${limit}:${includeArchived}`, 60_000, () => {
    const db = getDb();
    return db
      .prepare<[number], TradeInRow>(
        `SELECT t.TradeDetailId AS tradeDetailId,
                t.UnitId AS unitId,
                t.StockNo AS stockNo,
                t.Description AS description,
                t.Retail AS retail,
                t.TradeValue AS tradeValue,
                t.MeterReading AS meterReading
         FROM SaleUnitTradeIn t
         INNER JOIN InvoiceDetail id ON id.ItemId = t.ItemId
         INNER JOIN InvoiceHeader ih ON ih.InvoiceDocId = id.InvoiceDocId
         WHERE ${postedIh}
         ORDER BY ih.ActivityDate DESC
         LIMIT ?`,
      )
      .all(limit);
  });
}
