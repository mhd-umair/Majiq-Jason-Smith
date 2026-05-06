import { getDb } from "@/lib/db";
import { getDataAsOfDate } from "@/lib/asOf";
import { memo } from "@/lib/cache";
import { getIncludeArchived, postedStatusSql } from "@/lib/posted-preference";
import { addDays, format, subMonths } from "date-fns";

const sqlDate = (d: Date) => format(d, "yyyy-MM-dd HH:mm:ss");

export interface CustomerLeaderboardRow {
  customerId: number;
  customerName: string;
  customerNo: string;
  revenue12mo: number;
  invoices12mo: number;
  lastPurchase: string | null;
  avgInvoice12mo: number;
}

export async function getCustomerLeaderboard(): Promise<CustomerLeaderboardRow[]> {
  const includeArchived = await getIncludeArchived();
  const postedIh = postedStatusSql(includeArchived, "ih");
  return memo(`customers:leaderboard:${includeArchived}`, 60_000, () => {
    const db = getDb();
    const since = sqlDate(subMonths(getDataAsOfDate(), 12));
    return db
      .prepare<[string, string, string], CustomerLeaderboardRow>(
        `SELECT c.CustomerId AS customerId,
                c.CustomerName AS customerName,
                c.CustomerNo AS customerNo,
                COALESCE(SUM(CASE WHEN ih.ActivityDate >= ? THEN ih.TotalInvoice END), 0) AS revenue12mo,
                COALESCE(SUM(CASE WHEN ih.ActivityDate >= ? THEN 1 ELSE 0 END), 0) AS invoices12mo,
                MAX(ih.ActivityDate) AS lastPurchase,
                COALESCE(AVG(CASE WHEN ih.ActivityDate >= ? THEN ih.TotalInvoice END), 0) AS avgInvoice12mo
         FROM Customer c
         LEFT JOIN InvoiceHeader ih ON ih.CustomerId = c.CustomerId
              AND ${postedIh}
         WHERE c.IsActive = 1
         GROUP BY c.CustomerId, c.CustomerName, c.CustomerNo
         HAVING revenue12mo > 0 OR invoices12mo > 0 OR lastPurchase IS NOT NULL
         ORDER BY revenue12mo DESC
         LIMIT 500`,
      )
      .all(since, since, since);
  });
}

export interface ActivitySegmentCounts {
  active: number;
  slowing: number;
  dormant: number;
  never: number;
}

export async function getActivitySegments(): Promise<ActivitySegmentCounts> {
  const includeArchived = await getIncludeArchived();
  const posted = postedStatusSql(includeArchived);
  return memo(`customers:activity-segments:${includeArchived}`, 60_000, () => {
    const db = getDb();
    const asOf = getDataAsOfDate();
    const d90 = sqlDate(addDays(asOf, -90));
    const d180 = sqlDate(addDays(asOf, -180));
    const row = db
      .prepare<[string, string, string, string], ActivitySegmentCounts>(
        `WITH last AS (
           SELECT CustomerId, MAX(ActivityDate) AS lastDate
           FROM InvoiceHeader
           WHERE ${posted}
           GROUP BY CustomerId
         )
         SELECT
           SUM(CASE WHEN l.lastDate >= ? THEN 1 ELSE 0 END) AS active,
           SUM(CASE WHEN l.lastDate < ? AND l.lastDate >= ? THEN 1 ELSE 0 END) AS slowing,
           SUM(CASE WHEN l.lastDate < ? THEN 1 ELSE 0 END) AS dormant,
           SUM(CASE WHEN l.lastDate IS NULL THEN 1 ELSE 0 END) AS never
         FROM Customer c
         LEFT JOIN last l ON l.CustomerId = c.CustomerId
         WHERE c.IsActive = 1`,
      )
      .get(d90, d90, d180, d180)!;
    return row;
  });
}

export interface ContactCompleteness {
  customers: number;
  withEmail: number;
  withPhone: number;
  withBoth: number;
}

