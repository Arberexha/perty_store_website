import "server-only";
import nodemailer from "nodemailer";
import { euro } from "@/lib/admin/format";

const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export async function sendQuoteNotification(input: { id: string; customerName: string; customerEmail: string; productName: string; quantity: number; amountCents: number; revision: number }): Promise<"sent" | "not_configured"> {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  const siteUrl = process.env.SITE_URL;
  if (!host || !from || !siteUrl) return "not_configured";
  const port = Number(process.env.SMTP_PORT ?? "587");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid SMTP_PORT");
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (user && !password) return "not_configured";
  if (password && !user) throw new Error("SMTP_USER is required when SMTP_PASSWORD is set");
  const url = new URL(`/account/quotes/${input.id}`, siteUrl).toString();
  const safeUrl = escapeHtml(url);
  const subject = `Your Perty Print quote #${input.id.slice(0, 8).toUpperCase()}${input.revision > 1 ? " has been updated" : " is ready"}`;
  const text = `Hello ${input.customerName},\n\nYour quote for ${input.quantity} × ${input.productName} is ready.\nQuoted products: ${euro(input.amountCents)}. Delivery, if selected, is added when you accept.\n\nSign in to review the design, accept the quote, or request changes:\n${url}\n\nPayment has not been taken.\n\nPerty Print`;
  const html = `<div style="font-family:Arial,sans-serif;color:#253027;max-width:620px;margin:auto;line-height:1.6"><h1>Your quote is ready</h1><p>Hello ${escapeHtml(input.customerName)},</p><p>We prepared a quote for <strong>${input.quantity} × ${escapeHtml(input.productName)}</strong>.</p><p>Quoted products: <strong>${euro(input.amountCents)}</strong>. Delivery, if selected, is added when you accept.</p><p><a href="${safeUrl}">Review your quote</a> to accept it or request changes.</p><p>Payment has not been taken.</p><p>Perty Print</p></div>`;
  const transport = nodemailer.createTransport({ host, port, secure: port === 465,
    requireTLS: port !== 465 && !(["localhost", "127.0.0.1", "::1"].includes(host) && !user),
    auth: user && password ? { user, pass: password } : undefined,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
  await transport.sendMail({ from: { name: "Perty Print", address: from }, to: input.customerEmail, subject, text, html });
  return "sent";
}
