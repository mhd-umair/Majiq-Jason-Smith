import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = path.resolve(process.cwd(), "perseus_equipment_database.db");

if (!fs.existsSync(DB_PATH)) {
  console.error(`[init-indexes] DB not found at ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH);

const indexes: { name: string; sql: string }[] = [
  {
    name: "idx_inv_status_date",
    sql: "CREATE INDEX IF NOT EXISTS idx_inv_status_date ON InvoiceHeader(Status, ActivityDate)",
  },
  {
    name: "idx_inv_customer",
    sql: "CREATE INDEX IF NOT EXISTS idx_inv_customer ON InvoiceHeader(CustomerId)",
  },
  {
    name: "idx_inv_type_status",
    sql: "CREATE INDEX IF NOT EXISTS idx_inv_type_status ON InvoiceHeader(InvoiceType, Status)",
  },
  {
    name: "idx_inv_wostatus",
    sql: "CREATE INDEX IF NOT EXISTS idx_inv_wostatus ON InvoiceHeader(WOStatusId)",
  },
  {
    name: "idx_invoice_detail_doc",
    sql: "CREATE INDEX IF NOT EXISTS idx_invoice_detail_doc ON InvoiceDetail(InvoiceDocId)",
  },
  {
    name: "idx_sale_part_item",
    sql: "CREATE INDEX IF NOT EXISTS idx_sale_part_item ON SalePart(ItemId)",
  },
  {
    name: "idx_sale_part_part",
    sql: "CREATE INDEX IF NOT EXISTS idx_sale_part_part ON SalePart(PartId)",
  },
  {
    name: "idx_sale_unit_item",
    sql: "CREATE INDEX IF NOT EXISTS idx_sale_unit_item ON SaleUnit(ItemId)",
  },
  {
    name: "idx_payment_doc",
    sql: "CREATE INDEX IF NOT EXISTS idx_payment_doc ON Payment(InvoiceDocId)",
  },
  {
    name: "idx_payment_method",
    sql: "CREATE INDEX IF NOT EXISTS idx_payment_method ON Payment(PaymentMethodId)",
  },
  {
    name: "idx_unit_status",
    sql: "CREATE INDEX IF NOT EXISTS idx_unit_status ON UnitBase(StockStatus)",
  },
  {
    name: "idx_unit_received",
    sql: "CREATE INDEX IF NOT EXISTS idx_unit_received ON UnitBase(DateReceived)",
  },
  {
    name: "idx_unit_category",
    sql: "CREATE INDEX IF NOT EXISTS idx_unit_category ON UnitBase(UnitCategoryId)",
  },
  {
    name: "idx_unit_customer_unit",
    sql: "CREATE INDEX IF NOT EXISTS idx_unit_customer_unit ON UnitCustomer(UnitId)",
  },
  {
    name: "idx_unit_customer_cust",
    sql: "CREATE INDEX IF NOT EXISTS idx_unit_customer_cust ON UnitCustomer(CustomerId)",
  },
  {
    name: "idx_segment_doc",
    sql: "CREATE INDEX IF NOT EXISTS idx_segment_doc ON InvoiceSegment(InvDocId)",
  },
  {
    name: "idx_wip_seg",
    sql: "CREATE INDEX IF NOT EXISTS idx_wip_seg ON WorkInProgress(SegmentId)",
  },
  {
    name: "idx_wip_tech",
    sql: "CREATE INDEX IF NOT EXISTS idx_wip_tech ON WorkInProgress(TechId)",
  },
  {
    name: "idx_contact_customer",
    sql: "CREATE INDEX IF NOT EXISTS idx_contact_customer ON Contact(CustomerId)",
  },
  {
    name: "idx_email_contact",
    sql: "CREATE INDEX IF NOT EXISTS idx_email_contact ON CustomerEmail(ContactId)",
  },
  {
    name: "idx_phone_contact",
    sql: "CREATE INDEX IF NOT EXISTS idx_phone_contact ON CustomerPhone(ContactId)",
  },
  {
    name: "idx_part_master_part",
    sql: "CREATE INDEX IF NOT EXISTS idx_part_master_part ON PartMaster(PartId)",
  },
  {
    name: "idx_part_master_partno",
    sql: "CREATE INDEX IF NOT EXISTS idx_part_master_partno ON PartMaster(PartNo)",
  },
  {
    name: "idx_part_location_part",
    sql: "CREATE INDEX IF NOT EXISTS idx_part_location_part ON PartLocation(PartId)",
  },
];

console.log(`[init-indexes] Creating helper indexes on ${DB_PATH}`);
const start = Date.now();
let created = 0;
for (const ix of indexes) {
  process.stdout.write(`  - ${ix.name} ... `);
  const before = Date.now();
  try {
    db.exec(ix.sql);
    console.log(`OK (${Date.now() - before}ms)`);
    created += 1;
  } catch (err) {
    console.log(`FAIL: ${(err as Error).message}`);
  }
}
console.log(`[init-indexes] Done. ${created}/${indexes.length} ensured in ${Date.now() - start}ms.`);
db.close();
