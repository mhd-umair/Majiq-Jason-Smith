import { getDb } from "@/lib/db";
import { getDataAsOfDate } from "@/lib/asOf";
import { memo } from "@/lib/cache";
import { getIncludeArchived, postedStatusSql } from "@/lib/posted-preference";
import { format, subMonths } from "date-fns";

const sqlDate = (d: Date) => format(d, "yyyy-MM-dd HH:mm:ss");

export interface TopPartRow {
  partId: number;
  partNo: string;
  description: string;
  mfgCode: string;
  qty: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number | null;
  invoices: number;
}

export async function getTopPartsByRevenue(monthsBack = 12, limit = 25): Promise<TopPartRow[]> {
  const includeArchived = await getIncludeArchived();
  const postedIh = postedStatusSql(includeArchived, "ih");
  return memo(`parts:top-by-rev:${monthsBack}:${limit}:${includeArchived}`, 60_000, () => {
    const db = getDb();
    const since = sqlDate(subMonths(getDataAsOfDate(), monthsBack));
    const rows = db
      .prepare<[string, number], TopPartRow>(
        `SELECT sp.PartId AS partId,
                sp.PartNo AS partNo,
                MAX(sp.Description) AS description,
                MAX(sp.MfgCode) AS mfgCode,
                SUM(sp.Qty) AS qty,
                SUM(sp.NetExt) AS revenue,
                SUM(COALESCE(sp.AvgCost, 0) * sp.Qty) AS cost,
                COUNT(DISTINCT ih.InvoiceDocId) AS invoices
         FROM SalePart sp
         INNER JOIN InvoiceDetail id ON id.ItemId = sp.ItemId
         INNER JOIN InvoiceHeader ih ON ih.InvoiceDocId = id.InvoiceDocId
         WHERE ${postedIh}
           AND ih.ActivityDate >= ?
         GROUP BY sp.PartId, sp.PartNo
         ORDER BY revenue DESC
         LIMIT ?`,
      )
      .all(since, limit);
    return rows.map((r) => {
      const margin = r.revenue - r.cost;
      const marginPct = r.revenue > 0 ? (margin / r.revenue) * 100 : null;
      return { ...r, margin, marginPct };
    });
  });
}

export async function getTopPartsByQty(monthsBack = 12, limit = 25): Promise<TopPartRow[]> {
  const includeArchived = await getIncludeArchived();
  const postedIh = postedStatusSql(includeArchived, "ih");
  return memo(`parts:top-by-qty:${monthsBack}:${limit}:${includeArchived}`, 60_000, () => {
    const db = getDb();
    const since = sqlDate(subMonths(getDataAsOfDate(), monthsBack));
    const rows = db
      .prepare<[string, number], TopPartRow>(
        `SELECT sp.PartId AS partId,
                sp.PartNo AS partNo,
                MAX(sp.Description) AS description,
                MAX(sp.MfgCode) AS mfgCode,
                SUM(sp.Qty) AS qty,
                SUM(sp.NetExt) AS revenue,
                SUM(COALESCE(sp.AvgCost, 0) * sp.Qty) AS cost,
                COUNT(DISTINCT ih.InvoiceDocId) AS invoices
         FROM SalePart sp
         INNER JOIN InvoiceDetail id ON id.ItemId = sp.ItemId
         INNER JOIN InvoiceHeader ih ON ih.InvoiceDocId = id.InvoiceDocId
         WHERE ${postedIh}
           AND ih.ActivityDate >= ?
         GROUP BY sp.PartId, sp.PartNo
         ORDER BY qty DESC
         LIMIT ?`,
      )
      .all(since, limit);
    return rows.map((r) => {
      const margin = r.revenue - r.cost;
      const marginPct = r.revenue > 0 ? (margin / r.revenue) * 100 : null;
      return { ...r, margin, marginPct };
    });
  });
}

export interface PartManufacturerRow {
  mfgId: number;
  mfgCode: string;
  displayText: string;
  revenue: number;
  qty: number;
}

export interface PartGroupRevenueRow {
  partGroupId: number | null;
  displayText: string;
  revenue: number;
  qty: number;
}

