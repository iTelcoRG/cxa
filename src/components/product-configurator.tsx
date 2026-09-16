"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent } from "react";

import type { PublicProduct } from "../catalogue/customer.ts";
import {
  CUSTOMER_NOTE_MAX_LENGTH,
  DECORATION_LOCATIONS,
  DECORATION_METHODS,
  LOCATION_NOTE_MAX_LENGTH,
  type DecorationLocation,
  type DecorationMethod,
} from "../quote/definitions.ts";
import type { QuoteDecorationSelection, QuoteLine } from "../quote/types.ts";
import { validateQuoteLineAgainstProduct } from "../quote/validation.ts";
import { useQuoteCart } from "./quote-cart-provider.tsx";

const availabilityLabels = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock — availability will be confirmed",
  OUT_OF_STOCK: "Out of stock",
} as const;

const swatchColours: Record<string, string> = {
  black: "#171717", white: "#ffffff", charcoal: "#46484b", army: "#697257",
  bone: "#ded5c5", lilac: "#b9a6ce", navy: "#172540", blue: "#2468b4",
  red: "#b52a32", green: "#376747", grey: "#8b8e91", gray: "#8b8e91",
};

function swatch(description: string) {
  const key = Object.keys(swatchColours).find((name) => description.toLowerCase().includes(name));
  return key ? swatchColours[key] : "#dbe4ea";
}

