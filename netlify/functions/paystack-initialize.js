import { buildCheckoutContext } from "./lib/checkout.js";
import { jsonResponse, methodNotAllowed, optionsResponse } from "./lib/http.js";
import {
  createCheckoutSessionToken,
  generateCheckoutReference,
  generatePaystackReference
} from "./lib/checkout-session.js";
import {
  getPaystackCallbackUrl,
  initializePaystackTransaction,
  toSafePaystackErrorPayload
} from "./lib/paystack.js";
import { toSafeErrorPayload } from "./lib/printify-client.js";

function sanitizeCustomerForPayment(customer) {
  return {
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    country: customer.country,
    region: customer.region,
    city: customer.city,
    postalCode: customer.postalCode,
    streetAddress: customer.streetAddress
  };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return optionsResponse();
  }

  if (event.httpMethod !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const checkoutResult = await buildCheckoutContext(payload);

    if (!checkoutResult.ok) {
      return jsonResponse(checkoutResult.statusCode, {
        ok: false,
        error: checkoutResult.error
      });
    }

    const checkoutReference = generateCheckoutReference();
    const paystackReference = generatePaystackReference();
    const callbackUrl = getPaystackCallbackUrl();
    const summary = checkoutResult.summary;
    const customer = sanitizeCustomerForPayment(checkoutResult.customer);

    const paystackResponse = await initializePaystackTransaction({
      email: customer.email,
      amount: String(summary.totalCents),
      currency: summary.currency,
      reference: paystackReference,
      callback_url: callbackUrl,
      metadata: {
        internal_checkout_reference: checkoutReference,
        item_count: summary.itemCount
      }
    });

    if (!paystackResponse.data?.authorization_url) {
      return jsonResponse(502, {
        ok: false,
        error: "Paystack did not return a checkout authorization link."
      });
    }

    const sessionToken = createCheckoutSessionToken({
      checkoutReference,
      paystackReference,
      status: "initialized",
      customer,
      summary
    });

    return jsonResponse(200, {
      ok: true,
      checkoutReference,
      reference: paystackReference,
      authorizationUrl: paystackResponse.data?.authorization_url || "",
      accessCode: paystackResponse.data?.access_code || "",
      sessionToken
    });
  } catch (error) {
    const safePaystackError = toSafePaystackErrorPayload(
      error,
      "Unable to initialize Paystack right now."
    );

    if (safePaystackError.statusCode !== 500 || safePaystackError.details) {
      return jsonResponse(safePaystackError.statusCode, {
        ok: false,
        error: safePaystackError.message
      });
    }

    const safeError = toSafeErrorPayload(
      error,
      "Unable to initialize payment right now."
    );

    return jsonResponse(safeError.statusCode, {
      ok: false,
      error: safeError.message
    });
  }
}