export async function getRevenueByPartGroup(monthsBack = 12): Promise<PartGroupRevenueRow[]> {
  const includeArchived = await getIncludeArchived();
  const postedIh = postedStatusSql(includeArchived, "ih");
  return memo(`parts:rev-by-group:${monthsBack}:${includeArchived}`, 60_000, () => {
    const db = getDb();
    const since = sqlDate(subMonths(getDataAsOfDate(), monthsBack));
    return db
      .prepare<[string], PartGroupRevenueRow>(
        `SELECT pg.PartGroupId AS partGroupId,
                COALESCE(pg.DisplayText, '(ungrouped)') AS displayText,
                COALESCE(SUM(sp.NetExt), 0) AS revenue,
                COALESCE(SUM(sp.Qty), 0) AS qty
         FROM SalePart sp
         INNER JOIN InvoiceDetail id ON id.ItemId = sp.ItemId
         INNER JOIN InvoiceHeader ih ON ih.InvoiceDocId = id.InvoiceDocId
         LEFT JOIN PartMaster pm ON pm.PartId = sp.PartId
         LEFT JOIN PartGroup pg ON pg.PartGroupId = pm.PartGroupId
         WHERE ${postedIh}
           AND ih.ActivityDate >= ?
         GROUP BY pg.PartGroupId, pg.DisplayText
         ORDER BY revenue DESC`,
      )
      .all(since);
  });
}

export async function getRevenueByManufacturer(monthsBack = 12): Promise<PartManufacturerRow[]> {
  const includeArchived = await getIncludeArchived();
  const postedIh = postedStatusSql(includeArchived, "ih");
  return memo(`parts:rev-by-mfg:${monthsBack}:${includeArchived}`, 60_000, () => {
    const db = getDb();
    const since = sqlDate(subMonths(getDataAsOfDate(), monthsBack));
    return db
      .prepare<[string], PartManufacturerRow>(
        `SELECT pm.MfgId AS mfgId,
                pm.MfgCode AS mfgCode,
                pm.DisplayText AS displayText,
                COALESCE(SUM(sp.NetExt), 0) AS revenue,
                COALESCE(SUM(sp.Qty), 0) AS qty
         FROM PartManufacturer pm
         LEFT JOIN SalePart sp ON sp.MfgId = pm.MfgId
         LEFT JOIN InvoiceDetail id ON id.ItemId = sp.ItemId
         LEFT JOIN InvoiceHeader ih ON ih.InvoiceDocId = id.InvoiceDocId
              AND ${postedIh}
              AND ih.ActivityDate >= ?
         WHERE pm.IsActive = 1
         GROUP BY pm.MfgId, pm.MfgCode, pm.DisplayText
         ORDER BY revenue DESC`,
      )
      .all(since);
  });
}

export interface PartsStockingPolicy {
  totalParts: number;
  withMinMax: number;
  withoutMinMax: number;
  staleCount30d: number;
  staleCount90d: number;
}

export async function getPartsStockingPolicy(): Promise<PartsStockingPolicy> {
  return memo("parts:stocking-policy", 60_000, () => {
    const db = getDb();
    const asOf = getDataAsOfDate();
    const d30 = sqlDate(new Date(asOf.getTime() - 30 * 24 * 60 * 60 * 1000));
    const d90 = sqlDate(new Date(asOf.getTime() - 90 * 24 * 60 * 60 * 1000));
    return db
      .prepare<[string, string], PartsStockingPolicy>(
        `SELECT
            COUNT(*) AS totalParts,
            SUM(CASE WHEN (MinStock > 0 OR MaxStock > 0) THEN 1 ELSE 0 END) AS withMinMax,
            SUM(CASE WHEN (MinStock = 0 AND MaxStock = 0) THEN 1 ELSE 0 END) AS withoutMinMax,
            SUM(CASE WHEN LastCountDate IS NULL OR LastCountDate < ? THEN 1 ELSE 0 END) AS staleCount30d,
            SUM(CASE WHEN LastCountDate IS NULL OR LastCountDate < ? THEN 1 ELSE 0 END) AS staleCount90d
         FROM PartLocation
         WHERE IsActive = 1`,
      )
      .get(d30, d90)!;
  });
}

export interface PartDetail {
  partId: number;
  partNo: string;
  description: string;
  partStatus: string;
  partType: string;
  mfgCode: string;
  mfgDisplay: string;
  groupDisplay: string | null;
  weight: number;
  serialized: number;
  isActive: number;
  qty12mo: number;
  revenue12mo: number;
  cost12mo: number;
  invoices12mo: number;
  minStock: number | null;
  maxStock: number | null;
  bin: string | null;
  lastCountDate: string | null;
}

