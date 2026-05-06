import Database, { type Database as DB } from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

declare global {
  // eslint-disable-next-line no-var
  var __perseus_db__: DB | undefined;
}

export const DB_PATH = path.resolve(process.cwd(), "perseus_equipment_database.db");

function openDb(): DB {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(
        `perseus_equipment_database.db not found at ${DB_PATH}. ` +
        "Place the SQLite file in the project folder and restart the application.",
    );
  }
  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  db.pragma("journal_mode = OFF");
  db.pragma("query_only = ON");
  db.pragma("temp_store = MEMORY");
  return db;
}

export function getDb(): DB {
  if (!global.__perseus_db__) {
    global.__perseus_db__ = openDb();
  }
  return global.__perseus_db__;
}
