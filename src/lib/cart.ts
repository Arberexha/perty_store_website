import type { DesignRequestInput } from "./design-request";

export const CART_EVENT = "perty-cart-changed";
const DB_NAME = "perty-cart";
const STORE_NAME = "items";
export const MAX_CART_ITEMS = 5;

export type CartItem = Pick<DesignRequestInput, "product" | "catalogProductId" | "productColor" | "layers" | "personalizations" | "previewSide" | "previewHeight" | "productColors" | "previewPng"> & {
  id: string;
  productName: string;
  productSlug: string;
  variantId: string;
  quantity: number;
  addedAt: number;
};

function openCart(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "id" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the cart"));
  });
}

async function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason: unknown) => void) => void): Promise<T> {
  const db = await openCart();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let result: T;
    action(store, (value) => { result = value; }, reject);
    transaction.onerror = () => reject(transaction.error ?? new Error("Cart storage failed"));
    transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("Cart storage was interrupted")); };
    transaction.oncomplete = () => { db.close(); resolve(result); };
  });
}

export async function cartItems(): Promise<CartItem[]> {
  const items = await transact<CartItem[]>("readonly", (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as CartItem[]);
    request.onerror = () => reject(request.error);
  });
  return items.sort((a, b) => a.addedAt - b.addedAt);
}

function changed() { window.dispatchEvent(new Event(CART_EVENT)); }

export async function addCartItem(item: CartItem): Promise<void> {
  if ((await cartItems()).length >= MAX_CART_ITEMS) throw new Error(`The cart can hold up to ${MAX_CART_ITEMS} designs. Place this order before adding more.`);
  await transact<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  changed();
}

export async function saveCartItem(item: CartItem): Promise<void> {
  await transact<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  changed();
}

export async function removeCartItem(id: string): Promise<void> {
  await transact<void>("readwrite", (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  changed();
}

export async function clearCart(): Promise<void> {
  await transact<void>("readwrite", (store, resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  changed();
}
