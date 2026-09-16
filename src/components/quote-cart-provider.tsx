"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  addQuoteLine,
  clearQuoteCart,
  deserializeQuoteCart,
  editQuoteLine,
  removeQuoteLine,
  serializeQuoteCart,
  totalGarmentQuantity,
} from "../quote/cart.ts";
import {
  EMPTY_QUOTE_CART,
  QUOTE_CART_STORAGE_KEY,
  type QuoteCart,
  type QuoteLine,
} from "../quote/types.ts";

interface QuoteCartContextValue {
  cart: QuoteCart;
  hydrated: boolean;
  garmentTotal: number;
  addLine: (line: QuoteLine) => void;
  editLine: (line: QuoteLine) => void;
  removeLine: (quoteLineId: string) => void;
  clearCart: () => void;
}

const QuoteCartContext = createContext<QuoteCartContextValue | null>(null);

const listeners = new Set<() => void>();
let cachedSerialized: string | null | undefined;
let cachedCart = EMPTY_QUOTE_CART;

function readBrowserCart(): QuoteCart {
  const serialized = window.localStorage.getItem(QUOTE_CART_STORAGE_KEY);
  if (serialized !== cachedSerialized) {
    cachedSerialized = serialized;
    cachedCart = deserializeQuoteCart(serialized);
  }
  return cachedCart;
}

function subscribeToCart(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === QUOTE_CART_STORAGE_KEY) {
      cachedSerialized = undefined;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function storeCart(cart: QuoteCart): void {
  const serialized = serializeQuoteCart(cart);
  window.localStorage.setItem(QUOTE_CART_STORAGE_KEY, serialized);
  cachedSerialized = serialized;
  cachedCart = cart;
  listeners.forEach((listener) => listener());
}

const subscribeToHydration = () => () => undefined;

export function QuoteCartProvider({ children }: { children: ReactNode }) {
  const cart = useSyncExternalStore(
    subscribeToCart,
    readBrowserCart,
    () => EMPTY_QUOTE_CART,
  );
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  const value = useMemo<QuoteCartContextValue>(
    () => ({
      cart,
      hydrated,
      garmentTotal: totalGarmentQuantity(cart),
      addLine: (line) => storeCart(addQuoteLine(readBrowserCart(), line)),
      editLine: (line) => storeCart(editQuoteLine(readBrowserCart(), line)),
      removeLine: (quoteLineId) =>
        storeCart(removeQuoteLine(readBrowserCart(), quoteLineId)),
      clearCart: () => storeCart(clearQuoteCart()),
    }),
    [cart, hydrated],
  );

  return <QuoteCartContext.Provider value={value}>{children}</QuoteCartContext.Provider>;
}

export function useQuoteCart(): QuoteCartContextValue {
  const context = useContext(QuoteCartContext);
  if (!context) throw new Error("useQuoteCart must be used within QuoteCartProvider.");
  return context;
}
