"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { getPool } from "@/lib/db";

export async function openDesignRequest(form: FormData) {
  const id = form.get("id");
  await requireAdmin();
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return;
  await getPool().query("UPDATE design_requests SET admin_viewed_at=now() WHERE id=$1 AND admin_viewed_at IS NULL", [id]);
  revalidatePath("/admin/design-requests");
  redirect(`/admin/design-requests/${id}`);
}
