const CHECKOUT_SUMMARY_ENDPOINT = "/.netlify/functions/checkout-summary";

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
