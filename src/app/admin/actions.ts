"use server";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { getPool } from "@/lib/db";
import { parseEuro, slugify } from "@/lib/admin/format";
import { productOrderingError } from "@/lib/admin/policy";
import { isDesignTemplate } from "@/lib/catalog-config";
import { DEFAULT_PRINT_AREA, MAX_MOCKUP_BYTES, mockupMime, validPrintArea } from "@/lib/product-mockup";
import type { PrintArea } from "@/lib/product-mockup";

class InputError extends Error {}

function text(form: FormData, key: string, max = 500): string {
  const value = form.get(key);
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new InputError(`Enter a valid ${key.replaceAll("_", " ")}`);
  return value.trim();
}

function optionalText(form: FormData, key: string, max = 5000): string {
  const value = form.get(key);
  if (typeof value !== "string" || value.length > max) throw new InputError(`Enter a valid ${key.replaceAll("_", " ")}`);
  return value.trim();
}

function positiveInteger(form: FormData, key: string): number {
  const value = Number(form.get(key));
  if (!Number.isSafeInteger(value) || value < 1) throw new InputError(`Enter a valid ${key.replaceAll("_", " ")}`);
  return value;
}

function euroAmount(form: FormData, key: string, optional = false): number | null {
  const raw = form.get(key);
  if (optional && (raw == null || raw === "")) return null;
  const amount = parseEuro(raw);
  if (amount == null) throw new InputError(`Enter a valid ${key.replaceAll("_", " ")} in euros`);
  return amount;
}

async function mockupInput(form: FormData): Promise<{ bytes: Buffer | null; mime: string | null; area: PrintArea }> {
  const upload = form.get("mockup_image");
  let bytes: Buffer | null = null;
  let mime: string | null = null;
  if (upload instanceof File && upload.size > 0) {
    if (upload.size > MAX_MOCKUP_BYTES) throw new InputError("Product photo must be 5 MB or smaller");
    bytes = Buffer.from(await upload.arrayBuffer());
    mime = mockupMime(bytes);
    if (!mime || upload.type !== mime) throw new InputError("Choose a valid PNG, JPG, or WebP product photo");
    try {
      const image = sharp(bytes, { failOn: "error", limitInputPixels: 20_000_000 });
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height) throw new Error("Missing image dimensions");
      bytes = await image.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
      mime = "image/webp";
    } catch {
      throw new InputError("Product photo could not be opened. Choose a valid PNG, JPG, or WebP image");
    }
  }
  const coordinates = ["left", "top", "right", "bottom"].map((side) => Number(form.get(`print_${side}`)));
  const area = ["left", "top", "right", "bottom"].every((side) => form.has(`print_${side}`)) && coordinates.every((value) => Number.isFinite(value))
    ? { left: coordinates[0], top: coordinates[1], right: coordinates[2], bottom: coordinates[3] }
    : DEFAULT_PRINT_AREA;
  if (!validPrintArea(area)) throw new InputError("Choose a valid print area inside the product photo");
  return { bytes, mime, area };
}

async function audit(actorId: string, action: string, entityType: string, entityId: string) {
  await getPool().query("INSERT INTO admin_audit_log (id, actor_user_id, action, entity_type, entity_id) VALUES ($1,$2,$3,$4,$5)", [randomUUID(), actorId, action, entityType, entityId]);
}

async function mutate(path: string, operation: (actorId: string) => Promise<void>, successParam = "saved") {
  const actor = await requireAdmin();
  let error: string | null = null;
  try {
    await operation(actor.id);
  } catch (cause) {
    error = cause instanceof InputError ? cause.message : "Could not save. Check for duplicate names or values and try again.";
    if (!(cause instanceof InputError)) console.error("Admin mutation failed", cause);
  }
  if (!error) {
    revalidatePath("/admin", "layout");
    if (path.startsWith("/admin/products")) revalidatePath("/");
  }
  redirect(`${path}${path.includes("?") ? "&" : "?"}${error ? `error=${encodeURIComponent(error)}` : `${successParam}=1`}`);
}

