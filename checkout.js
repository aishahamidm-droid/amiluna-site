import {
  getCartItems,
  removeCartItem,
  updateCartItemQuantity,
  onCartUpdated
} from "./cart-store.js";
import { readCheckoutDraft, writeCheckoutDraft } from "./checkout-store.js";
import { formatPrice } from "./storefront-api.js";
import { prepareCheckoutSummary } from "./shipping-service.js";
import { initializePayPalPayment } from "./checkout-service.js";
import { savePendingPayment } from "./payment-store.js";
import { PRINTIFY_COUNTRIES, normalizePrintifyCountryCode } from "./country-data.js";

const form = document.getElementById("checkout-form");
const feedback = document.getElementById("checkout-feedback");
const paymentFeedback = document.getElementById("payment-feedback");
const itemsContainer = document.getElementById("checkout-items");
const summaryContainer = document.getElementById("checkout-summary");
const loadingState = document.getElementById("checkout-loading");
const refreshButton = document.getElementById("refresh-summary-btn");
const saveButton = document.getElementById("save-checkout-btn");
const paypalButton = document.getElementById("paypal-button");
const countrySelect = form.elements.namedItem("country");

let isSummaryLoading = false;
let isPaymentLoading = false;
let verifiedSummary = null;

function getCustomerFromForm() {
  const formData = new FormData(form);

  return {
    fullName: String(formData.get("fullName") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    country: String(formData.get("country") || "").trim(),
    region: String(formData.get("region") || "").trim(),
    city: String(formData.get("city") || "").trim(),
    postalCode: String(formData.get("postalCode") || "").trim(),
    streetAddress: String(formData.get("streetAddress") || "").trim()
  };
}

function setFeedback(message, type = "default") {
  if (!message) {
    feedback.hidden = true;
    feedback.textContent = "";
    feedback.className = "checkout-feedback";
    return;
  }

  feedback.hidden = false;
  feedback.textContent = message;
  feedback.className = `checkout-feedback${type === "error" ? " is-error" : ""}${type === "success" ? " is-success" : ""}`;
}

function setPaymentFeedback(message, type = "default") {
  if (!message) {
    paymentFeedback.hidden = true;
    paymentFeedback.textContent = "";
    paymentFeedback.className = "checkout-feedback";
    return;
  }

  paymentFeedback.hidden = false;
  paymentFeedback.textContent = message;
  paymentFeedback.className = `checkout-feedback${type === "error" ? " is-error" : ""}${type === "success" ? " is-success" : ""}`;
}

function syncLoadingState() {
  const isLoading = isSummaryLoading || isPaymentLoading;
  loadingState.hidden = !isSummaryLoading;
  refreshButton.disabled = isLoading;
  saveButton.disabled = isLoading;
  paypalButton.disabled = isLoading || !verifiedSummary;
  paypalButton.textContent = isPaymentLoading
    ? "Connecting..."
    : "Pay with PayPal";
}

function setSummaryLoading(isLoading) {
  isSummaryLoading = isLoading;
  syncLoadingState();
}

function setPaymentLoading(isLoading) {
  isPaymentLoading = isLoading;
  syncLoadingState();
}

function resetVerifiedSummary() {
  verifiedSummary = null;
  syncLoadingState();
}

function renderEmptyCheckout() {
  itemsContainer.innerHTML = `
    <article class="checkout-empty">
      <p class="section-kicker">Your cart is clear</p>
      <h2>There is nothing to check out yet.</h2>
      <p>Add your favorite AmiLuna pieces first, then return here to complete delivery details.</p>
      <a class="primary-btn" href="collections.html">Explore Collections</a>
    </article>
  `;

  summaryContainer.innerHTML = `
    <div class="summary-row"><span>Subtotal</span><strong>${formatPrice(0)}</strong></div>
    <div class="summary-row"><span>Shipping</span><strong>${formatPrice(0)}</strong></div>
    <div class="summary-row total-row"><span>Total</span><strong>${formatPrice(0)}</strong></div>
  `;
}

function renderCartItems(items) {
  itemsContainer.innerHTML = items
    .map((item) => `
      <article class="checkout-item" data-product-id="${item.productId}" data-variant-id="${item.variantId}">
        <img src="${item.image}" alt="${item.title}">
        <div>
          <h3>${item.title}</h3>
          <p>${item.variantTitle}</p>
          <div class="meta-row">
            <span>${formatPrice(item.unitPriceCents)} each</span>
            <span>Qty: ${item.quantity}</span>
            <strong>${formatPrice(item.lineTotalCents)}</strong>
          </div>
          <div class="mini-qty-row">
            <button type="button" data-action="decrease">-</button>
            <button type="button" data-action="increase">+</button>
            <button type="button" data-action="remove">Remove</button>
          </div>
        </div>
      </article>
    `)
    .join("");
}

function renderDraftCartItems(items) {
  renderCartItems(
    items.map((item) => ({
      ...item,
      unitPriceCents: item.priceCents,
      lineTotalCents: item.priceCents * item.quantity
    }))
  );
}

function renderSummary(summary) {
  verifiedSummary = summary;
  renderCartItems(summary.items);

  if (!countrySelect.value && summary.shipping.countryCode) {
    countrySelect.value = summary.shipping.countryCode;
    writeCheckoutDraft(getCustomerFromForm());
  }

  summaryContainer.innerHTML = `
    <div class="summary-row"><span>Products</span><strong>${summary.itemCount}</strong></div>
    <div class="summary-row"><span>Subtotal</span><strong>${formatPrice(summary.subtotalCents)}</strong></div>
    <div class="summary-row"><span>${summary.shipping.label}</span><strong>${formatPrice(summary.shipping.amountCents)}</strong></div>
    <div class="summary-row total-row"><span>Total</span><strong>${formatPrice(summary.totalCents)}</strong></div>
  `;

  syncLoadingState();
}

function populateDraft() {
  const draft = readCheckoutDraft();

  Object.entries(draft).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);
    if (field) {
      field.value = name === "country" ? normalizePrintifyCountryCode(value) : value;
    }
  });
}

