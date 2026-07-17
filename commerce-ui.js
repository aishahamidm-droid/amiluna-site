import { getCartCount, onCartUpdated } from "./cart-store.js";

function createCartLink() {
  const link = document.createElement("a");
  link.href = "cart.html";
  link.className = "cart-link";
  link.dataset.cartLink = "true";
  link.innerHTML = `
    <span>Cart</span>
    <span class="cart-badge" data-cart-badge aria-live="polite">0</span>
  `;
  return link;
}

function updateBadges(count) {
  document.querySelectorAll("[data-cart-badge]").forEach((badge) => {
    badge.textContent = String(count);
    badge.classList.toggle("is-empty", count === 0);
  });
}

function ensureCartLink() {
  document.querySelectorAll(".nav").forEach((nav) => {
    if (!nav.querySelector("[data-cart-link]")) {
      nav.appendChild(createCartLink());
    }
  });
}

function initCommerceUi() {
  ensureCartLink();
  updateBadges(getCartCount());
  onCartUpdated((items) => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    updateBadges(count);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCommerceUi);
} else {
  initCommerceUi();
}
