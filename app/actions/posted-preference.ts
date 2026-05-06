"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { INCLUDE_ARCHIVED_COOKIE } from "@/lib/posted-preference";

export async function setIncludeArchived(includeArchived: boolean) {
  const jar = await cookies();
  jar.set(INCLUDE_ARCHIVED_COOKIE, includeArchived ? "1" : "0", {
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax",
    httpOnly: false,
  });
  revalidatePath("/", "layout");
}