export async function getPartDetail(partId: number): Promise<PartDetail | null> {
  const includeArchived = await getIncludeArchived();
  const postedIh = postedStatusSql(includeArchived, "ih");
  const db = getDb();
  const since = sqlDate(subMonths(getDataAsOfDate(), 12));
  const stmt = db.prepare(
    `SELECT
        pm.PartId AS partId,
        pm.PartNo AS partNo,
        pm.Description AS description,
        pm.PartStatus AS partStatus,
        pm.PartType AS partType,
        mfg.MfgCode AS mfgCode,
        mfg.DisplayText AS mfgDisplay,
        pg.DisplayText AS groupDisplay,
        pm.Weight AS weight,
        pm.Serialized AS serialized,
        pm.IsActive AS isActive,
        COALESCE((
          SELECT SUM(sp.Qty) FROM SalePart sp
          INNER JOIN InvoiceDetail id ON id.ItemId = sp.ItemId
          INNER JOIN InvoiceHeader ih ON ih.InvoiceDocId = id.InvoiceDocId
          WHERE sp.PartId = pm.PartId AND ${postedIh}
            AND ih.ActivityDate >= @since
        ), 0) AS qty12mo,
        COALESCE((
          SELECT SUM(sp.NetExt) FROM SalePart sp
          INNER JOIN InvoiceDetail id ON id.ItemId = sp.ItemId
          INNER JOIN InvoiceHeader ih ON ih.InvoiceDocId = id.InvoiceDocId
          WHERE sp.PartId = pm.PartId AND ${postedIh}
            AND ih.ActivityDate >= @since
        ), 0) AS revenue12mo,
        COALESCE((
          SELECT SUM(COALESCE(sp.AvgCost, 0) * sp.Qty) FROM SalePart sp
          INNER JOIN InvoiceDetail id ON id.ItemId = sp.ItemId
          INNER JOIN InvoiceHeader ih ON ih.InvoiceDocId = id.InvoiceDocId
          WHERE sp.PartId = pm.PartId AND ${postedIh}
            AND ih.ActivityDate >= @since
        ), 0) AS cost12mo,
        COALESCE((
          SELECT COUNT(DISTINCT ih.InvoiceDocId) FROM SalePart sp
          INNER JOIN InvoiceDetail id ON id.ItemId = sp.ItemId
          INNER JOIN InvoiceHeader ih ON ih.InvoiceDocId = id.InvoiceDocId
          WHERE sp.PartId = pm.PartId AND ${postedIh}
            AND ih.ActivityDate >= @since
        ), 0) AS invoices12mo,
        (SELECT MinStock FROM PartLocation WHERE PartId = pm.PartId LIMIT 1) AS minStock,
        (SELECT MaxStock FROM PartLocation WHERE PartId = pm.PartId LIMIT 1) AS maxStock,
        (SELECT Bin FROM PartLocation WHERE PartId = pm.PartId LIMIT 1) AS bin,
        (SELECT LastCountDate FROM PartLocation WHERE PartId = pm.PartId LIMIT 1) AS lastCountDate
     FROM PartMaster pm
     LEFT JOIN PartManufacturer mfg ON mfg.MfgId = pm.MfgId
     LEFT JOIN PartGroup pg ON pg.PartGroupId = pm.PartGroupId
     WHERE pm.PartId = @partId`,
  );
  const row = stmt.get({ since, partId }) as PartDetail | undefined;
  return row ?? null;
}

export interface PartInvoiceRow {
  invoiceDocId: number;
  invoiceNo: string;
  activityDate: string;
  customerId: number;
  customerName: string;
  qty: number;
  unitPrice: number;
  netExt: number;
}

export async function getInvoicesForPart(partId: number, limit = 100): Promise<PartInvoiceRow[]> {
  const includeArchived = await getIncludeArchived();
  const postedIh = postedStatusSql(includeArchived, "ih");
  const db = getDb();
  return db
    .prepare<[number, number], PartInvoiceRow>(
      `SELECT ih.InvoiceDocId AS invoiceDocId,
              ih.InvoiceNo AS invoiceNo,
              ih.ActivityDate AS activityDate,
              ih.CustomerId AS customerId,
              ih.CustomerName AS customerName,
              sp.Qty AS qty,
              sp.UnitPrice AS unitPrice,
              sp.NetExt AS netExt
       FROM SalePart sp
       INNER JOIN InvoiceDetail id ON id.ItemId = sp.ItemId
       INNER JOIN InvoiceHeader ih ON ih.InvoiceDocId = id.InvoiceDocId
       WHERE sp.PartId = ?
         AND ${postedIh}
       ORDER BY ih.ActivityDate DESC
       LIMIT ?`,
    )
    .all(partId, limit);
}
