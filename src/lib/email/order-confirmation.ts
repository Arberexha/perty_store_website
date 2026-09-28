import nodemailer from "nodemailer";

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
};

const euro = (cents: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export function orderConfirmationMessage(order: OrderConfirmation) {
  const reference = order.id.slice(0, 8).toUpperCase();
  const method = order.fulfillmentMethod === "pickup" ? "Pickup" : "Delivery";
  const personalizationText = order.personalizations.length
    ? `\nNames and numbers:\n${order.personalizations.map((person) => `- ${person.name || "—"} · #${person.number || "—"} · ${person.size}`).join("\n")}` : "";
  const text = `Hello ${order.customerName},\n\nWe received your order #${reference}.${order.previewPng ? " Your design preview is attached." : ""}\n\n${order.productName} · ${order.variantLabel}\nQuantity: ${order.quantity}\nUnit price: ${euro(order.unitPriceCents)}\nProduct color: ${order.productColor}\nItems: ${euro(order.subtotalCents)}\n${method}: ${euro(order.shippingCents)}\nTotal: ${euro(order.totalCents)}\n\n${method} details: ${order.fulfillmentDetail}${personalizationText}${order.customerNote ? `\nYour notes: ${order.customerNote}` : ""}\n\nPayment has not been taken. The shop will contact you about payment and fulfillment.\n\nPerty Print`;
  const personalizations = order.personalizations.length ? `<h3 style="margin:24px 0 8px">Names and numbers</h3><ul>${order.personalizations.map((person) => `<li>${escapeHtml(person.name || "—")} · #${escapeHtml(person.number || "—")} · ${escapeHtml(person.size)}</li>`).join("")}</ul>` : "";
  const notes = order.customerNote ? `<p><strong>Your notes:</strong> ${escapeHtml(order.customerNote)}</p>` : "";
  const html = `<div style="font-family:Arial,sans-serif;color:#233026;max-width:640px;margin:auto;line-height:1.5"><h1 style="font-size:28px">Order received</h1><p>Hello ${escapeHtml(order.customerName)},</p><p>We received your order <strong>#${reference}</strong>.${order.previewPng ? " Here is the design preview you submitted:" : ""}</p>${order.previewPng ? '<img src="cid:order-design-preview" alt="Your product design preview" style="display:block;width:100%;max-width:600px;height:auto;border:1px solid #d7ddd3">' : ""}<h2 style="font-size:20px;margin-top:28px">Order details</h2><p><strong>${escapeHtml(order.productName)}</strong> · ${escapeHtml(order.variantLabel)}<br>Quantity: ${order.quantity}<br>Unit price: ${euro(order.unitPriceCents)}<br>Product color: ${escapeHtml(order.productColor)}</p><p>Items: ${euro(order.subtotalCents)}<br>${method}: ${euro(order.shippingCents)}<br><strong>Total: ${euro(order.totalCents)}</strong></p><p><strong>${method} details:</strong> ${escapeHtml(order.fulfillmentDetail)}</p>${personalizations}${notes}<p style="margin-top:28px;padding:16px;background:#f3f5ef">Payment has not been taken. The shop will contact you about payment and fulfillment.</p><p>Perty Print</p></div>`;
  return { subject: `Perty Print order received #${reference}`, text, html };
}

export function orderConfirmationMail(order: OrderConfirmation, from: string) {
  const message = orderConfirmationMessage(order);
  return {
    from: { name: "Perty Print", address: from }, to: order.customerEmail,
    subject: message.subject, text: message.text, html: message.html,
    attachments: order.previewPng ? [{ filename: `perty-design-${order.id.slice(0, 8)}.png`, content: order.previewPng, contentType: "image/png", cid: "order-design-preview", contentDisposition: "inline" as const }] : [],
  };
}

export function orderCancellationMessage(order: OrderConfirmation) {
  const reference = order.id.slice(0, 8).toUpperCase();
  const text = `Hello ${order.customerName},\n\nYour Perty Print order #${reference} has been cancelled.\n\n${order.productName} · ${order.variantLabel}\nQuantity: ${order.quantity}\nOrder total: ${euro(order.totalCents)}\n\nIf you have questions about this order or a payment, please reply to this email.\n\nPerty Print`;
  const html = `<div style="font-family:Arial,sans-serif;color:#233026;max-width:640px;margin:auto;line-height:1.5"><h1 style="font-size:28px">Order cancelled</h1><p>Hello ${escapeHtml(order.customerName)},</p><p>Your Perty Print order <strong>#${reference}</strong> has been cancelled.</p>${order.previewPng ? '<img src="cid:order-design-preview" alt="Your product design preview" style="display:block;width:100%;max-width:600px;height:auto;border:1px solid #d7ddd3">' : ""}<h2 style="font-size:20px;margin-top:28px">Order details</h2><p><strong>${escapeHtml(order.productName)}</strong> · ${escapeHtml(order.variantLabel)}<br>Quantity: ${order.quantity}<br>Order total: ${euro(order.totalCents)}</p><p>If you have questions about this order or a payment, please reply to this email.</p><p>Perty Print</p></div>`;
  return { subject: `Perty Print order cancelled #${reference}`, text, html };
}

export function orderCancellationMail(order: OrderConfirmation, from: string) {
  return { ...orderConfirmationMail(order, from), ...orderCancellationMessage(order) };
}

async function sendOrderMail(order: OrderConfirmation, kind: "confirmation" | "cancellation"): Promise<"sent" | "not_configured"> {
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
  await transport.sendMail(kind === "confirmation" ? orderConfirmationMail(order, from) : orderCancellationMail(order, from));
  return "sent";
}

export const sendOrderConfirmation = (order: OrderConfirmation) => sendOrderMail(order, "confirmation");
export const sendOrderCancellation = (order: OrderConfirmation) => sendOrderMail(order, "cancellation");
