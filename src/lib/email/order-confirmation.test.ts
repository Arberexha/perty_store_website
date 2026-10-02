import { describe, expect, it } from "vitest";
import nodemailer from "nodemailer";
import { createServer } from "node:net";
import { once } from "node:events";
import { orderCancellationMail, orderCancellationMessage, orderConfirmationMail, orderConfirmationMessage, orderStatusMessage, sendOrderCancellation, sendOrderConfirmation } from "./order-confirmation";
import type { OrderConfirmation } from "./order-confirmation";

const order: OrderConfirmation = {
  id: "12345678-test", customerName: "Alex <Customer>", customerEmail: "alex@example.test",
  productName: "Custom hat", variantLabel: "Standard hat", quantity: 2,
  unitPriceCents: 1500, subtotalCents: 3000, shippingCents: 500, totalCents: 3500,
  fulfillmentMethod: "delivery", fulfillmentDetail: "123 Test Street, Prishtina",
  customerNote: "Blue <logo>", productColor: "#234567",
  personalizations: [{ name: "Sam", number: "7", size: "M" }],
  previewPng: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]),
  trackingUrl: "https://perty.example/track/abc123",
};

describe("order confirmation email", () => {
  it("includes the order details while escaping customer text in HTML", () => {
    const message = orderConfirmationMessage(order);
    expect(message.subject).toContain("#12345678");
    expect(message.text).toContain("Total: €35.00");
    expect(message.text).toContain("123 Test Street, Prishtina");
    expect(message.text).toContain("Payment has not been taken");
    expect(message.text).toContain("https://perty.example/track/abc123");
    expect(message.html).toContain("Track your order");
    expect(message.html).toContain("Alex &lt;Customer&gt;");
    expect(message.html).toContain("Blue &lt;logo&gt;");
    expect(message.html).not.toContain("Blue <logo>");
    expect(message.html).toContain("cid:order-design-preview");
  });

  it("builds an email with the design PNG included", async () => {
    const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
    const info = await transport.sendMail(orderConfirmationMail(order, "orders@example.test"));
    const raw = info.message.toString();
    expect(raw).toContain("alex@example.test");
    expect(raw).toContain("Content-Type: image/png");
    expect(raw).toContain("Content-ID: <order-design-preview>");
    expect(raw).toContain(order.previewPng!.toString("base64"));
  });

  it("builds a cancellation email with the reference and preview but no internal note", async () => {
    const message = orderCancellationMessage({ ...order, customerName: "Alex <Customer>" });
    expect(message.subject).toContain("cancelled #12345678");
    expect(message.text).toContain("Order total: €35.00");
    expect(message.html).toContain("Alex &lt;Customer&gt;");
    expect(message.html).not.toContain("Alex <Customer>");
    const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
    const info = await transport.sendMail(orderCancellationMail(order, "orders@example.test"));
    const raw = info.message.toString();
    expect(raw).toContain("Content-ID: <order-design-preview>");
    expect(raw).toContain(order.previewPng!.toString("base64"));
  });

  it("includes a private tracking link in a status update", () => {
    const message = orderStatusMessage(order, "ready");
    expect(message.subject).toContain("Ready for delivery");
    expect(message.text).toContain("https://perty.example/track/abc123");
    expect(message.html).toContain("Track your order");
    expect(message.html).not.toContain("Blue <logo>");
  });

  it("delivers the email to a configured SMTP server", async () => {
    let received = "";
    const server = createServer((socket) => {
      socket.write("220 local-test ESMTP\r\n");
      let pending = "";
      let inData = false;
      socket.on("data", (chunk) => {
        pending += chunk.toString();
        let end: number;
        while ((end = pending.indexOf("\r\n")) >= 0) {
          const line = pending.slice(0, end);
          pending = pending.slice(end + 2);
          if (inData) {
            if (line === ".") { inData = false; socket.write("250 accepted\r\n"); }
            else received += `${line}\r\n`;
          } else if (/^(EHLO|HELO)\b/i.test(line)) socket.write("250 local-test\r\n");
          else if (/^(MAIL FROM|RCPT TO)\b/i.test(line)) socket.write("250 ok\r\n");
          else if (/^DATA\b/i.test(line)) { inData = true; socket.write("354 send data\r\n"); }
          else if (/^QUIT\b/i.test(line)) { socket.write("221 bye\r\n"); socket.end(); }
        }
      });
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("SMTP test server did not start");
    const previous = { host: process.env.SMTP_HOST, port: process.env.SMTP_PORT, from: process.env.SMTP_FROM, user: process.env.SMTP_USER, password: process.env.SMTP_PASSWORD };
    process.env.SMTP_HOST = "127.0.0.1";
    process.env.SMTP_PORT = String(address.port);
    process.env.SMTP_FROM = "orders@example.test";
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    try {
      expect(await sendOrderConfirmation(order)).toBe("sent");
      expect(await sendOrderCancellation(order)).toBe("sent");
      expect(received).toContain("alex@example.test");
      expect(received).toContain("Content-ID: <order-design-preview>");
      expect(received).toContain("=E2=82=AC35.00");
      expect(received).toContain("Perty Print order cancelled");
    } finally {
      for (const [key, value] of Object.entries({ SMTP_HOST: previous.host, SMTP_PORT: previous.port, SMTP_FROM: previous.from, SMTP_USER: previous.user, SMTP_PASSWORD: previous.password })) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
      server.close();
    }
  });
});
