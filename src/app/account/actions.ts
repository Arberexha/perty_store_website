"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guard";
import { getPool } from "@/lib/db";

export async function duplicateDesign(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return;
  await getPool().query(`INSERT INTO saved_designs (id,user_id,product_id,product_name,product_slug,name,design_data,preview_png)
    SELECT $1,user_id,product_id,product_name,product_slug,left(name || ' (copy)',120),design_data,preview_png
    FROM saved_designs WHERE id=$2 AND user_id=$3`, [randomUUID(), id, user.id]);
  revalidatePath("/account");
}

export async function deleteDesign(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return;
  await getPool().query("DELETE FROM saved_designs WHERE id=$1 AND user_id=$2", [id, user.id]);
  revalidatePath("/account");
}

export async function shareDesign(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return;
  await getPool().query("UPDATE saved_designs SET share_token=$3 WHERE id=$1 AND user_id=$2 AND share_token IS NULL", [id, user.id, randomBytes(24).toString("base64url")]);
  revalidatePath("/account");
}

export async function stopSharingDesign(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return;
  await getPool().query("UPDATE saved_designs SET share_token=NULL WHERE id=$1 AND user_id=$2", [id, user.id]);
  revalidatePath("/account");
}
