"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { getPool } from "@/lib/db";

export async function openQuoteNotification(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id");
  const revision = Number(formData.get("revision"));
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) || !Number.isSafeInteger(revision) || revision < 1) {
    redirect("/account");
  }

  const result = await getPool().query(
    `UPDATE quotes q SET customer_seen_revision=greatest(q.customer_seen_revision,least(q.revision,$3))
     FROM design_requests r
     WHERE q.id=$1 AND q.user_id=$2 AND r.id=q.design_request_id AND r.user_id=$2 AND q.status='sent'
     RETURNING q.id`,
    [id, user.id, revision],
  );
  if (!result.rowCount) redirect("/account");
  revalidatePath("/", "layout");
  redirect(`/account/quotes/${id}`);
}

export async function markQuoteNotificationRead(id: string, revision: number) {
  const user = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isSafeInteger(revision) || revision < 1) return;

  const result = await getPool().query(
    `UPDATE quotes q SET customer_seen_revision=greatest(q.customer_seen_revision,least(q.revision,$3))
     FROM design_requests r
     WHERE q.id=$1 AND q.user_id=$2 AND r.id=q.design_request_id AND r.user_id=$2
       AND q.status='sent' AND q.customer_seen_revision<least(q.revision,$3)`,
    [id, user.id, revision],
  );
  if (result.rowCount) {
    revalidatePath("/", "layout");
    refresh();
  }
}