function populateCountryOptions() {
  const options = document.createDocumentFragment();
  PRINTIFY_COUNTRIES.forEach(([code, name]) => {
    options.appendChild(new Option(name, code));
  });
  countrySelect.appendChild(options);
}

function validateForm() {
  const customer = getCustomerFromForm();
  const errors = [];

  form.querySelectorAll("input, select").forEach((field) => {
    field.removeAttribute("aria-invalid");
  });

  [
    ["fullName", "Please enter the full name."],
    ["email", "Please enter a valid email address."],
    ["phone", "Please enter the phone number."],
    ["country", "Please select the country."],
    ["region", "Please enter the county or state."],
    ["city", "Please enter the city."],
    ["streetAddress", "Please enter the street address."]
  ].forEach(([fieldName, message]) => {
    const value = customer[fieldName];
    const input = form.elements.namedItem(fieldName);

    if (!value) {
      input?.setAttribute("aria-invalid", "true");
      errors.push(message);
    }
  });

  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    form.elements.namedItem("email")?.setAttribute("aria-invalid", "true");
    errors.push("Please enter a valid email address.");
  }

  return {
    valid: errors.length === 0,
    customer,
    message: errors[0] || ""
  };
}

async function refreshSummary({ showSuccess = false, requireAddress = false } = {}) {
  const items = getCartItems();

  if (!items.length) {
    resetVerifiedSummary();
    renderEmptyCheckout();
    setFeedback("Your cart is empty. Add a piece before continuing to checkout.", "error");
    return;
  }

  const customer = getCustomerFromForm();
  if (requireAddress) {
    const validation = validateForm();
    if (!validation.valid) {
      setFeedback(validation.message, "error");
      return false;
    }
  }

  writeCheckoutDraft(customer);
  setSummaryLoading(true);
  setFeedback("");
  setPaymentFeedback("");

  try {
    const summary = await prepareCheckoutSummary(items, customer);
    renderSummary(summary);
    setFeedback(
      showSuccess
        ? "Your delivery details have been saved and the order total has been refreshed."
        : "",
      "success"
    );
    return true;
  } catch (error) {
    resetVerifiedSummary();
    setFeedback(error.message || "Unable to refresh the checkout summary right now.", "error");
    return false;
  } finally {
    setSummaryLoading(false);
  }
}