export async function createCategory(form: FormData) {
  await mutate("/admin/categories", async (actor) => {
    const name = text(form, "name", 80);
    const slug = slugify(name);
    if (!slug) throw new InputError("Enter a valid category name");
    const id = randomUUID();
    await getPool().query("INSERT INTO categories (id,name,slug,age_restricted) VALUES ($1,$2,$3,$4)", [id, name, slug, form.has("age_restricted")]);
    await audit(actor, "created", "category", id);
  });
}

export async function createProduct(form: FormData) {
  await mutate("/admin/products", async (actor) => {
    const name = text(form, "name", 120);
    const slug = slugify(name);
    if (!slug) throw new InputError("Enter a valid product name");
    const categoryId = text(form, "category_id", 100);
    const category = await getPool().query<{ age_restricted: boolean }>("SELECT age_restricted FROM categories WHERE id=$1", [categoryId]);
    if (!category.rows[0]) throw new InputError("Choose a category");
    const template = text(form, "design_template", 20);
    if (!isDesignTemplate(template)) throw new InputError("Choose a design studio");
    const mockup = await mockupInput(form);
    const id = randomUUID();
    await getPool().query(`INSERT INTO products (id,category_id,name,slug,description,age_restricted,minimum_quantity,design_template,mockup_image,mockup_mime,print_area) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [id, categoryId, name, slug, optionalText(form, "description"), category.rows[0].age_restricted || template === "lighters", positiveInteger(form, "minimum_quantity"), template, mockup.bytes, mockup.mime, JSON.stringify(mockup.area)]);
    await audit(actor, "created", "product", id);
  });
}

export async function updateProduct(form: FormData) {
  const id = text(form, "id", 100);
  await mutate(`/admin/products/${id}`, async (actor) => {
    const categoryId = text(form, "category_id", 100);
    const category = await getPool().query<{ age_restricted: boolean }>("SELECT age_restricted FROM categories WHERE id=$1", [categoryId]);
    if (!category.rows[0]) throw new InputError("Choose a category");
    const status = text(form, "status", 20);
    if (!["draft", "published", "archived"].includes(status)) throw new InputError("Choose a valid status");
    const template = text(form, "design_template", 20);
    if (!isDesignTemplate(template)) throw new InputError("Choose a design studio before publishing");
    const mockup = await mockupInput(form);
    const ageRestricted = category.rows[0].age_restricted || template === "lighters" || form.has("age_restricted");
    const orderable = form.has("ordering_enabled");
    if (orderable) {
      const priced = await getPool().query("SELECT 1 FROM product_variants WHERE product_id=$1 AND active=true AND base_price_cents IS NOT NULL LIMIT 1", [id]);
      const error = productOrderingError({ ageRestricted, categoryRestricted: category.rows[0].age_restricted, status, hasPricedActiveVariant: Boolean(priced.rowCount) });
      if (error) throw new InputError(error);
    }
    const removeMockup = form.has("remove_mockup");
    const result = await getPool().query(`UPDATE products SET category_id=$2,name=$3,description=$4,status=$5,ordering_enabled=$6,age_restricted=$7,minimum_quantity=$8,design_template=$9,print_area=$10,mockup_image=CASE WHEN $13 THEN NULL WHEN $11::bytea IS NOT NULL THEN $11 ELSE mockup_image END,mockup_mime=CASE WHEN $13 THEN NULL WHEN $12::text IS NOT NULL THEN $12 ELSE mockup_mime END,updated_at=now() WHERE id=$1`, [id, categoryId, text(form, "name", 120), optionalText(form, "description"), status, orderable, ageRestricted, positiveInteger(form, "minimum_quantity"), template, JSON.stringify(mockup.area), mockup.bytes, mockup.mime, removeMockup]);
    if (!result.rowCount) throw new InputError("Product not found");
    await audit(actor, "updated", "product", id);
  });
}

export async function deleteProduct(form: FormData) {
  await mutate("/admin/products", async (actor) => {
    const id = text(form, "id", 100);
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("DELETE FROM products WHERE id=$1 RETURNING id", [id]);
      if (!result.rowCount) throw new InputError("Product not found");
      await client.query("INSERT INTO admin_audit_log (id,actor_user_id,action,entity_type,entity_id) VALUES ($1,$2,$3,$4,$5)", [randomUUID(), actor, "deleted", "product", id]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }, "deleted");
}

export async function createVariant(form: FormData) {
  const productId = text(form, "product_id", 100);
  await mutate(`/admin/products/${productId}`, async (actor) => {
    const id = randomUUID();
    await getPool().query(`INSERT INTO product_variants (id,product_id,sku,label,size,material,color,base_price_cents) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [id, productId, text(form, "sku", 80), text(form, "label", 120), optionalText(form, "size", 80), optionalText(form, "material", 80), optionalText(form, "color", 80), euroAmount(form, "base_price", true)]);
    await audit(actor, "created", "variant", id);
  });
}

