import { fetchPrintifyProducts } from "./printify-client.js";
import { STORE_CURRENCY } from "../../../store-config.js";

const SHIPPING_CURRENCY = STORE_CURRENCY;

function toPositiveInteger(value, fallback = 0) {
  const normalized = Number.parseInt(value, 10);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeCartItems(rawItems) {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((item) => ({
      productId: normalizeText(item.productId),
      variantId: normalizeText(item.variantId),
      quantity: toPositiveInteger(item.quantity, 0)
    }))
    .filter((item) => item.productId && item.variantId && item.quantity > 0);
}

function normalizeCustomer(rawCustomer = {}) {
  return {
    fullName: normalizeText(rawCustomer.fullName),
    email: normalizeText(rawCustomer.email),
    phone: normalizeText(rawCustomer.phone),
    country: normalizeText(rawCustomer.country),
    region: normalizeText(rawCustomer.region),
    city: normalizeText(rawCustomer.city),
    postalCode: normalizeText(rawCustomer.postalCode),
    streetAddress: normalizeText(rawCustomer.streetAddress)
  };
}

function buildVariantLookup(products) {
  const productMap = new Map();

  products.forEach((product) => {
    const variantMap = new Map();

    (product.variants || []).forEach((variant) => {
      variantMap.set(String(variant.id), variant);
    });

    productMap.set(String(product.id), {
      product,
      variantMap
    });
  });

  return productMap;
}

function getPrimaryImage(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  return images.find((image) => image.is_default)?.src || images[0]?.src || "";
}

function buildCheckoutItems(cartItems, lookup) {
  const items = [];

  for (const cartItem of cartItems) {
    const productRecord = lookup.get(cartItem.productId);
    if (!productRecord) {
      continue;
    }

    const variant = productRecord.variantMap.get(cartItem.variantId);
    if (
      !variant ||
      variant.is_enabled === false ||
      variant.is_available === false ||
      typeof variant.price !== "number" ||
      variant.price <= 0
    ) {
      continue;
    }

    items.push({
      productId: cartItem.productId,
      variantId: cartItem.variantId,
      title: productRecord.product.title,
      variantTitle: variant.title || "Default",
      quantity: cartItem.quantity,
      image: getPrimaryImage(productRecord.product),
      unitPriceCents: typeof variant.price === "number" ? variant.price : 0,
      lineTotalCents: (typeof variant.price === "number" ? variant.price : 0) * cartItem.quantity
    });
  }

  return items;
}

function calculatePlaceholderShipping({ itemCount, subtotalCents, customer }) {
  if (!itemCount) {
    return {
      label: "Shipping estimate",
      currency: SHIPPING_CURRENCY,
      amountCents: 0,
      provider: "placeholder",
      serviceLevel: "standard"
    };
  }

  const country = customer.country.toLowerCase();
  const hasPostalCode = Boolean(customer.postalCode);
  let base = 1400;
  let perItem = 300;

  if (country === "kenya") {
    base = 450;
    perItem = 120;
  } else if (country === "united states" || country === "usa" || country === "us") {
    base = 1200;
    perItem = 250;
  } else if (country) {
    base = 1800;
    perItem = 350;
  }

  if (subtotalCents >= 15000) {
    perItem = Math.max(100, perItem - 60);
  }

  if (!hasPostalCode && country && country !== "kenya") {
    base += 150;
  }

  return {
    label: "Shipping estimate",
    currency: SHIPPING_CURRENCY,
    amountCents: base + Math.max(itemCount - 1, 0) * perItem,
    provider: "placeholder",
    serviceLevel: "standard"
  };
}

export function validateCheckoutPayload(payload) {
  const cartItems = normalizeCartItems(payload?.cartItems);
  const customer = normalizeCustomer(payload?.customer);
  const requiredFields = [
    ["fullName", "Full name is required."],
    ["email", "Email address is required."],
    ["phone", "Phone number is required."],
    ["country", "Country is required."],
    ["region", "County or state is required."],
    ["city", "City is required."],
    ["streetAddress", "Street address is required."]
  ];

  if (!cartItems.length) {
    return {
      ok: false,
      statusCode: 400,
      error: "Your cart is empty."
    };
  }

  for (const [fieldName, message] of requiredFields) {
    if (!customer[fieldName]) {
      return {
        ok: false,
        statusCode: 400,
        error: message
      };
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    return {
      ok: false,
      statusCode: 400,
      error: "Please enter a valid email address."
    };
  }

  return {
    ok: true,
    cartItems,
    customer
  };
}

export async function buildCheckoutContext(payload) {
  const validation = validateCheckoutPayload(payload);
  if (!validation.ok) {
    return validation;
  }

  const response = await fetchPrintifyProducts();
  const products = Array.isArray(response?.data) ? response.data : [];
  const lookup = buildVariantLookup(products);
  const items = buildCheckoutItems(validation.cartItems, lookup);

  if (!items.length || items.length !== validation.cartItems.length) {
    return {
      ok: false,
      statusCode: 400,
      error: "We could not verify every item in your cart."
    };
  }

  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const shipping = calculatePlaceholderShipping({
    itemCount,
    subtotalCents,
    customer: validation.customer
  });

  return {
    ok: true,
    statusCode: 200,
    customer: validation.customer,
    summary: {
      currency: SHIPPING_CURRENCY,
      items,
      itemCount,
      subtotalCents,
      shipping,
      totalCents: subtotalCents + shipping.amountCents
    }
  };
}

export async function buildCheckoutSummary(payload) {
  const result = await buildCheckoutContext(payload);

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    statusCode: 200,
    summary: result.summary
  };
}