function bindCartActions() {
  itemsContainer.addEventListener("click", (event) => {
    const actionButton = event.target.closest("button[data-action]");
    if (!actionButton) {
      return;
    }

    const cartItem = actionButton.closest(".checkout-item");
    if (!cartItem) {
      return;
    }

    const productId = cartItem.dataset.productId;
    const variantId = cartItem.dataset.variantId;
    const currentItem = getCartItems().find(
      (item) => item.productId === productId && item.variantId === variantId
    );

    if (!currentItem) {
      return;
    }

    if (actionButton.dataset.action === "increase") {
      updateCartItemQuantity(productId, variantId, currentItem.quantity + 1);
    }

    if (actionButton.dataset.action === "decrease") {
      updateCartItemQuantity(productId, variantId, currentItem.quantity - 1);
    }

    if (actionButton.dataset.action === "remove") {
      removeCartItem(productId, variantId);
    }
  });
}

function initDraftAutosave() {
  form.addEventListener("input", () => {
    writeCheckoutDraft(getCustomerFromForm());
  });

  countrySelect.addEventListener("change", async () => {
    writeCheckoutDraft(getCustomerFromForm());
    await refreshSummary();
  });
}

function initForm() {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await refreshSummary({ showSuccess: true, requireAddress: true });
  });

  refreshButton.addEventListener("click", async () => {
    await refreshSummary();
  });

  paypalButton.addEventListener("click", async () => {
    const items = getCartItems();
    if (!items.length) {
      resetVerifiedSummary();
      renderEmptyCheckout();
      setPaymentFeedback("Your cart is empty. Add a piece before starting payment.", "error");
      return;
    }

    const validation = validateForm();
    if (!validation.valid) {
      setFeedback(validation.message, "error");
      setPaymentFeedback("Please complete your delivery details before paying.", "error");
      return;
    }

    writeCheckoutDraft(validation.customer);

    const summaryReady = await refreshSummary({ requireAddress: true });
    if (!summaryReady) {
      setPaymentFeedback("Please refresh your verified totals before continuing to PayPal.", "error");
      return;
    }

    setPaymentLoading(true);
    setPaymentFeedback("");

    try {
      const payment = await initializePayPalPayment(items, validation.customer);
      savePendingPayment({
        provider: "paypal",
        reference: payment.orderId,
        checkoutReference: payment.checkoutReference,
        sessionToken: payment.sessionToken,
        createdAt: new Date().toISOString()
      });
      window.location.href = payment.approvalUrl;
    } catch (error) {
      setPaymentFeedback(
        error.message || "We could not connect you to PayPal right now. Please try again.",
        "error"
      );
    } finally {
      setPaymentLoading(false);
    }
  });
}

function initCheckout() {
  populateCountryOptions();
  populateDraft();
  bindCartActions();
  initDraftAutosave();
  initForm();

  const items = getCartItems();
  if (!items.length) {
    resetVerifiedSummary();
    renderEmptyCheckout();
    setFeedback("Your cart is empty. Add a piece before continuing to checkout.", "error");
  } else {
    renderDraftCartItems(items);
    void refreshSummary();
  }

  onCartUpdated(() => {
    if (!getCartItems().length) {
      resetVerifiedSummary();
      renderEmptyCheckout();
      setFeedback("Your cart is empty. Add a piece before continuing to checkout.", "error");
      return;
    }

    void refreshSummary();
  });

  syncLoadingState();
}

initCheckout();
