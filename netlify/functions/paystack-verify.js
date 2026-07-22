import { readCheckoutSessionToken } from "./lib/checkout-session.js";
import { jsonResponse, methodNotAllowed, optionsResponse } from "./lib/http.js";
import {
  toSafePaystackErrorPayload,
  verifyPaystackTransaction
} from "./lib/paystack.js";

function getReferenceFromPayload(payload) {
  return String(payload?.reference || "").trim();
}

function getSessionTokenFromPayload(payload) {
  return String(payload?.sessionToken || "").trim();
}

function buildSuccessPayload(session, transaction) {
  return {
    ok: true,
    payment: {
      checkoutReference: session.checkoutReference,
      reference: session.paystackReference,
      currency: session.summary.currency,
      paidAmountCents: session.summary.totalCents,
      email: session.customer.email,
      status: "verified",
      verifiedAt: new Date().toISOString(),
      transactionDate: transaction.paid_at || transaction.created_at || null,
      items: session.summary.items,
      shipping: session.summary.shipping,
      subtotalCents: session.summary.subtotalCents,
      totalCents: session.summary.totalCents,
      customer: session.customer
    }
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
    const reference = getReferenceFromPayload(payload);
    const sessionToken = getSessionTokenFromPayload(payload);

    if (!reference) {
      return jsonResponse(400, {
        ok: false,
        error: "A Paystack reference is required for verification."
      });
    }

    if (!sessionToken) {
      return jsonResponse(400, {
        ok: false,
        error: "The checkout session is missing. Please return to checkout and try again."
      });
    }

    let session;

    try {
      session = readCheckoutSessionToken(sessionToken);
    } catch (error) {
      return jsonResponse(400, {
        ok: false,
        error: "The checkout session is invalid or expired. Please restart checkout."
      });
    }

    if (session.paystackReference !== reference) {
      return jsonResponse(409, {
        ok: false,
        error: "The payment reference does not match this checkout session."
      });
    }

    const paystackResponse = await verifyPaystackTransaction(reference);
    const transaction = paystackResponse.data || {};

    if (transaction.reference !== reference) {
      return jsonResponse(409, {
        ok: false,
        error: "The verified Paystack reference does not match the requested payment."
      });
    }

    if (transaction.status !== "success") {
      return jsonResponse(409, {
        ok: false,
        error: "Payment was not completed successfully."
      });
    }

    if (Number(transaction.amount) !== Number(session.summary.totalCents)) {
      return jsonResponse(409, {
        ok: false,
        error: "The verified payment amount does not match the checkout total."
      });
    }

    if (String(transaction.currency || "").toUpperCase() !== String(session.summary.currency || "").toUpperCase()) {
      return jsonResponse(409, {
        ok: false,
        error: "The verified payment currency does not match the checkout currency."
      });
    }

    const paystackCheckoutReference = transaction.metadata?.internal_checkout_reference;
    if (paystackCheckoutReference && paystackCheckoutReference !== session.checkoutReference) {
      return jsonResponse(409, {
        ok: false,
        error: "The verified Paystack checkout reference does not match this session."
      });
    }

    if (transaction.customer?.email && transaction.customer.email !== session.customer.email) {
      return jsonResponse(409, {
        ok: false,
        error: "The verified payment email does not match this checkout."
      });
    }

    return jsonResponse(200, buildSuccessPayload(session, transaction));
  } catch (error) {
    const safeError = toSafePaystackErrorPayload(
      error,
      "Unable to verify Paystack payment right now."
    );

    return jsonResponse(safeError.statusCode, {
      ok: false,
      error: safeError.message
    });
  }
}
