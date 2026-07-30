const PRINTIFY_API_BASE = "https://api.printify.com/v1";
const PAYSTACK_API_BASE = "https://api.paystack.co";
const PAYPAL_SANDBOX_API_BASE = "https://api-m.sandbox.paypal.com";
const PAYPAL_LIVE_API_BASE = "https://api-m.paypal.com";
const STORE_CURRENCY = "USD";
const CHECKOUT_SESSION_TTL_MS = 4 * 60 * 60 * 1000;

const PAGE_ALIASES = {
  "/": "/index.html",
  "/gallery": "/gallery.html",
  "/collections": "/collections.html",
  "/about": "/about.html",
  "/product": "/product.html",
  "/cart": "/cart.html",
  "/checkout": "/checkout.html",
  "/payment-result": "/payment-result.html"
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname.startsWith("/api/")) {
      return withCors(handleApiRequest(request, env, url));
    }

    const assetPath = PAGE_ALIASES[url.pathname] || url.pathname;
    const assetUrl = new URL(request.url);
    assetUrl.pathname = assetPath;
    return env.ASSETS.fetch(new Request(assetUrl, request));
  }
};

async function withCors(responsePromise) {
  try {
    const response = await responsePromise;
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError ? error.message : "We could not complete that request right now.";
    return json({ ok: false, error: message }, status, CORS_HEADERS);
  }
}

async function handleApiRequest(request, env, url) {
  if (request.method !== "POST") throw new HttpError(405, "Method not allowed.");
  const payload = await readJson(request);

  switch (url.pathname) {
    case "/api/checkout-summary": {
      const context = await buildCheckoutContext(payload, env);
      return json({ ok: true, summary: context.summary });
    }
    case "/api/paystack-initialize":
      return json(await initializePaystack(payload, env, request.url));
    case "/api/paystack-verify":
      return json(await verifyPaystack(payload, env));
    case "/api/paypal-create-order":
      return json(await createPayPalOrder(payload, env, request.url));
    case "/api/paypal-capture-order":
      return json(await capturePayPalOrder(payload, env));
    default:
      throw new HttpError(404, "Payment endpoint not found.");
  }
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Please send a valid checkout request.");
  }
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extraHeaders }
  });
}

function normalizeText(value) {
  return String(value || "").trim();
}

function positiveInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeCartItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((item) => ({
    productId: normalizeText(item.productId),
    variantId: normalizeText(item.variantId),
    quantity: positiveInteger(item.quantity)
  })).filter((item) => item.productId && item.variantId && item.quantity);
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

function validateCheckoutPayload(payload) {
  const cartItems = normalizeCartItems(payload?.cartItems);
  const customer = normalizeCustomer(payload?.customer);
  if (!cartItems.length) throw new HttpError(400, "Your cart is empty.");

  const fields = [
    ["fullName", "Please enter your full name."],
    ["email", "Please enter your email address."],
    ["phone", "Please enter your phone number."],
    ["country", "Please select your country."],
    ["region", "Please enter your county or state."],
    ["city", "Please enter your city."],
    ["streetAddress", "Please enter your street address."]
  ];
  for (const [field, message] of fields) {
    if (!customer[field]) throw new HttpError(400, message);
  }
  if (!/^\S+@\S+\.\S+$/.test(customer.email)) {
    throw new HttpError(400, "Please enter a valid email address.");
  }
  return { cartItems, customer };
}

async function fetchPrintifyProducts(env) {
  if (!env.PRINTIFY_API_TOKEN || !env.PRINTIFY_SHOP_ID) {
    throw new HttpError(503, "The store catalog is not configured yet.");
  }
  const response = await fetch(`${PRINTIFY_API_BASE}/shops/${encodeURIComponent(env.PRINTIFY_SHOP_ID)}/products.json`, {
    headers: { Authorization: `Bearer ${env.PRINTIFY_API_TOKEN}`, Accept: "application/json" }
  });
  if (!response.ok) throw new HttpError(502, "We could not verify your cart with the store catalog.");
  const data = await response.json();
  return Array.isArray(data?.data) ? data.data : [];
}

function primaryImage(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  return images.find((image) => image.is_default)?.src || images[0]?.src || "";
}

function buildProductLookup(products) {
  return new Map(products.map((product) => [String(product.id), {
    product,
    variants: new Map((Array.isArray(product.variants) ? product.variants : []).map((variant) => [String(variant.id), variant]))
  }]));
}

function verifiedItems(cartItems, lookup) {
  const items = [];
  for (const cartItem of cartItems) {
    const record = lookup.get(cartItem.productId);
    const variant = record?.variants.get(cartItem.variantId);
    const price = Number(variant?.price);
    if (!record || !variant || variant.is_enabled === false || variant.is_available === false || !Number.isFinite(price) || price <= 0) {
      throw new HttpError(400, "We could not verify every item in your cart. Please refresh your cart and try again.");
    }
    items.push({
      productId: cartItem.productId,
      variantId: cartItem.variantId,
      title: record.product.title || "AmiLuna artwork",
      variantTitle: variant.title || "Default",
      quantity: cartItem.quantity,
      image: primaryImage(record.product),
      unitPriceCents: Math.round(price),
      lineTotalCents: Math.round(price) * cartItem.quantity
    });
  }
  return items;
}