export async function getContactCompleteness(): Promise<ContactCompleteness> {
  return memo("customers:contact-completeness", 60_000, () => {
    const db = getDb();
    return db
      .prepare<unknown[], ContactCompleteness>(
        `SELECT
           COUNT(*) AS customers,
           SUM(CASE WHEN ec.n > 0 THEN 1 ELSE 0 END) AS withEmail,
           SUM(CASE WHEN pc.n > 0 THEN 1 ELSE 0 END) AS withPhone,
           SUM(CASE WHEN ec.n > 0 AND pc.n > 0 THEN 1 ELSE 0 END) AS withBoth
         FROM Customer c
         LEFT JOIN (
           SELECT ct.CustomerId, COUNT(*) AS n
           FROM CustomerEmail e
           INNER JOIN Contact ct ON ct.ContactId = e.ContactId
           WHERE e.IsActive = 1 AND ct.IsActive = 1
           GROUP BY ct.CustomerId
         ) ec ON ec.CustomerId = c.CustomerId
         LEFT JOIN (
           SELECT ct.CustomerId, COUNT(*) AS n
           FROM CustomerPhone p
           INNER JOIN Contact ct ON ct.ContactId = p.ContactId
           WHERE p.IsActive = 1 AND ct.IsActive = 1
           GROUP BY ct.CustomerId
         ) pc ON pc.CustomerId = c.CustomerId
         WHERE c.IsActive = 1`,
      )
      .get()!;
  });
}

export interface CustomerProfile {
  customerId: number;
  customerName: string;
  customerNo: string;
  isBusiness: number;
  isActive: number;
  credLimit: number;
  creditHold: number;
  totalRevenue: number;
  invoiceCount: number;
  firstPurchase: string | null;
  lastPurchase: string | null;
  avgInvoice: number;
}

export async function getCustomerProfile(customerId: number): Promise<CustomerProfile | null> {
  const includeArchived = await getIncludeArchived();
  const postedIh = postedStatusSql(includeArchived, "ih");
  const db = getDb();
  const row = db
    .prepare<[number], CustomerProfile>(
      `SELECT c.CustomerId AS customerId,
              c.CustomerName AS customerName,
              c.CustomerNo AS customerNo,
              c.IsBusiness AS isBusiness,
              c.IsActive AS isActive,
              c.CredLimit AS credLimit,
              c.CreditHoldFlag AS creditHold,
              COALESCE(SUM(ih.TotalInvoice), 0) AS totalRevenue,
              COUNT(ih.InvoiceDocId) AS invoiceCount,
              MIN(ih.ActivityDate) AS firstPurchase,
              MAX(ih.ActivityDate) AS lastPurchase,
              COALESCE(AVG(ih.TotalInvoice), 0) AS avgInvoice
       FROM Customer c
       LEFT JOIN InvoiceHeader ih ON ih.CustomerId = c.CustomerId
            AND ${postedIh}
       WHERE c.CustomerId = ?
       GROUP BY c.CustomerId`,
    )
    .get(customerId);
  return row ?? null;
}

export interface CustomerInvoiceRow {
  invoiceDocId: number;
  invoiceNo: string;
  docNo: string;
  status: string;
  invoiceType: string;
  activityDate: string;
  customerId: number;
  customerName: string;
  customerNo: string;
  totalInvoice: number;
  salesPersonName: string;
}

export async function getCustomerInvoices(
  customerId: number,
  limit = 50,
): Promise<CustomerInvoiceRow[]> {
  const includeArchived = await getIncludeArchived();
  const posted = postedStatusSql(includeArchived);
  const db = getDb();
  return db
    .prepare<[number, number], CustomerInvoiceRow>(
      `SELECT InvoiceDocId AS invoiceDocId,
              InvoiceNo AS invoiceNo,
              DocNo AS docNo,
              Status AS status,
              InvoiceType AS invoiceType,
              ActivityDate AS activityDate,
              CustomerId AS customerId,
              CustomerName AS customerName,
              CustomerNo AS customerNo,
              TotalInvoice AS totalInvoice,
              SalesPersonName AS salesPersonName
       FROM InvoiceHeader
       WHERE CustomerId = ?
         AND ${posted}
       ORDER BY ActivityDate DESC, InvoiceDocId DESC
       LIMIT ?`,
    )
    .all(customerId, limit);
}

