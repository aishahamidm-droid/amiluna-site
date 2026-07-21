import { STORE_CURRENCY, STORE_LOCALE } from "./store-config.js";

const PRODUCTS_ENDPOINT = "/.netlify/functions/printify-products";
let productsPromise = null;

const LOCAL_ARTWORK_GALLERY = [
  { title: "Vibrant Multicolor Calla", baseName: "art1" },
  { title: "Moonlit Calla", baseName: "art3" },
  { title: "Midnight Reverie", baseName: "art5" },
  { title: "Velora Flora", baseName: "art7" },
  { title: "Forever Yours - Romantic Red Rose", baseName: "art8" },
  { title: "Sage Halo", baseName: "art12" },
  { title: "Classic White Calla", baseName: "art13" },
  { title: "Elegant White Calla", baseName: "art22" },
  { title: "Solara Verde", baseName: "art2" },
  { title: "TerraMuse", baseName: "art4" },
  { title: "Eternal Bloom", baseName: "art6" },
  { title: "Celora Poise", baseName: "art9" },
  { title: "Soft Pink Calla", baseName: "art11" },
  { title: "Monvera Noir", baseName: "art14" },
  { title: "Blush Dahlia", baseName: "art15" },
  { title: "Aurora Petalis", baseName: "art17" },
  { title: "Pure Grace Calla", baseName: "art18" },
  { title: "Blush Whisper", baseName: "art19" },
  { title: "Soft Petals Calla", baseName: "art20" },
  { title: "Emberleaf Harmony", baseName: "art21" },
  { title: "Lunara Bloom", baseName: "art23" }
];

function buildLocalGalleryImages(baseName) {
  return [
    `/artworks/${baseName}.jpg`,
    ...Array.from({ length: 5 }, (_, index) => `/artworks/${baseName}Pic${index + 1}.png`)
  ];
}

function getLocalArtworkGallery(product) {
  const title = normalizeText(product?.title);
  const match = LOCAL_ARTWORK_GALLERY.find((artwork) => normalizeText(artwork.title) === title);

  if (!match) {
    return [];
  }

  return buildLocalGalleryImages(match.baseName);
}

export function getProductGalleryImages(product) {
  const remoteImages = Array.isArray(product?.images)
    ? product.images.map((image) => image?.src).filter(Boolean)
    : [];
  const localImages = getLocalArtworkGallery(product);

  return Array.from(new Set([...remoteImages, ...localImages]));
}

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
  const localGallery = getLocalArtworkGallery(product);

  return (
    images.find((image) => image.is_default)?.src ||
    images[0]?.src ||
    localGallery[0] ||
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

        return Array.isArray(payload.products)
          ? payload.products.map((product) => ({
              ...product,
              galleryImages: getProductGalleryImages(product)
            }))
          : [];
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
