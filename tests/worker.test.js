import assert from "node:assert/strict";
import test from "node:test";

import worker from "../worker.js";

const customer = {
  fullName: "AmiLuna Checkout Test",
  email: "checkout-test@amilunacanvasart.com",
  phone: "+254700000000",
  country: "Kenya",
  region: "Nairobi",
  city: "Nairobi",
  postalCode: "00100",
  streetAddress: "Test address"
};

const cartItems = [{ productId: "product-1", variantId: "variant-1", quantity: 2 }];

const printifyProduct = {
  id: "product-1",
  title: "Test Canvas",
  variants: [{ id: "variant-1", title: "16 x 16", price: 2500, is_enabled: true, is_available: true }],
  images: [{ src: "https://example.com/canvas.jpg", is_default: true }]
};

const baseEnv = {
  PRINTIFY_API_TOKEN: "printify-token",
  PRINTIFY_SHOP_ID: "shop-1",
  CHECKOUT_SESSION_SECRET: "checkout-session-secret"
};

function checkoutRequest(path) {
  return new Request(`https://amilunacanvasart.com${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cartItems, customer })
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

async function readJson(response) {
  return { status: response.status, body: await response.json() };
}

test("checkout summary reads Printify bindings and calculates totals on the server", async () => {
  const originalFetch = globalThis.fetch;
  let printifyRequest;
  globalThis.fetch = async (request, options) => {
    printifyRequest = { url: String(request), options };
    return jsonResponse({ data: [printifyProduct] });
  };

  try {
    const result = await readJson(await worker.fetch(checkoutRequest("/api/checkout-summary"), baseEnv));
    assert.equal(result.status, 200);
    assert.equal(result.body.summary.subtotalCents, 5000);
    assert.equal(result.body.summary.shipping.amountCents, 570);
    assert.equal(result.body.summary.totalCents, 5570);
    assert.equal(printifyRequest.url, "https://api.printify.com/v1/shops/shop-1/products.json");
    assert.equal(printifyRequest.options.headers.Authorization, "Bearer printify-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Paystack initialization reads its secret and callback bindings", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (request, options = {}) => {
    requests.push({ url: String(request), options });
    if (String(request).startsWith("https://api.printify.com/")) return jsonResponse({ data: [printifyProduct] });
    return jsonResponse({ status: true, data: { authorization_url: "https://checkout.paystack.com/test", access_code: "access-code" } });
  };

  try {
    const env = {
      ...baseEnv,
      PAYSTACK_SECRET_KEY: "paystack-secret",
      PAYSTACK_CALLBACK_URL: "https://amilunacanvasart.com/payment-result.html",
      PAYSTACK_USD_TO_KES_RATE: "130"
    };
    const result = await readJson(await worker.fetch(checkoutRequest("/api/paystack-initialize"), env));
    const paymentRequest = requests[1];
    const paymentBody = JSON.parse(paymentRequest.options.body);

    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.ok(result.body.sessionToken);
    assert.equal(paymentRequest.options.headers.Authorization, "Bearer paystack-secret");
    assert.equal(paymentBody.amount, "724100");
    assert.equal(paymentBody.currency, "KES");
    assert.equal(paymentBody.callback_url, env.PAYSTACK_CALLBACK_URL);
    assert.deepEqual(result.body.charge, { currency: "KES", amountCents: 724100, usdToKesRate: 130 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Paystack verification matches the signed KES charge", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (request, options = {}) => {
    requests.push({ url: String(request), options });
    if (String(request).startsWith("https://api.printify.com/")) return jsonResponse({ data: [printifyProduct] });
    if (String(request).endsWith("/transaction/initialize")) {
      return jsonResponse({ status: true, data: { authorization_url: "https://checkout.paystack.com/test", access_code: "access-code" } });
    }
    const initialized = requests[1];
    const initializedBody = JSON.parse(initialized.options.body);
    return jsonResponse({
      status: true,
      data: {
        status: "success",
        amount: Number(initializedBody.amount),
        currency: initializedBody.currency,
        metadata: initializedBody.metadata,
        customer: { email: customer.email },
        paid_at: "2026-07-30T18:00:00.000Z"
      }
    });
  };

  try {
    const env = {
      ...baseEnv,
      PAYSTACK_SECRET_KEY: "paystack-secret",
      PAYSTACK_CALLBACK_URL: "https://amilunacanvasart.com/payment-result.html",
      PAYSTACK_USD_TO_KES_RATE: "130"
    };
    const initialized = await readJson(await worker.fetch(checkoutRequest("/api/paystack-initialize"), env));
    const verifiedRequest = new Request("https://amilunacanvasart.com/api/paystack-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: initialized.body.reference, sessionToken: initialized.body.sessionToken })
    });
    const verified = await readJson(await worker.fetch(verifiedRequest, env));

    assert.equal(verified.status, 200);
    assert.equal(verified.body.payment.currency, "KES");
    assert.equal(verified.body.payment.paidAmountCents, 724100);
    assert.equal(verified.body.payment.orderCurrency, "USD");
    assert.equal(verified.body.payment.totalCents, 5570);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Paystack initialization fails closed when the conversion rate is missing", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ data: [printifyProduct] });

  try {
    const result = await readJson(await worker.fetch(checkoutRequest("/api/paystack-initialize"), {
      ...baseEnv,
      PAYSTACK_SECRET_KEY: "paystack-secret"
    }));
    assert.equal(result.status, 503);
    assert.equal(result.body.error, "Card currency conversion is not configured yet.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("PayPal initialization reads live credentials and return URLs", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (request, options = {}) => {
    requests.push({ url: String(request), options });
    if (String(request).startsWith("https://api.printify.com/")) return jsonResponse({ data: [printifyProduct] });
    if (String(request).endsWith("/v1/oauth2/token")) return jsonResponse({ access_token: "paypal-access-token" });
    return jsonResponse({ id: "paypal-order-1", links: [{ rel: "payer-action", href: "https://www.paypal.com/checkoutnow?token=paypal-order-1" }] });
  };

  try {
    const env = {
      ...baseEnv,
      PAYPAL_CLIENT_ID: "paypal-client-id",
      PAYPAL_CLIENT_SECRET: "paypal-client-secret",
      PAYPAL_ENV: "live",
      PAYPAL_RETURN_URL: "https://amilunacanvasart.com/payment-result.html?provider=paypal",
      PAYPAL_CANCEL_URL: "https://amilunacanvasart.com/checkout.html?payment=paypal-cancelled"
    };
    const result = await readJson(await worker.fetch(checkoutRequest("/api/paypal-create-order"), env));
    const tokenRequest = requests[1];
    const orderRequest = requests[2];
    const orderBody = JSON.parse(orderRequest.options.body);
    const experience = orderBody.payment_source.paypal.experience_context;

    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.ok(result.body.sessionToken);
    assert.equal(tokenRequest.url, "https://api-m.paypal.com/v1/oauth2/token");
    assert.match(tokenRequest.options.headers.Authorization, /^Basic /);
    assert.equal(orderRequest.url, "https://api-m.paypal.com/v2/checkout/orders");
    assert.equal(experience.return_url, env.PAYPAL_RETURN_URL);
    assert.equal(experience.cancel_url, env.PAYPAL_CANCEL_URL);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