export interface CustomerPartRow {
  partId: number;
  partNo: string;
  description: string;
  qty: number;
  revenue: number;
  invoices: number;
}

export async function getCustomerTopParts(customerId: number, limit = 15): Promise<CustomerPartRow[]> {
  const includeArchived = await getIncludeArchived();
  const postedIh = postedStatusSql(includeArchived, "ih");
  const db = getDb();
  return db
    .prepare<[number, number], CustomerPartRow>(
      `SELECT sp.PartId AS partId,
              sp.PartNo AS partNo,
              MAX(sp.Description) AS description,
              SUM(sp.Qty) AS qty,
              SUM(sp.NetExt) AS revenue,
              COUNT(DISTINCT ih.InvoiceDocId) AS invoices
       FROM SalePart sp
       INNER JOIN InvoiceDetail id ON id.ItemId = sp.ItemId
       INNER JOIN InvoiceHeader ih ON ih.InvoiceDocId = id.InvoiceDocId
       WHERE ih.CustomerId = ?
         AND ${postedIh}
       GROUP BY sp.PartId, sp.PartNo
       ORDER BY revenue DESC
       LIMIT ?`,
    )
    .all(customerId, limit);
}

export interface CustomerUnitRow {
  unitId: number;
  stockNo: string;
  make: string;
  model: string;
  year: number;
  description: string;
  activity: string | null;
  eventDate: string | null;
  invoiceAmount: number | null;
}

export function getCustomerUnits(customerId: number, limit = 25): CustomerUnitRow[] {
  const db = getDb();
  return db
    .prepare<[number, number], CustomerUnitRow>(
      `SELECT u.UnitId AS unitId,
              u.StockNo AS stockNo,
              u.Make AS make,
              u.Model AS model,
              u.Year AS year,
              u.Description AS description,
              uc.Activity AS activity,
              uc.EventDate AS eventDate,
              uc.InvoiceAmount AS invoiceAmount
       FROM UnitCustomer uc
       INNER JOIN UnitBase u ON u.UnitId = uc.UnitId
       WHERE uc.CustomerId = ?
       ORDER BY uc.EventDate DESC, uc.CustomerUnitId DESC
       LIMIT ?`,
    )
    .all(customerId, limit);
}

export interface CustomerContactRow {
  contactId: number;
  firstName: string;
  lastName: string;
  isPrimary: number;
  email: string | null;
  phone: string | null;
}

export function getCustomerContacts(customerId: number): CustomerContactRow[] {
  const db = getDb();
  return db
    .prepare<[number], CustomerContactRow>(
      `SELECT ct.ContactId AS contactId,
              ct.FirstName AS firstName,
              ct.LastName AS lastName,
              ct.IsPrimary AS isPrimary,
              (SELECT e.Addr FROM CustomerEmail e WHERE e.ContactId = ct.ContactId AND e.IsActive = 1
                 ORDER BY e.IsDefault DESC, e.EmailId LIMIT 1) AS email,
              (SELECT p.Phone FROM CustomerPhone p WHERE p.ContactId = ct.ContactId AND p.IsActive = 1
                 ORDER BY p.IsDefault DESC, p.PhoneId LIMIT 1) AS phone
       FROM Contact ct
       WHERE ct.CustomerId = ? AND ct.IsActive = 1
       ORDER BY ct.IsPrimary DESC, ct.LastName, ct.FirstName`,
    )
    .all(customerId);
}
