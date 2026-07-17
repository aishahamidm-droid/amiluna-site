const CART_STORAGE_KEY = "amiluna_cart_v1";
const CART_EVENT_NAME = "amiluna:cart-updated";

function readStorage() {
  try {
    const rawValue = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeStorage(items) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(
    new CustomEvent(CART_EVENT_NAME, {
      detail: {
        items
      }
    })
  );
}

export function getCartItems() {
  return readStorage();
}

export function getCartCount() {
  return getCartItems().reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartSubtotalCents() {
  return getCartItems().reduce(
    (sum, item) => sum + item.quantity * item.priceCents,
    0
  );
}

export function getEstimatedShippingCents() {
  const items = getCartItems();
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);

  if (!quantity) {
    return 0;
  }

  return 1200 + Math.max(quantity - 1, 0) * 250;
}

export function getEstimatedTotalCents() {
  return getCartSubtotalCents() + getEstimatedShippingCents();
}

export function addCartItem(newItem) {
  const items = getCartItems();
  const existingIndex = items.findIndex(
    (item) =>
      item.productId === newItem.productId &&
      item.variantId === newItem.variantId
  );

  if (existingIndex >= 0) {
    items[existingIndex].quantity += newItem.quantity;
  } else {
    items.push(newItem);
  }

  writeStorage(items);
  return items;
}

export function updateCartItemQuantity(productId, variantId, quantity) {
  const nextQuantity = Math.max(0, Number(quantity) || 0);
  const items = getCartItems()
    .map((item) => {
      if (item.productId === productId && item.variantId === variantId) {
        return {
          ...item,
          quantity: nextQuantity
        };
      }

      return item;
    })
    .filter((item) => item.quantity > 0);

  writeStorage(items);
  return items;
}

export function removeCartItem(productId, variantId) {
  const items = getCartItems().filter(
    (item) =>
      !(item.productId === productId && item.variantId === variantId)
  );

  writeStorage(items);
  return items;
}

export function clearCart() {
  writeStorage([]);
}

export function onCartUpdated(callback) {
  const handler = (event) => {
    callback(event.detail?.items || getCartItems());
  };

  window.addEventListener(CART_EVENT_NAME, handler);

  return () => {
    window.removeEventListener(CART_EVENT_NAME, handler);
  };
}