export async function updateVariant(form: FormData) {
  const productId = text(form, "product_id", 100);
  await mutate(`/admin/products/${productId}`, async (actor) => {
    const id = text(form, "id", 100);
    const result = await getPool().query(`UPDATE product_variants SET label=$3,size=$4,material=$5,color=$6,base_price_cents=$7,active=$8 WHERE id=$1 AND product_id=$2`, [id, productId, text(form, "label", 120), optionalText(form, "size", 80), optionalText(form, "material", 80), optionalText(form, "color", 80), euroAmount(form, "base_price", true), form.has("active")]);
    if (!result.rowCount) throw new InputError("Variant not found");
    await getPool().query(`UPDATE products p SET ordering_enabled=false,updated_at=now()
      WHERE p.id=$1 AND p.ordering_enabled=true AND NOT EXISTS
      (SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.active=true AND v.base_price_cents IS NOT NULL)`, [productId]);
    await audit(actor, "updated", "variant", id);
  });
}

export async function createTier(form: FormData) {
  const productId = text(form, "product_id", 100);
  await mutate(`/admin/products/${productId}`, async (actor) => {
    const variantId = text(form, "variant_id", 100);
    const ownsVariant = await getPool().query("SELECT 1 FROM product_variants WHERE id=$1 AND product_id=$2", [variantId, productId]);
    if (!ownsVariant.rowCount) throw new InputError("Choose a variant from this product");
    const minimum = positiveInteger(form, "minimum_quantity");
    if (minimum < 2) throw new InputError("Tier quantity must be at least 2");
    const id = randomUUID();
    await getPool().query("INSERT INTO quantity_price_tiers (id,variant_id,minimum_quantity,unit_price_cents) VALUES ($1,$2,$3,$4)", [id, variantId, minimum, euroAmount(form, "unit_price")]);
    await audit(actor, "created", "price_tier", id);
  });
}

export async function deleteTier(form: FormData) {
  const productId = text(form, "product_id", 100);
  await mutate(`/admin/products/${productId}`, async (actor) => {
    const id = text(form, "id", 100);
    const result = await getPool().query("DELETE FROM quantity_price_tiers t USING product_variants v WHERE t.id=$1 AND t.variant_id=v.id AND v.product_id=$2", [id, productId]);
    if (!result.rowCount) throw new InputError("Price tier not found");
    await audit(actor, "deleted", "price_tier", id);
  });
}

export async function createQuote(form: FormData) {
  await mutate("/admin/quotes", async (actor) => {
    const id = randomUUID();
    await getPool().query("INSERT INTO quotes (id,customer_name,customer_email,details) VALUES ($1,$2,$3,$4)", [id, text(form, "customer_name", 120), text(form, "customer_email", 254), text(form, "details", 5000)]);
    await audit(actor, "created", "quote", id);
  });
}

