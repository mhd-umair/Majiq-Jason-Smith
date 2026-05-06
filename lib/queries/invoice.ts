import { getDb } from "@/lib/db";

export interface InvoiceFull {
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
  finalizedDate: string | null;
  closedDate: string | null;
  voidedDate: string | null;
  poRefNo: string | null;
  printableComment: string;
  woUnitDescription: string;
  woUnitNo: string;
  woStatusId: number | null;
  woStatusLabel: string | null;
}

export function getInvoiceFull(invoiceDocId: number): InvoiceFull | null {
  const db = getDb();
  const row = db
    .prepare<[number], InvoiceFull>(
      `SELECT ih.InvoiceDocId AS invoiceDocId,
              ih.InvoiceNo AS invoiceNo,
              ih.DocNo AS docNo,
              ih.Status AS status,
              ih.InvoiceType AS invoiceType,
              ih.ActivityDate AS activityDate,
              ih.CustomerId AS customerId,
              ih.CustomerName AS customerName,
              ih.CustomerNo AS customerNo,
              ih.SalesPersonName AS salesPersonName,
              ih.TotalInvoice AS totalInvoice,
              ih.FinalizedDate AS finalizedDate,
              ih.ClosedDate AS closedDate,
              ih.VoidedDate AS voidedDate,
              ih.PORefNo AS poRefNo,
              ih.PrintableComment AS printableComment,
              ih.WOUnitDescription AS woUnitDescription,
              ih.WOUnitNo AS woUnitNo,
              ih.WOStatusId AS woStatusId,
              s.DisplayText AS woStatusLabel
       FROM InvoiceHeader ih
       LEFT JOIN SettingsWorkOrderStatus s ON s.WorkOrderStatusId = ih.WOStatusId
       WHERE ih.InvoiceDocId = ?`,
    )
    .get(invoiceDocId);
  return row ?? null;
}

export interface InvoiceLine {
  itemId: number;
  lineNo: number;
  itemType: string;
  displayText: string;
  description: string;
  qty: number;
  price: number;
  netExt: number;
  partId: number | null;
  partNo: string | null;
  unitId: number | null;
  stockNo: string | null;
}

export function getInvoiceLines(invoiceDocId: number): InvoiceLine[] {
  const db = getDb();
  return db
    .prepare<[number], InvoiceLine>(
      `SELECT id.ItemId AS itemId,
              id.LineNo AS lineNo,
              id.ItemType AS itemType,
              id.DisplayText AS displayText,
              id.Description AS description,
              id.Qty AS qty,
              id.Price AS price,
              id.NetExt AS netExt,
              sp.PartId AS partId,
              sp.PartNo AS partNo,
              su.UnitId AS unitId,
              su.StockNo AS stockNo
       FROM InvoiceDetail id
       LEFT JOIN SalePart sp ON sp.ItemId = id.ItemId
       LEFT JOIN SaleUnit su ON su.ItemId = id.ItemId
       WHERE id.InvoiceDocId = ?
       ORDER BY id.LineNo`,
    )
    .all(invoiceDocId);
}

export interface InvoiceSegmentRow {
  segmentId: number;
  status: string;
  displayText: string;
  netExt: number;
  actualHrs: number;
  laborRate: number;
}

export function getInvoiceSegments(invoiceDocId: number): InvoiceSegmentRow[] {
  const db = getDb();
  return db
    .prepare<[number], InvoiceSegmentRow>(
      `SELECT SegmentId AS segmentId,
              Status AS status,
              DisplayText AS displayText,
              NetExt AS netExt,
              ActualHrs AS actualHrs,
              LaborRate AS laborRate
       FROM InvoiceSegment
       WHERE InvDocId = ?
       ORDER BY LineNo`,
    )
    .all(invoiceDocId);
}