function calculateShipping({ itemCount, subtotalCents, customer }) {
  if (!itemCount) return { amountCents: 0, currency: STORE_CURRENCY, label: "No shipping required", provider: "placeholder", serviceLevel: "standard" };
  const country = customer.country.toLowerCase();
  let base = 1800;
  let perItem = 350;
  if (country.includes("kenya")) { base = 450; perItem = 120; }
  if (country === "us" || country.includes("united states")) { base = 1200; perItem = 250; }
  if (subtotalCents >= 15000) perItem = Math.max(100, perItem - 60);
  if (!customer.postalCode && country && !country.includes("kenya")) base += 150;
  return { amountCents: base + Math.max(0, itemCount - 1) * perItem, currency: STORE_CURRENCY, label: "Estimated standard shipping", provider: "placeholder", serviceLevel: "standard" };
}

async function buildCheckoutContext(payload, env) {
  const { cartItems, customer } = validateCheckoutPayload(payload);
  const products = await fetchPrintifyProducts(env);
  const items = verifiedItems(cartItems, buildProductLookup(products));
  const subtotalCents = items.reduce((total, item) => total + item.lineTotalCents, 0);
  const shipping = calculateShipping({ itemCount: items.reduce((total, item) => total + item.quantity, 0), subtotalCents, customer });
  return {
    customer,
    summary: {
      currency: STORE_CURRENCY,
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      subtotalCents,
      shipping,
      totalCents: subtotalCents + shipping.amountCents
    }
  };
}

function amount(cents) {
  return (cents / 100).toFixed(2);
}

function apiError(response, fallback) {
  return response.text().then(() => new HttpError(502, fallback));
}

async function initializePaystack(payload, env, requestUrl) {
  const context = await buildCheckoutContext(payload, env);
  if (!env.PAYSTACK_SECRET_KEY) throw new HttpError(503, "Card payment is not configured yet.");
  const checkoutReference = createReference("AML");
  const reference = createReference("AMLPAY");
  const callbackUrl = env.PAYSTACK_CALLBACK_URL || new URL("/payment-result.html", requestUrl).href;
  const response = await fetch(`${PAYSTACK_API_BASE}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      email: context.customer.email,
      amount: String(context.summary.totalCents),
      currency: context.summary.currency,
      reference,
      callback_url: callbackUrl,
      metadata: { internal_checkout_reference: checkoutReference, item_count: context.summary.itemCount }
    })
  });
  if (!response.ok) throw await apiError(response, "We could not start the card payment. Please try again.");
  const data = await response.json();
  if (!data?.status || !data.data?.authorization_url) throw new HttpError(502, "We could not start the card payment. Please try again.");
  return {
    ok: true,
    checkoutReference,
    reference,
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code || "",
    sessionToken: await createCheckoutSession({ provider: "paystack", checkoutReference, reference, customer: context.customer, summary: context.summary }, env)
  };
}

async function verifyPaystack(payload, env) {
  if (!env.PAYSTACK_SECRET_KEY) throw new HttpError(503, "Card payment is not configured yet.");
  const session = await readCheckoutSession(payload?.sessionToken, env, "paystack");
  const reference = normalizeText(payload?.reference || payload?.paymentReference);
  if (!reference || reference !== session.reference) throw new HttpError(400, "The payment reference could not be verified.");
  const response = await fetch(`${PAYSTACK_API_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, Accept: "application/json" }
  });
  if (!response.ok) throw await apiError(response, "We could not verify the card payment. Please try again.");
  const data = await response.json();
  const transaction = data?.data;
  if (!data?.status || transaction?.status !== "success" || Number(transaction.amount) !== session.summary.totalCents || transaction.currency !== session.summary.currency) {
    throw new HttpError(400, "The card payment has not completed yet.");
  }
  if (transaction.metadata?.internal_checkout_reference !== session.checkoutReference || transaction.customer?.email?.toLowerCase() !== session.customer.email.toLowerCase()) {
    throw new HttpError(400, "The payment details could not be verified.");
  }
  return { ok: true, payment: completedPayment("paystack", reference, session, transaction.paid_at || transaction.transaction_date) };
}