export async function updateQuote(form: FormData) {
  await mutate("/admin/quotes", async (actor) => {
    const id = text(form, "id", 100);
    const status = text(form, "status", 20);
    if (!["new", "reviewing", "sent", "accepted", "declined"].includes(status)) throw new InputError("Choose a valid quote status");
    const result = await getPool().query("UPDATE quotes SET status=$2,amount_cents=$3,admin_note=$4,updated_at=now() WHERE id=$1", [id, status, euroAmount(form, "amount", true), optionalText(form, "admin_note")]);
    if (!result.rowCount) throw new InputError("Quote not found");
    await audit(actor, "updated", "quote", id);
  });
}

export async function updateOrder(form: FormData) {
  await mutate("/admin/orders", async (actor) => {
    const id = text(form, "id", 100);
    const status = text(form, "status", 30);
    if (!["new", "in_production", "ready", "shipped", "completed", "cancelled"].includes(status)) throw new InputError("Choose a valid order status");
    const result = await getPool().query("UPDATE orders SET status=$2,admin_note=$3,updated_at=now() WHERE id=$1", [id, status, optionalText(form, "admin_note")]);
    if (!result.rowCount) throw new InputError("Order not found");
    await audit(actor, "updated", "order", id);
  });
}

export async function updateDesignRequest(form: FormData) {
  const id = text(form, "id", 100);
  await mutate(`/admin/design-requests/${id}`, async (actor) => {
    const status = text(form, "status", 20);
    if (!["new", "reviewing", "quoted", "closed", "cancelled"].includes(status)) throw new InputError("Choose a valid request status");
    const result = await getPool().query("UPDATE design_requests SET status=$2,admin_note=$3,updated_at=now() WHERE id=$1", [id, status, optionalText(form, "admin_note")]);
    if (!result.rowCount) throw new InputError("Design request not found");
    await audit(actor, "updated", "design_request", id);
  });
}

export async function reviewArtwork(form: FormData) {
  await mutate("/admin/files", async (actor) => {
    const id = text(form, "id", 100);
    const status = text(form, "status", 20);
    if (!["pending", "approved", "rejected"].includes(status)) throw new InputError("Choose a valid file status");
    const result = await getPool().query("UPDATE artwork_files SET status=$2 WHERE id=$1", [id, status]);
    if (!result.rowCount) throw new InputError("File not found");
    await audit(actor, "reviewed", "artwork_file", id);
  });
}

export async function createPickup(form: FormData) {
  await mutate("/admin/settings", async (actor) => {
    const id = randomUUID();
    await getPool().query("INSERT INTO pickup_locations (id,name,address,opening_hours) VALUES ($1,$2,$3,$4)", [id, text(form, "name", 120), text(form, "address", 500), text(form, "opening_hours", 500)]);
    await audit(actor, "created", "pickup_location", id);
  });
}

export async function createShipping(form: FormData) {
  await mutate("/admin/settings", async (actor) => {
    const id = randomUUID();
    await getPool().query("INSERT INTO shipping_zones (id,name,description,fee_cents) VALUES ($1,$2,$3,$4)", [id, text(form, "name", 120), optionalText(form, "description", 500), euroAmount(form, "fee")]);
    await audit(actor, "created", "shipping_zone", id);
  });
}

export async function toggleSetting(form: FormData) {
  await mutate("/admin/settings", async (actor) => {
    const kind = text(form, "kind", 20);
    const table = kind === "pickup" ? "pickup_locations" : kind === "shipping" ? "shipping_zones" : null;
    if (!table) throw new InputError("Invalid setting type");
    const id = text(form, "id", 100);
    const result = await getPool().query(`UPDATE ${table} SET active = NOT active WHERE id=$1`, [id]);
    if (!result.rowCount) throw new InputError("Setting not found");
    await audit(actor, "toggled", kind, id);
  });
}
