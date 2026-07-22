import { clearCart } from "./cart-store.js";
import { formatPrice } from "./storefront-api.js";
import { buildFunctionUrl } from "./site-runtime.js";
import {
  clearPendingPayment,
  getPendingPayment,
  getVerifiedPayment,
  saveVerifiedPayment
} from "./payment-store.js";

const PAYSTACK_VERIFY_ENDPOINT = buildFunctionUrl("/.netlify/functions/paystack-verify");
const PAYPAL_CAPTURE_ENDPOINT = buildFunctionUrl("/.netlify/functions/paypal-capture-order");

const titleEl = document.getElementById("payment-title");
const messageEl = document.getElementById("payment-message");
const statusEl = document.getElementById("payment-status");
const spinnerEl = document.getElementById("payment-spinner");
const summaryEl = document.getElementById("payment-summary");

function getReferenceFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("reference") || params.get("trxref") || params.get("token") || "";
}

function getPaymentProviderFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("provider") || (params.has("token") ? "paypal" : "paystack");
}

function setStatus(message, type = "default") {
  if (spinnerEl) {
    spinnerEl.hidden = type !== "loading";
  }

  if (type === "loading") {
    statusEl.className = "payment-status";
    statusEl.textContent = "";
    return;
  }

  statusEl.className = `payment-status ${type === "success" ? "is-success" : "is-error"}`;
  statusEl.textContent = message;
}

function renderVerifiedPayment(payment) {
  titleEl.textContent = "Payment confirmed";
  messageEl.textContent = "Your payment has been verified on the server. Your order is being prepared for fulfillment.";
  const providerLabel = payment.provider === "paypal" ? "PayPal" : "Card";
  setStatus(`${providerLabel} payment confirmed and matched to your AmiLuna checkout.`, "success");

  summaryEl.hidden = false;
  summaryEl.innerHTML = `
    <section class="summary-panel">
      <h2>Confirmation details</h2>
      <div class="summary-grid">
        <div class="summary-row"><span>Checkout reference</span><strong>${payment.checkoutReference}</strong></div>
        <div class="summary-row"><span>Payment provider</span><strong>${providerLabel}</strong></div>
        <div class="summary-row"><span>Payment reference</span><strong>${payment.reference}</strong></div>
        <div class="summary-row"><span>Customer email</span><strong>${payment.email}</strong></div>
        <div class="summary-row"><span>Subtotal</span><strong>${formatPrice(payment.subtotalCents)}</strong></div>
        <div class="summary-row"><span>${payment.shipping.label}</span><strong>${formatPrice(payment.shipping.amountCents)}</strong></div>
        <div class="summary-row"><span>Total paid</span><strong>${formatPrice(payment.totalCents)}</strong></div>
      </div>
    </section>
    <section class="summary-panel">
      <h2>Purchased items</h2>
      <div class="item-list">
        ${payment.items.map((item) => `
          <article class="item-row">
            <img src="${item.image}" alt="${item.title}">
            <div>
              <h3>${item.title}</h3>
              <p>${item.variantTitle}</p>
              <p>Quantity: ${item.quantity}</p>
              <strong>${formatPrice(item.lineTotalCents)}</strong>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
    <section class="summary-panel">
      <h2>Shipping address</h2>
      <div class="summary-grid">
        <div class="summary-row"><span>Name</span><strong>${payment.customer.fullName}</strong></div>
        <div class="summary-row"><span>Phone</span><strong>${payment.customer.phone}</strong></div>
        <div class="summary-row"><span>Address</span><strong>${payment.customer.streetAddress}</strong></div>
        <div class="summary-row"><span>City</span><strong>${payment.customer.city}</strong></div>
        <div class="summary-row"><span>County / State</span><strong>${payment.customer.region}</strong></div>
        <div class="summary-row"><span>Country</span><strong>${payment.customer.country}</strong></div>
        <div class="summary-row"><span>Postal code</span><strong>${payment.customer.postalCode || "Not provided"}</strong></div>
      </div>
    </section>
  `;
}

async function verifyPaystackPayment(reference, sessionToken) {
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
    throw new Error(payload.error || "We could not verify that payment.");
  }

  return payload.payment;
}

async function capturePayPalPayment(orderId, sessionToken) {
  const response = await fetch(PAYPAL_CAPTURE_ENDPOINT, {
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
    throw new Error(payload.error || "We could not capture that PayPal payment.");
  }

  return payload.payment;
}

async function initPaymentResult() {
  const reference = getReferenceFromUrl();
  const provider = getPaymentProviderFromUrl();
  const verifiedPayment = reference ? getVerifiedPayment(reference) : null;

  if (verifiedPayment) {
    renderVerifiedPayment(verifiedPayment);
    return;
  }

  if (!reference) {
    titleEl.textContent = "Payment not confirmed";
    messageEl.textContent = "We did not receive a payment reference to verify.";
    setStatus("Return to checkout and try your payment again.", "error");
    return;
  }

  const pendingPayment = getPendingPayment(reference);

  if (!pendingPayment?.sessionToken) {
    titleEl.textContent = "Payment needs attention";
    messageEl.textContent = "We could not find the checkout session needed to verify this payment.";
    setStatus("Return to checkout and restart the payment securely.", "error");
    return;
  }

  try {
    setStatus("", "loading");
    const verified = provider === "paypal"
      ? await capturePayPalPayment(reference, pendingPayment.sessionToken)
      : await verifyPaystackPayment(reference, pendingPayment.sessionToken);
    saveVerifiedPayment(verified);
    clearPendingPayment(reference);
    clearCart();
    renderVerifiedPayment(verified);
  } catch (error) {
    titleEl.textContent = "Payment not confirmed";
    messageEl.textContent = "Your cart is still safe. We only clear it after verified payment success.";
    setStatus(error.message || "We could not verify your payment.", "error");
  }
}

void initPaymentResult();
