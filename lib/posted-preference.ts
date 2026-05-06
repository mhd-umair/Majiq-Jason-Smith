import { cookies } from "next/headers";

/** Cookie: "1" = include archived in posted revenue (default), "0" = finalized only. */
export const INCLUDE_ARCHIVED_COOKIE = "perseus_include_archived";

/**
 * Posted revenue / activity: either finalized only, or finalized + archived.
 * Safe to interpolate into SQL — boolean only, fixed status literals.
 */
export function postedStatusSql(includeArchived: boolean, tableAlias?: string): string {
  const col = tableAlias ? `${tableAlias}.Status` : "Status";
  return includeArchived
    ? `${col} IN ('finalized','archived')`
    : `${col} = 'finalized'`;
}

export async function getIncludeArchived(): Promise<boolean> {
  const jar = await cookies();
  const v = jar.get(INCLUDE_ARCHIVED_COOKIE)?.value;
  if (v === "0" || v === "false") return false;
  return true;
}

export function postedRevenueDescription(includeArchived: boolean): string {
  return includeArchived
    ? "Posted revenue includes finalized and archived invoices."
    : "Posted revenue includes finalized invoices only (archived excluded).";
}

export function postedRevenueShortLabel(includeArchived: boolean): string {
  return includeArchived ? "finalized and archived" : "finalized only";
}
