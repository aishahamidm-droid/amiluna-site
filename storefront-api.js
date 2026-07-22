import { STORE_CURRENCY, STORE_LOCALE } from "./store-config.js";
import { buildFunctionUrl } from "./site-runtime.js";

const PRODUCTS_ENDPOINT = buildFunctionUrl("/.netlify/functions/printify-products");
let productsPromise = null;

export function formatPrice(cents) {
  if (typeof cents !== "number" || Number.isNaN(cents)) {
    return "Price unavailable";
  }

  return new Intl.NumberFormat(STORE_LOCALE, {
    style: "currency",
    currency: STORE_CURRENCY
  }).format(cents / 100);
}

export function getPrimaryImage(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  return (
    images.find((image) => image.is_default)?.src ||
    images[0]?.src ||
    ""
  );
}

export function getVariantPrice(variant) {
  return typeof variant?.price === "number" ? variant.price : null;
}

export function getLowestPrice(product) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const enabled = variants.filter((variant) => variant.is_enabled !== false);
  const pool = enabled.length ? enabled : variants;
  const prices = pool
    .map((variant) => getVariantPrice(variant))
    .filter((value) => value !== null);

  return prices.length ? Math.min(...prices) : null;
}

export function normalizeText(value) {
  return String(value || "").toLowerCase();
}

export async function fetchProducts({ forceRefresh = false } = {}) {
  if (!productsPromise || forceRefresh) {
    productsPromise = fetch(PRODUCTS_ENDPOINT, {
      headers: {
        Accept: "application/json"
      }
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "Unable to load products.");
        }

        return Array.isArray(payload.products) ? payload.products : [];
      });
  }

  return productsPromise;
}

export async function fetchProductById(productId) {
  const products = await fetchProducts();
  return products.find((product) => String(product.id) === String(productId)) || null;
}

export function getRelatedProducts(product, products, maxItems = 4) {
  const tags = (product.tags || []).map(normalizeText);

  const related = products
    .filter((candidate) => candidate.id !== product.id)
    .map((candidate) => {
      const candidateTags = (candidate.tags || []).map(normalizeText);
      const score = candidateTags.filter((tag) => tags.includes(tag)).length;
      return { candidate, score };
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.candidate);

  return related.slice(0, maxItems);
}
