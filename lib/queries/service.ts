import { getDb } from "@/lib/db";
import { getDataAsOfDate } from "@/lib/asOf";
import { memo } from "@/lib/cache";
import { format, subMonths } from "date-fns";

const sqlDate = (d: Date) => format(d, "yyyy-MM-dd HH:mm:ss");

export interface OpenWOByStatus {
  statusId: number | null;
  status: string;
  openWOs: number;
  estimateTotal: number;
}

export async function getOpenWOByStatus(): Promise<OpenWOByStatus[]> {
  return memo("service:by-status", 60_000, () => {
    const db = getDb();
    return db
      .prepare<unknown[], OpenWOByStatus>(
        `SELECT ih.WOStatusId AS statusId,
                COALESCE(s.DisplayText, '(no status)') AS status,
                COUNT(*) AS openWOs,
                COALESCE(SUM(ih.WOEstimate), 0) AS estimateTotal
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

export interface TechWorkloadRow {
  techId: number | null;
  techName: string;
  openWOs: number;
  laborHours12mo: number;
}

export async function getTechWorkload(): Promise<TechWorkloadRow[]> {
  return memo("service:tech-workload", 60_000, () => {
    const db = getDb();
    const since = sqlDate(subMonths(getDataAsOfDate(), 12));
    return db
      .prepare<[string], TechWorkloadRow>(
        `SELECT t.AppUserId AS techId,
                TRIM(COALESCE(t.FirstName,'') || ' ' || COALESCE(t.LastName,'')) AS techName,
                COALESCE(open.openWOs, 0) AS openWOs,
                COALESCE(hrs.laborHours12mo, 0) AS laborHours12mo
         FROM AppUser t
         LEFT JOIN (
            SELECT WOTechId, COUNT(*) AS openWOs
            FROM InvoiceHeader
            WHERE InvoiceType = 'wo' AND Status NOT IN ('finalized','archived','voided')
              AND WOTechId IS NOT NULL
            GROUP BY WOTechId
         ) open ON open.WOTechId = t.AppUserId
         LEFT JOIN (
            SELECT TechId, SUM(ElapsedHours) AS laborHours12mo
            FROM WorkInProgress
            WHERE TimeOn >= ?
            GROUP BY TechId
         ) hrs ON hrs.TechId = t.AppUserId
         WHERE t.IsServiceTech = 1
         ORDER BY openWOs DESC, laborHours12mo DESC`,
      )
      .all(since);
  });
}

export interface OpenWORow {
  invoiceDocId: number;
  invoiceNo: string;
  woStatus: string;
  techName: string;
  customerName: string;
  customerId: number;
  unitDescription: string;
  unitNo: string;
  estimate: number;
  pickupDate: string | null;
  entDate: string;
  ageDays: number;
}

export async function getOpenWorkOrders(limit = 200): Promise<OpenWORow[]> {
  return memo(`service:open-list:${limit}`, 60_000, () => {
    const db = getDb();
    const asOf = sqlDate(getDataAsOfDate());
    return db
      .prepare<[string, number], OpenWORow>(
        `SELECT ih.InvoiceDocId AS invoiceDocId,
                ih.InvoiceNo AS invoiceNo,
                COALESCE(s.DisplayText, '(no status)') AS woStatus,
                TRIM(COALESCE(t.FirstName,'') || ' ' || COALESCE(t.LastName,'')) AS techName,
                ih.CustomerName AS customerName,
                ih.CustomerId AS customerId,
                ih.WOUnitDescription AS unitDescription,
                ih.WOUnitNo AS unitNo,
                COALESCE(ih.WOEstimate, 0) AS estimate,
                ih.WOPickupDate AS pickupDate,
                ih.EntDate AS entDate,
                CAST(julianday(?) - julianday(ih.EntDate) AS INT) AS ageDays
         FROM InvoiceHeader ih
         LEFT JOIN SettingsWorkOrderStatus s ON s.WorkOrderStatusId = ih.WOStatusId
         LEFT JOIN AppUser t ON t.AppUserId = ih.WOTechId
         WHERE ih.InvoiceType = 'wo'
           AND ih.Status NOT IN ('finalized','archived','voided')
         ORDER BY ageDays DESC
         LIMIT ?`,
      )
      .all(asOf, limit);
  });
}

export interface ScheduleAdherenceRow {
  status: string;
  count: number;
}

export async function getScheduleAdherence(): Promise<ScheduleAdherenceRow[]> {
  return memo("service:schedule-adherence", 60_000, () => {
    const db = getDb();
    return db
      .prepare<unknown[], ScheduleAdherenceRow>(
        `SELECT
            CASE
              WHEN ActualEndTime IS NULL THEN 'In progress'
              WHEN ScheduledEndTime IS NULL THEN 'No schedule'
              WHEN julianday(ActualEndTime) <= julianday(ScheduledEndTime) THEN 'On time'
              ELSE 'Late'
            END AS status,
            COUNT(*) AS count
         FROM WorkOrderSchedule
         GROUP BY status
         ORDER BY count DESC`,
      )
      .all();
  });
}

export interface WODetail {
  invoiceDocId: number;
  invoiceNo: string;
  status: string;
  woStatus: string;
  techName: string;
  customerName: string;
  customerId: number;
  unitDescription: string;
  unitNo: string;
  unitModel: string;
  unitBaseSerial: string;
  meter: number;
  estimate: number;
  total: number;
  entDate: string;
  pickupDate: string | null;
  deliveryDate: string | null;
  woDescription: string;
  printableComment: string;
}

export function getWODetail(invoiceDocId: number): WODetail | null {
  const db = getDb();
  const row = db
    .prepare<[number], WODetail>(
      `SELECT ih.InvoiceDocId AS invoiceDocId,
              ih.InvoiceNo AS invoiceNo,
              ih.Status AS status,
              COALESCE(s.DisplayText, '(no status)') AS woStatus,
              TRIM(COALESCE(t.FirstName,'') || ' ' || COALESCE(t.LastName,'')) AS techName,
              ih.CustomerName AS customerName,
              ih.CustomerId AS customerId,
              ih.WOUnitDescription AS unitDescription,
              ih.WOUnitNo AS unitNo,
              ih.WOUnitModel AS unitModel,
              ih.WOUnitBaseSerial AS unitBaseSerial,
              ih.WOMeter AS meter,
              COALESCE(ih.WOEstimate, 0) AS estimate,
              ih.TotalInvoice AS total,
              ih.EntDate AS entDate,
              ih.WOPickupDate AS pickupDate,
              ih.WODeliveryDate AS deliveryDate,
              ih.WODescription AS woDescription,
              ih.PrintableComment AS printableComment
       FROM InvoiceHeader ih
       LEFT JOIN SettingsWorkOrderStatus s ON s.WorkOrderStatusId = ih.WOStatusId
       LEFT JOIN AppUser t ON t.AppUserId = ih.WOTechId
       WHERE ih.InvoiceDocId = ?`,
    )
    .get(invoiceDocId);
  return row ?? null;
}

export interface WOSegmentRow {
  segmentId: number;
  status: string;
  displayText: string;
  actualHrs: number;
  flatRateHrs: number;
  laborRate: number;
  netExt: number;
  hasLabor: number;
  hasParts: number;
  stdJobCode: string;
}

export function getWOSegments(invoiceDocId: number): WOSegmentRow[] {
  const db = getDb();
  return db
    .prepare<[number], WOSegmentRow>(
      `SELECT SegmentId AS segmentId,
              Status AS status,
              DisplayText AS displayText,
              ActualHrs AS actualHrs,
              FlatRateLaborHrs AS flatRateHrs,
              LaborRate AS laborRate,
              NetExt AS netExt,
              HasLabor AS hasLabor,
              HasParts AS hasParts,
              StdJobCode AS stdJobCode
       FROM InvoiceSegment
       WHERE InvDocId = ?
       ORDER BY LineNo`,
    )
    .all(invoiceDocId);
}

export interface WIPEntryRow {
  wipId: number;
  techName: string;
  timeOn: string;
  timeOff: string | null;
  elapsedHours: number;
  comment: string;
}

export function getWOWIP(invoiceDocId: number): WIPEntryRow[] {
  const db = getDb();
  return db
    .prepare<[number], WIPEntryRow>(
      `SELECT wip.WIPId AS wipId,
              TRIM(COALESCE(t.FirstName,'') || ' ' || COALESCE(t.LastName,'')) AS techName,
              wip.TimeOn AS timeOn,
              wip.TimeOff AS timeOff,
              wip.ElapsedHours AS elapsedHours,
              COALESCE(wip.Comment, '') AS comment
       FROM WorkInProgress wip
       INNER JOIN InvoiceSegment seg ON seg.SegmentId = wip.SegmentId
       LEFT JOIN AppUser t ON t.AppUserId = wip.TechId
       WHERE seg.InvDocId = ?
       ORDER BY wip.TimeOn DESC`,
    )
    .all(invoiceDocId);
}

export interface WorkOrderScheduleRow {
  workOrderScheduleId: number;
  requiredStartTime: string | null;
  requiredEndTime: string | null;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
}

export function getWorkOrderScheduleForInvoice(invoiceDocId: number): WorkOrderScheduleRow[] {
  const db = getDb();
  return db
    .prepare<[number], WorkOrderScheduleRow>(
      `SELECT WorkOrderScheduleId AS workOrderScheduleId,
              RequiredStartTime AS requiredStartTime,
              RequiredEndTime AS requiredEndTime,
              ScheduledStartTime AS scheduledStartTime,
              ScheduledEndTime AS scheduledEndTime,
              ActualStartTime AS actualStartTime,
              ActualEndTime AS actualEndTime
       FROM WorkOrderSchedule
       WHERE InvoiceDocId = ?
       ORDER BY WorkOrderScheduleId`,
    )
    .all(invoiceDocId);
}

export interface OpenWOEstimateTotals {
  totalEstimate: number;
  totalCurrent: number;
}

export async function getOpenWOEstimateTotals(): Promise<OpenWOEstimateTotals> {
  return memo("service:open-estimate-totals", 60_000, () => {
    const db = getDb();
    return db
      .prepare<unknown[], OpenWOEstimateTotals>(
        `SELECT
            COALESCE(SUM(WOEstimate), 0) AS totalEstimate,
            COALESCE(SUM(TotalInvoice), 0) AS totalCurrent
         FROM InvoiceHeader
         WHERE InvoiceType = 'wo'
           AND Status NOT IN ('finalized','archived','voided')`,
      )
      .get()!;
  });
}