function createQuoteLineId(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `quote-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ProductConfigurator(props: {
  product: PublicProduct;
  editQuoteLineId?: string;
}) {
  const { cart, hydrated } = useQuoteCart();
  if (props.editQuoteLineId && !hydrated) {
    return <p className="cart-loading">Loading configuration…</p>;
  }
  const initialLine = props.editQuoteLineId
    ? cart.lines.find((line) => line.quoteLineId === props.editQuoteLineId)
    : undefined;
  return <ProductConfiguratorForm {...props} initialLine={initialLine} />;
}

function ProductConfiguratorForm({
  product,
  editQuoteLineId,
  initialLine,
}: {
  product: PublicProduct;
  editQuoteLineId?: string;
  initialLine?: QuoteLine;
}) {
  const router = useRouter();
  const { addLine, editLine } = useQuoteCart();
  const validInitialLine = initialLine?.productId === product.id ? initialLine : undefined;
  const [selectedCode, setSelectedCode] = useState(
    validInitialLine?.colourCode ?? product.colours[0]?.code ?? "",
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(
    validInitialLine?.sizeQuantities ?? {},
  );
  const [decorations, setDecorations] = useState<QuoteDecorationSelection[]>(
    validInitialLine?.decorations ?? [],
  );
  const [configurationId] = useState(validInitialLine?.quoteLineId ?? createQuoteLineId);
  const [uploadingLocation, setUploadingLocation] = useState<DecorationLocation | null>(null);
  const [customerNotes, setCustomerNotes] = useState(validInitialLine?.customerNotes ?? "");
  const [errors, setErrors] = useState<string[]>(
    editQuoteLineId && !validInitialLine
      ? ["That quote configuration could not be loaded for editing."]
      : [],
  );

  const selectedColour =
    product.colours.find((colour) => colour.code === selectedCode) ?? product.colours[0];
  const enabledMethods = useMemo(
    () =>
      DECORATION_METHODS.filter(
        (method) => product.decorations[method.productKey],
      ),
    [product.decorations],
  );

  if (!selectedColour) return <p>Configuration options are being prepared.</p>;

  const selectedImage = selectedColour.images[0] ?? product.primaryImage;

  function changeColour(code: string) {
    setSelectedCode(code);
    setQuantities({});
    setErrors([]);
  }

  function toggleLocation(location: DecorationLocation) {
    setDecorations((current) => {
      const exists = current.some((selection) => selection.location === location);
      if (exists) return current.filter((selection) => selection.location !== location);
      const method = enabledMethods[0]?.code;
      return method ? [...current, { location, method }] : current;
    });
  }

  function updateDecoration(
    location: DecorationLocation,
    patch: Partial<Pick<QuoteDecorationSelection, "method" | "note">>,
  ) {
    setDecorations((current) =>
      current.map((selection) =>
        selection.location === location ? { ...selection, ...patch } : selection,
      ),
    );
  }

  async function uploadArtwork(location: DecorationLocation, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setUploadingLocation(location); setErrors([]);
    try {
      const form = new FormData(); form.set("file", file); form.set("quoteLineId", configurationId); form.set("decorationLocation", location);
      const response = await fetch("/api/artwork/uploads", { method: "POST", body: form }); const result = await response.json() as { ok: boolean; error?: string; artwork?: QuoteDecorationSelection["artwork"] };
      if (!response.ok || !result.ok || !result.artwork) { setErrors([result.error ?? "Artwork upload failed."]); return; }
      setDecorations((current) => current.map((selection) => selection.location === location ? { ...selection, artwork: result.artwork } : selection));
    } catch { setErrors(["Artwork upload failed. Your configuration has been preserved."]); } finally { setUploadingLocation(null); event.target.value = ""; }
  }

  function removeArtwork(location: DecorationLocation) { setDecorations((current) => current.map((selection) => selection.location === location ? { ...selection, artwork: undefined } : selection)); }

  function submitConfiguration() {
    if (uploadingLocation) { setErrors(["Wait for the artwork upload to finish before continuing."]); return; }
    const candidate: QuoteLine = {
      quoteLineId: configurationId,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      colourCode: selectedColour.code,
      colourDescription: selectedColour.description,
      productImage: selectedImage,
      sizeQuantities: quantities,
      totalGarmentQuantity: Object.values(quantities).reduce(
        (total, quantity) => total + (Number.isFinite(quantity) ? quantity : 0),
        0,
      ),
      decorations,
      customerNotes,
    };
    const result = validateQuoteLineAgainstProduct(candidate, product);
    if (!result.valid || !result.line) {
      setErrors(result.errors);
      return;
    }
    if (editQuoteLineId) editLine(result.line);
    else addLine(result.line);
    router.push("/quote");
  }

  return (
    <section className="configurator" aria-labelledby="configure-heading">
      <header className="configurator-heading">
        
        <h2 id="configure-heading">
          {editQuoteLineId ? "Edit configuration" : "Configure this product"}
        </h2>
      </header>

      {errors.length ? (
        <div className="form-errors" id="configuration-errors" role="alert">
          <strong>Please check your configuration:</strong>
          <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </div>
      ) : null}

      <fieldset className="configuration-step">
        <legend><span>1</span> Select colour</legend>
        <div className="colour-options">
          {product.colours.map((colour) => (
            <button
              aria-pressed={colour.code === selectedColour.code}
              className="colour-button"
              key={colour.code}
              onClick={() => changeColour(colour.code)}
              type="button"
            >
              <span className="colour-swatch" style={{ backgroundColor: swatch(colour.description) }} />
              <span>{colour.description}</span>
              <span aria-hidden="true" className="selected-tick">✓</span>
            </button>
          ))}
        </div>
        {selectedImage ? (
          <div className="configuration-image">
            <Image
              alt={`${selectedColour.description} ${product.name}`}
              fill
              sizes="(max-width: 620px) 100vw, 260px"
              src={selectedImage}
              unoptimized
            />
          </div>
        ) : null}
      </fieldset>

      <fieldset className="configuration-step">
        <legend><span>2</span> Select sizes and quantities</legend>
        <div className="quantity-grid">
          {selectedColour.variants.map((variant) => {
            const inputId = `quantity-${selectedColour.code}-${variant.size}`;
            const outOfStock = variant.availability === "OUT_OF_STOCK";
            return (
              <div className="quantity-card" data-disabled={outOfStock} key={variant.size}>
                <div><label htmlFor={inputId}>{variant.size}</label><span
                  className="availability-note"
                  data-availability={variant.availability}
                  id={`${inputId}-availability`}
                >{availabilityLabels[variant.availability]}</span></div>
                <div className="quantity-control">
                <button aria-label={`Decrease ${variant.size} quantity`} disabled={outOfStock || (quantities[variant.size] ?? 0) <= 0} onClick={() => setQuantities(current => ({ ...current, [variant.size]: Math.max(0, (current[variant.size] ?? 0) - 1) }))} type="button">−</button>
                <input
                  aria-describedby={`${inputId}-availability configuration-errors`}
                  disabled={outOfStock}
                  id={inputId}
                  inputMode="numeric"
                  min="0"
                  onChange={(event) =>
                    setQuantities((current) => ({
                      ...current,
                      [variant.size]: event.target.value === "" ? 0 : Number(event.target.value),
                    }))
                  }
                  step="1"
                  type="number"
                  value={quantities[variant.size] ?? 0}
                />
                <button aria-label={`Increase ${variant.size} quantity`} disabled={outOfStock} onClick={() => setQuantities(current => ({ ...current, [variant.size]: (current[variant.size] ?? 0) + 1 }))} type="button">+</button>
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="configuration-step">
        <legend><span>3</span> Choose branding locations</legend>
        <div className="location-grid">
          {DECORATION_LOCATIONS.map((location) => {
            const selection = decorations.find((item) => item.location === location.code);
            return (
              <div className="location-card" data-selected={Boolean(selection)} key={location.code}>
                <button
                  aria-pressed={Boolean(selection)}
                  className="location-toggle"
                  onClick={() => toggleLocation(location.code)}
                  type="button"
                >
                  <span>{location.label}</span>
                  <span aria-hidden="true">{selection ? "✓" : "+"}</span>
                </button>
                {selection ? (
                  <div className="location-details">
                    <label htmlFor={`method-${location.code}`}>Decoration method</label>
                    <select
                      id={`method-${location.code}`}
                      onChange={(event) =>
                        updateDecoration(location.code, {
                          method: event.target.value as DecorationMethod,
                        })
                      }
                      value={selection.method}
                    >
                      {enabledMethods.map((method) => (
                        <option key={method.code} value={method.code}>{method.label}</option>
                      ))}
                    </select>
                    <label htmlFor={`note-${location.code}`}>Artwork note (optional)</label>
                    <input
                      id={`note-${location.code}`}
                      maxLength={LOCATION_NOTE_MAX_LENGTH}
                      onChange={(event) =>
                        updateDecoration(location.code, { note: event.target.value })
                      }
                      placeholder="e.g. Use white version of logo"
                      type="text"
                      value={selection.note ?? ""}
                    />
                    <label htmlFor={`artwork-${location.code}`}>Artwork (optional)</label>
                    <span className="field-help">Upload your logo or artwork. CXA will confirm final print suitability.</span>
                    {selection.artwork ? <div className="artwork-selection"><span>{selection.artwork.originalFileName} ({Math.ceil(selection.artwork.sizeBytes / 1024)} KB)</span><button onClick={() => removeArtwork(location.code)} type="button">Remove</button></div> : null}
                    <input accept=".png,.jpg,.jpeg,.pdf,.svg,image/png,image/jpeg,application/pdf,image/svg+xml" disabled={uploadingLocation === location.code} id={`artwork-${location.code}`} onChange={(event) => void uploadArtwork(location.code, event)} type="file" />
                    {uploadingLocation === location.code ? <span role="status">Uploading artwork…</span> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </fieldset>

      <section className="configuration-step artwork-placeholder">
        <h3><span>4</span> Artwork</h3>
        <p>Artwork is optional. You can upload a different file for each selected branding location above.</p>
        <label htmlFor="customer-notes">General notes (optional)</label>
        <textarea
          id="customer-notes"
          maxLength={CUSTOMER_NOTE_MAX_LENGTH}
          onChange={(event) => setCustomerNotes(event.target.value)}
          rows={3}
          value={customerNotes}
        />
      </section>

      <button
        aria-describedby="configuration-errors"
        className="primary-button add-quote-button"
        disabled={Boolean(uploadingLocation)}
        onClick={submitConfiguration}
        type="button"
      >
        {editQuoteLineId ? "Save configuration" : "Add to quote"}
      </button>
    </section>
  );
}
