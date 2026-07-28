import { buildPaymentApiUrl } from "./site-runtime.js";

const CHECKOUT_SUMMARY_ENDPOINT = buildPaymentApiUrl("/api/checkout-summary");
const PAYSTACK_INITIALIZE_ENDPOINT = buildPaymentApiUrl("/api/paystack-initialize");
const PAYSTACK_VERIFY_ENDPOINT = buildPaymentApiUrl("/api/paystack-verify");
const PAYPAL_CREATE_ORDER_ENDPOINT = buildPaymentApiUrl("/api/paypal-create-order");
const PAYPAL_CAPTURE_ORDER_ENDPOINT = buildPaymentApiUrl("/api/paypal-capture-order");

export async function fetchCheckoutSummary(cartItems, customer) {
  const response = await fetch(CHECKOUT_SUMMARY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      cartItems,
      customer
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Unable to prepare checkout totals.");
  }

  return payload.summary;
}

export async function initializePaystackPayment(cartItems, customer) {
  const response = await fetch(PAYSTACK_INITIALIZE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      cartItems,
      customer
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Unable to initialize Paystack payment.");
  }

  return payload;
}

export async function verifyPaystackPayment(reference, sessionToken) {
  const response = await fetch(PAYSTACK_VERIFY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      reference,
      sessionToken
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Unable to verify Paystack payment.");
  }

  return payload.payment;
}

export async function initializePayPalPayment(cartItems, customer) {
  const response = await fetch(PAYPAL_CREATE_ORDER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      cartItems,
      customer
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Unable to initialize PayPal payment.");
  }

  return payload;
}

export async function capturePayPalPayment(orderId, sessionToken) {
  const response = await fetch(PAYPAL_CAPTURE_ORDER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      orderId,
      sessionToken
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Unable to capture PayPal payment.");
  }

  return payload.payment;
}
