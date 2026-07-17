import {
  getCartItems,
  getCartSubtotalCents,
  getEstimatedShippingCents,
  getEstimatedTotalCents,
  removeCartItem,
  updateCartItemQuantity,
  onCartUpdated
} from "./cart-store.js";
import { formatPrice } from "./storefront-api.js";

const itemsPanel = document.getElementById("cart-items-panel");
const summaryPanel = document.getElementById("cart-summary-panel");

function renderEmptyState() {
  itemsPanel.innerHTML = `
    <article class="cart-empty">
      <p class="section-kicker">Your cart is clear</p>
      <h2>Beautiful pieces look even better once chosen.</h2>
      <p>Explore the AmiLuna collections and add the artworks you want to keep close.</p>
      <a class="continue-btn" href="collections.html">Continue Shopping</a>
    </article>
  `;

  summaryPanel.innerHTML = `
    <div class="cart-summary-panel">
      <h2>Summary</h2>
      <div class="summary-row"><span>Subtotal</span><strong>${formatPrice(0)}</strong></div>
      <div class="summary-row"><span>Estimated shipping</span><strong>${formatPrice(0)}</strong></div>
      <div class="summary-row total-row"><span>Total</span><strong>${formatPrice(0)}</strong></div>
      <p class="summary-note">Once you add a piece, you will be able to continue into checkout and confirm delivery details.</p>
    </div>
  `;
}

function renderSummary() {
  summaryPanel.innerHTML = `
    <div class="cart-summary-panel">
      <h2>Summary</h2>
      <div class="summary-row"><span>Subtotal</span><strong>${formatPrice(getCartSubtotalCents())}</strong></div>
      <div class="summary-row"><span>Estimated shipping</span><strong>${formatPrice(getEstimatedShippingCents())}</strong></div>
      <div class="summary-row total-row"><span>Estimated total</span><strong>${formatPrice(getEstimatedTotalCents())}</strong></div>
      <p class="summary-note">This shipping figure is still an estimate. The checkout page verifies order totals on the server before payment is introduced.</p>
      <div class="summary-actions">
        <a class="primary-btn" href="collections.html">Add More Art</a>
        <a class="secondary-btn" href="checkout.html">Continue to Checkout</a>
      </div>
    </div>
  `;
}

function renderItems() {
  const items = getCartItems();

  if (!items.length) {
    renderEmptyState();
    return;
  }

  itemsPanel.innerHTML = items
    .map((item) => `
      <article class="cart-item" data-product-id="${item.productId}" data-variant-id="${item.variantId}">
        <img src="${item.image}" alt="${item.title}">
        <div>
          <h3>${item.title}</h3>
          <p><strong>Variant:</strong> ${item.variantTitle}</p>
          <p><strong>Price:</strong> ${formatPrice(item.priceCents)}</p>
          <div class="cart-item-actions">
            <div class="qty-pill">
              <button type="button" data-action="decrease">-</button>
              <span>${item.quantity}</span>
              <button type="button" data-action="increase">+</button>
            </div>
            <button class="remove-btn" type="button" data-action="remove">Remove</button>
          </div>
        </div>
      </article>
    `)
    .join("");

  renderSummary();
}

itemsPanel.addEventListener("click", (event) => {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) {
    return;
  }

  const cartItem = actionButton.closest(".cart-item");
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

onCartUpdated(() => {
  renderItems();
});

renderItems();