async function getPayPalAccessToken(env) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) throw new HttpError(503, "PayPal is not configured yet.");
  const response = await fetch(`${paypalBaseUrl(env)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: "grant_type=client_credentials"
  });
  if (!response.ok) throw await apiError(response, "We could not connect to PayPal right now.");
  const data = await response.json();
  if (!data?.access_token) throw new HttpError(502, "We could not connect to PayPal right now.");
  return data.access_token;
}

function paypalBaseUrl(env) {
  return String(env.PAYPAL_ENV || "sandbox").toLowerCase() === "live" ? PAYPAL_LIVE_API_BASE : PAYPAL_SANDBOX_API_BASE;
}

async function createPayPalOrder(payload, env, requestUrl) {
  const context = await buildCheckoutContext(payload, env);
  const checkoutReference = createReference("AML");
  const accessToken = await getPayPalAccessToken(env);
  const returnUrl = env.PAYPAL_RETURN_URL || new URL("/payment-result.html?provider=paypal", requestUrl).href;
  const cancelUrl = env.PAYPAL_CANCEL_URL || new URL("/checkout.html?payment=paypal-cancelled", requestUrl).href;
  const response = await fetch(`${paypalBaseUrl(env)}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json", "PayPal-Request-Id": checkoutReference },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: checkoutReference,
        description: `AmiLuna order for ${context.customer.fullName}`,
        amount: {
          currency_code: context.summary.currency,
          value: amount(context.summary.totalCents),
          breakdown: {
            item_total: { currency_code: context.summary.currency, value: amount(context.summary.subtotalCents) },
            shipping: { currency_code: context.summary.currency, value: amount(context.summary.shipping.amountCents) }
          }
        },
        items: context.summary.items.map((item) => ({
          name: item.title.slice(0, 127),
          description: item.variantTitle.slice(0, 127),
          quantity: String(item.quantity),
          unit_amount: { currency_code: context.summary.currency, value: amount(item.unitPriceCents) }
        }))
      }],
      payment_source: { paypal: { experience_context: {
        payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
        brand_name: "AmiLuna",
        locale: "en-US",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl
      } } }
    })
  });
  if (!response.ok) throw await apiError(response, "We could not start PayPal checkout. Please try again.");
  const order = await response.json();
  const approvalUrl = order?.links?.find((link) => link.rel === "payer-action" || link.rel === "approve")?.href;
  if (!order?.id || !approvalUrl) throw new HttpError(502, "We could not start PayPal checkout. Please try again.");
  return {
    ok: true,
    provider: "paypal",
    checkoutReference,
    orderId: order.id,
    approvalUrl,
    sessionToken: await createCheckoutSession({ provider: "paypal", checkoutReference, orderId: order.id, customer: context.customer, summary: context.summary }, env)
  };
}

async function capturePayPalOrder(payload, env) {
  const session = await readCheckoutSession(payload?.sessionToken, env, "paypal");
  const orderId = normalizeText(payload?.orderId || payload?.token);
  if (!orderId || orderId !== session.orderId) throw new HttpError(400, "The PayPal order could not be verified.");
  const accessToken = await getPayPalAccessToken(env);
  const response = await fetch(`${paypalBaseUrl(env)}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json", "PayPal-Request-Id": session.checkoutReference }
  });
  if (!response.ok) throw await apiError(response, "We could not complete the PayPal payment. Please try again.");
  const order = await response.json();
  const capture = order?.purchase_units?.[0]?.payments?.captures?.find((item) => item.status === "COMPLETED");
  if (order?.status !== "COMPLETED" || !capture || capture.amount?.currency_code !== session.summary.currency || Number(capture.amount?.value) !== Number(amount(session.summary.totalCents))) {
    throw new HttpError(400, "The PayPal payment has not completed yet.");
  }
  return { ok: true, payment: completedPayment("paypal", capture.id || orderId, session, capture.create_time) };
}

function completedPayment(provider, reference, session, verifiedAt) {
  return {
    provider,
    checkoutReference: session.checkoutReference,
    reference,
    currency: session.summary.currency,
    paidAmountCents: session.summary.totalCents,
    email: session.customer.email,
    status: "verified",
    verifiedAt: verifiedAt || new Date().toISOString(),
    transactionDate: verifiedAt || new Date().toISOString(),
    items: session.summary.items,
    shipping: session.summary.shipping,
    subtotalCents: session.summary.subtotalCents,
    totalCents: session.summary.totalCents,
    customer: session.customer
  };
}

function createReference(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

async function createCheckoutSession(payload, env) {
  if (!env.CHECKOUT_SESSION_SECRET) throw new HttpError(503, "Secure checkout is not configured yet.");
  const content = { version: 1, issuedAt: Date.now(), ...payload };
  const encoded = base64UrlEncode(JSON.stringify(content));
  return `${encoded}.${await sign(encoded, env.CHECKOUT_SESSION_SECRET)}`;
}

async function readCheckoutSession(token, env, expectedProvider) {
  if (!env.CHECKOUT_SESSION_SECRET) throw new HttpError(503, "Secure checkout is not configured yet.");
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature || signature !== await sign(encoded, env.CHECKOUT_SESSION_SECRET)) {
    throw new HttpError(400, "Your checkout session has expired. Please return to checkout and try again.");
  }
  let session;
  try { session = JSON.parse(base64UrlDecode(encoded)); } catch { throw new HttpError(400, "Your checkout session has expired. Please return to checkout and try again."); }
  if (session.version !== 1 || session.provider !== expectedProvider || !session.issuedAt || Date.now() - session.issuedAt > CHECKOUT_SESSION_TTL_MS) {
    throw new HttpError(400, "Your checkout session has expired. Please return to checkout and try again.");
  }
  return session;
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

function base64UrlEncode(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
