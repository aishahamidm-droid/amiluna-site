import { fetchCheckoutSummary } from "./checkout-service.js";

export async function calculateShippingPreview(cartItems, customer) {
  const summary = await fetchCheckoutSummary(cartItems, customer);
  return summary.shipping;
}

export async function prepareCheckoutSummary(cartItems, customer) {
  return fetchCheckoutSummary(cartItems, customer);
}
