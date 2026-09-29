"use server";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { parseEuro } from "@/lib/admin/format";
import { getPool } from "@/lib/db";
import { sendQuoteNotification } from "@/lib/email/quote-notification";

class QuoteError extends Error {}

type RequestRow = { id: string; user_id: string | null; customer_name: string; account_email: string | null; product_name: string | null; product_type: string; quantity: number; status: string };
type ExistingQuote = { id: string; status: string; revision: number };

export async function sendDesignQuote(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = formData.get("request_id");
  const amountCents = parseEuro(formData.get("amount"));
  const details = formData.get("details");
  const proofFile = formData.get("proof_png");
  const returnPath = typeof requestId === "string" && /^[0-9a-f-]{36}$/i.test(requestId) ? `/admin/design-requests/${requestId}` : "/admin/design-requests";
  let error: string | null = null;
  let sent: { id: string; customerName: string; customerEmail: string; productName: string; quantity: number; amountCents: number; revision: number } | null = null;
  try {
    if (typeof requestId !== "string" || !/^[0-9a-f-]{36}$/i.test(requestId)) throw new QuoteError("Invalid design request");
    if (amountCents == null || amountCents <= 0) throw new QuoteError("Enter a total quote greater than zero");
    if (typeof details !== "string" || details.trim().length < 5 || details.trim().length > 5000) throw new QuoteError("Describe what the quote includes");
    let proof: Buffer | null = null;
    if (proofFile instanceof File && proofFile.size > 0) {
      if (proofFile.type !== "image/png" || proofFile.size > 2_000_000) throw new QuoteError("Choose a PNG proof smaller than 2 MB");
      proof = Buffer.from(await proofFile.arrayBuffer());
      if (!proof.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new QuoteError("Choose a valid PNG proof");
      try {
        const metadata = await sharp(proof, { failOn: "error", limitInputPixels: 20_000_000 }).metadata();
        if (!metadata.width || !metadata.height || metadata.width < 100 || metadata.height < 100 || metadata.width > 4000 || metadata.height > 4000) throw new Error("Invalid dimensions");
      } catch { throw new QuoteError("Choose a valid PNG proof between 100 and 4000 pixels per side"); }
    }
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const request = (await client.query<RequestRow>("SELECT r.id,r.user_id,r.customer_name,u.email AS account_email,r.product_name,r.product_type,r.quantity,r.status FROM design_requests r LEFT JOIN users u ON u.id=r.user_id WHERE r.id=$1 FOR UPDATE OF r", [requestId])).rows[0];
      if (!request) throw new QuoteError("Design request not found");
      if (!request.user_id || !request.account_email) throw new QuoteError("This request was sent as a guest. The customer needs an account-linked request to approve a quote online.");
      if (request.status === "cancelled" || request.status === "closed") throw new QuoteError("This request is closed");
      if (amountCents > 2_147_483_647) throw new QuoteError("Quote total is too large");
      if (amountCents % request.quantity !== 0) throw new QuoteError(`The total must divide evenly across ${request.quantity} items. Adjust the amount by a few cents.`);
      const previous = (await client.query<ExistingQuote>("SELECT id,status,revision FROM quotes WHERE design_request_id=$1 FOR UPDATE", [requestId])).rows[0];
      if (previous?.status === "accepted") throw new QuoteError("This quote was already accepted");
      const quoteId = previous?.id ?? randomUUID();
      const revision = (previous?.revision ?? 0) + 1;
      if (previous) await client.query(`UPDATE quotes SET status='sent',amount_cents=$2,details=$3,customer_email=$5,proof_png=coalesce($6::bytea,proof_png),admin_note='',sent_at=now(),responded_at=NULL,notification_email_status='pending',revision=$4,updated_at=now() WHERE id=$1`, [quoteId, amountCents, details.trim(), revision, request.account_email, proof]);
      else await client.query(`INSERT INTO quotes (id,user_id,customer_name,customer_email,details,status,amount_cents,design_request_id,sent_at,notification_email_status,revision,proof_png)
        VALUES ($1,$2,$3,$4,$5,'sent',$6,$7,now(),'pending',1,$8)`, [quoteId, request.user_id, request.customer_name, request.account_email, details.trim(), amountCents, requestId, proof]);
      await client.query("UPDATE design_requests SET status='quoted',updated_at=now() WHERE id=$1", [requestId]);
      await client.query("INSERT INTO admin_audit_log (id,actor_user_id,action,entity_type,entity_id,details) VALUES ($1,$2,'sent','quote',$3,$4)", [randomUUID(), admin.id, quoteId, JSON.stringify({ revision, amountCents, requestId })]);
      await client.query("COMMIT");
      sent = { id: quoteId, customerName: request.customer_name, customerEmail: request.account_email, productName: request.product_name ?? request.product_type, quantity: request.quantity, amountCents, revision };
    } catch (cause) { await client.query("ROLLBACK"); throw cause; }
    finally { client.release(); }
  } catch (cause) { error = cause instanceof QuoteError ? cause.message : "Could not send the quote"; if (!(cause instanceof QuoteError)) console.error("Quote send failed", cause); }
  if (error || !sent) redirect(`${returnPath}?error=${encodeURIComponent(error ?? "Could not send the quote")}`);
  let emailStatus: "sent" | "failed" | "not_configured";
  try { emailStatus = await sendQuoteNotification(sent); }
  catch (cause) { emailStatus = "failed"; console.error("Quote notification failed", { quoteId: sent.id, cause }); }
  await getPool().query("UPDATE quotes SET notification_email_status=$2 WHERE id=$1", [sent.id, emailStatus]);
  revalidatePath("/admin/design-requests");
  revalidatePath("/admin/quotes");
  revalidatePath("/account");
  redirect(`${returnPath}?saved=1&email=${emailStatus}`);
}
