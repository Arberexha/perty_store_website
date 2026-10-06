import nodemailer from "nodemailer";
import { orderStatusLabel, type OrderStatus } from "../order-tracking";

export type OrderConfirmationItem = {
  productName: string; variantLabel: string; quantity: number; unitPriceCents: number; lineTotalCents: number;
  productColor: string; personalizations: Array<{ name: string; number: string; size: string }>;
  previewPng: Buffer | null;
};

export type OrderConfirmation = {
  id: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  fulfillmentMethod: "pickup" | "delivery";
  fulfillmentDetail: string;
  customerNote: string;
  productColor: string;
  personalizations: Array<{ name: string; number: string; size: string }>;
  previewPng: Buffer | null;
  items?: OrderConfirmationItem[];
  trackingUrl?: string | null;
};

const euro = (cents: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const trackingText = (order: OrderConfirmation) => order.trackingUrl ? `\n\nFollow your order: ${order.trackingUrl}\nKeep this link private; anyone with it can view the order's progress.` : "";
const trackingHtml = (order: OrderConfirmation) => order.trackingUrl ? `<p><a href="${escapeHtml(order.trackingUrl)}" style="display:inline-block;background:#244b37;color:#fff;padding:12px 18px;text-decoration:none;border-radius:4px">Track your order</a></p><p style="font-size:12px;color:#627065">Keep this link private; anyone with it can view the order's progress.</p>` : "";
const orderItems = (order: OrderConfirmation): OrderConfirmationItem[] => order.items?.length ? order.items : [{ productName: order.productName, variantLabel: order.variantLabel, quantity: order.quantity, unitPriceCents: order.unitPriceCents, lineTotalCents: order.subtotalCents, productColor: order.productColor, personalizations: order.personalizations, previewPng: order.previewPng }];
const itemText = (item: OrderConfirmationItem) => `${item.productName} · ${item.variantLabel}\nQuantity: ${item.quantity}\nUnit price: ${euro(item.unitPriceCents)}\nProduct color: ${item.productColor}${item.personalizations.length ? `\nNames and numbers:\n${item.personalizations.map((person) => `- ${person.name || "—"} · #${person.number || "—"} · ${person.size}`).join("\n")}` : ""}`;
const previewCid = (index: number) => index === 0 ? "order-design-preview" : `order-design-preview-${index}`;
const itemHtml = (item: OrderConfirmationItem, index: number, preview = true) => `<section style="border-top:1px solid #d7ddd3;padding-top:14px;margin-top:16px"><p><strong>${escapeHtml(item.productName)}</strong> · ${escapeHtml(item.variantLabel)}<br>Quantity: ${item.quantity}<br>Unit price: ${euro(item.unitPriceCents)}<br>Product color: ${escapeHtml(item.productColor)}<br>Line total: ${euro(item.lineTotalCents)}</p>${preview && item.previewPng ? `<img src="cid:${previewCid(index)}" alt="Design preview for ${escapeHtml(item.productName)}" style="display:block;width:100%;max-width:600px;height:auto;border:1px solid #d7ddd3">` : ""}${item.personalizations.length ? `<h3 style="margin:18px 0 8px">Names and numbers</h3><ul>${item.personalizations.map((person) => `<li>${escapeHtml(person.name || "—")} · #${escapeHtml(person.number || "—")} · ${escapeHtml(person.size)}</li>`).join("")}</ul>` : ""}</section>`;

export function orderConfirmationMessage(order: OrderConfirmation) {
  const reference = order.id.slice(0, 8).toUpperCase();
  const method = order.fulfillmentMethod === "pickup" ? "Pickup" : "Delivery";
  const items = orderItems(order);
  const text = `Hello ${order.customerName},\n\nWe received your order #${reference}.${items.some((item) => item.previewPng) ? " Your design preview is attached." : ""}\n\n${items.map(itemText).join("\n\n")}\nItems: ${euro(order.subtotalCents)}\n${method}: ${euro(order.shippingCents)}\nTotal: ${euro(order.totalCents)}\n\n${method} details: ${order.fulfillmentDetail}${order.customerNote ? `\nYour notes: ${order.customerNote}` : ""}${trackingText(order)}\n\nPayment has not been taken. The shop will contact you about payment and fulfillment.\n\nPerty Print`;
  const notes = order.customerNote ? `<p><strong>Your notes:</strong> ${escapeHtml(order.customerNote)}</p>` : "";
  const html = `<div style="font-family:Arial,sans-serif;color:#233026;max-width:640px;margin:auto;line-height:1.5"><h1 style="font-size:28px">Order received</h1><p>Hello ${escapeHtml(order.customerName)},</p><p>We received your order <strong>#${reference}</strong>.</p><h2 style="font-size:20px;margin-top:28px">Order details</h2>${items.map((item, index) => itemHtml(item, index)).join("")}<p>Items: ${euro(order.subtotalCents)}<br>${method}: ${euro(order.shippingCents)}<br><strong>Total: ${euro(order.totalCents)}</strong></p><p><strong>${method} details:</strong> ${escapeHtml(order.fulfillmentDetail)}</p>${notes}${trackingHtml(order)}<p style="margin-top:28px;padding:16px;background:#f3f5ef">Payment has not been taken. The shop will contact you about payment and fulfillment.</p><p>Perty Print</p></div>`;
  return { subject: `Perty Print order received #${reference}`, text, html };
}

export function orderConfirmationMail(order: OrderConfirmation, from: string) {
  const message = orderConfirmationMessage(order);
  return {
    from: { name: "Perty Print", address: from }, to: order.customerEmail,
    subject: message.subject, text: message.text, html: message.html,
    attachments: orderItems(order).flatMap((item, index) => item.previewPng ? [{ filename: `perty-design-${order.id.slice(0, 8)}-${index + 1}.png`, content: item.previewPng, contentType: "image/png", cid: previewCid(index), contentDisposition: "inline" as const }] : []),
  };
}

export function orderCancellationMessage(order: OrderConfirmation) {
  const reference = order.id.slice(0, 8).toUpperCase();
  const text = `Hello ${order.customerName},\n\nYour Perty Print order #${reference} has been cancelled.\n\n${orderItems(order).map((item) => `${item.productName} · ${item.variantLabel}\nQuantity: ${item.quantity}`).join("\n\n")}\nOrder total: ${euro(order.totalCents)}${trackingText(order)}\n\nIf you have questions about this order or a payment, please reply to this email.\n\nPerty Print`;
  const html = `<div style="font-family:Arial,sans-serif;color:#233026;max-width:640px;margin:auto;line-height:1.5"><h1 style="font-size:28px">Order cancelled</h1><p>Hello ${escapeHtml(order.customerName)},</p><p>Your Perty Print order <strong>#${reference}</strong> has been cancelled.</p><h2 style="font-size:20px;margin-top:28px">Order details</h2>${orderItems(order).map((item, index) => itemHtml(item, index)).join("")}<p>Order total: ${euro(order.totalCents)}</p>${trackingHtml(order)}<p>If you have questions about this order or a payment, please reply to this email.</p><p>Perty Print</p></div>`;
  return { subject: `Perty Print order cancelled #${reference}`, text, html };
}

export function orderCancellationMail(order: OrderConfirmation, from: string) {
  return { ...orderConfirmationMail(order, from), ...orderCancellationMessage(order) };
}

export function orderStatusMessage(order: OrderConfirmation, status: OrderStatus) {
  const reference = order.id.slice(0, 8).toUpperCase();
  const label = orderStatusLabel(status, order.fulfillmentMethod);
  const text = `Hello ${order.customerName},\n\nYour Perty Print order #${reference} is now ${label.toLowerCase()}.\n\n${orderItems(order).map((item) => `${item.productName} · ${item.variantLabel}\nQuantity: ${item.quantity}`).join("\n\n")}${trackingText(order)}\n\nIf you have questions, please reply to this email.\n\nPerty Print`;
  const html = `<div style="font-family:Arial,sans-serif;color:#233026;max-width:640px;margin:auto;line-height:1.5"><h1 style="font-size:28px">${escapeHtml(label)}</h1><p>Hello ${escapeHtml(order.customerName)},</p><p>Your Perty Print order <strong>#${reference}</strong> is now ${escapeHtml(label.toLowerCase())}.</p>${orderItems(order).map((item, index) => itemHtml(item, index, false)).join("")}${trackingHtml(order)}<p>If you have questions, please reply to this email.</p><p>Perty Print</p></div>`;
  return { subject: `Perty Print order #${reference}: ${label}`, text, html };
}

export function orderStatusMail(order: OrderConfirmation, status: OrderStatus, from: string) {
  return { from: { name: "Perty Print", address: from }, to: order.customerEmail, ...orderStatusMessage(order, status) };
}

async function sendOrderMail(order: OrderConfirmation, kind: "confirmation" | "cancellation" | "status", status?: OrderStatus): Promise<"sent" | "not_configured"> {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  if (!host || !from) return "not_configured";
  const port = Number(process.env.SMTP_PORT ?? "587");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid SMTP_PORT");
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (user && !password) return "not_configured";
  if (password && !user) throw new Error("SMTP_USER is required when SMTP_PASSWORD is set");
  const transport = nodemailer.createTransport({
    host, port, secure: port === 465,
    requireTLS: port !== 465 && !(["localhost", "127.0.0.1", "::1"].includes(host) && !user),
    auth: user && password ? { user, pass: password } : undefined,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  await transport.sendMail(kind === "confirmation" ? orderConfirmationMail(order, from) : kind === "cancellation" ? orderCancellationMail(order, from) : orderStatusMail(order, status!, from));
  return "sent";
}

export const sendOrderConfirmation = (order: OrderConfirmation) => sendOrderMail(order, "confirmation");
export const sendOrderCancellation = (order: OrderConfirmation) => sendOrderMail(order, "cancellation");
export const sendOrderStatusUpdate = (order: OrderConfirmation, status: OrderStatus) => sendOrderMail(order, "status", status);
