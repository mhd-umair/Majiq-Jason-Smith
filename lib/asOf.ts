import { getDb } from "@/lib/db";

let cachedAsOf: Date | null = null;

export function getDataAsOfDate(): Date {
  if (cachedAsOf) return cachedAsOf;
  const db = getDb();
  const row = db
    .prepare<unknown[], { maxDate: string | null }>(
      `SELECT MAX(ActivityDate) AS maxDate FROM InvoiceHeader`,
    )
    .get();
  const raw = row?.maxDate;
  cachedAsOf = raw ? new Date(raw) : new Date();
  if (Number.isNaN(cachedAsOf.getTime())) cachedAsOf = new Date();
  return cachedAsOf;
}

export function asOfIso(): string {
  return getDataAsOfDate().toISOString();
}
