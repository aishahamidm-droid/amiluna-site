import { readCheckoutSessionToken } from "./lib/checkout-session.js";
import { jsonResponse, methodNotAllowed, optionsResponse } from "./lib/http.js";
import {
  capturePayPalOrder,
  toSafePayPalErrorPayload
} from "./lib/paypal.js";

function getOrderIdFromPayload(payload) {
  return String(payload?.orderId || "").trim();
}

function getSessionTokenFromPayload(payload) {
  return String(payload?.sessionToken || "").trim();
}

function buildSuccessPayload(session, capture) {
  return {
    ok: true,
    payment: {
      provider: "paypal",
      checkoutReference: session.checkoutReference,
      reference: session.paypalOrderId,
      currency: session.summary.currency,
      paidAmountCents: session.summary.totalCents,
      email: session.customer.email,
      status: "verified",
      verifiedAt: new Date().toISOString(),
      transactionDate: capture?.create_time || null,
      items: session.summary.items,
      shipping: session.summary.shipping,
      subtotalCents: session.summary.subtotalCents,
      totalCents: session.summary.totalCents,
      customer: session.customer
    }
  };
}

function getCapturedAmountValue(capture) {
  const captureRecord = capture?.purchase_units?.[0]?.payments?.captures?.[0];
  return Number.parseFloat(captureRecord?.amount?.value || "0");
}

function getCapturedCurrency(capture) {
  const captureRecord = capture?.purchase_units?.[0]?.payments?.captures?.[0];
  return String(captureRecord?.amount?.currency_code || "").toUpperCase();
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
    const orderId = getOrderIdFromPayload(payload);
    const sessionToken = getSessionTokenFromPayload(payload);

    if (!orderId) {
      return jsonResponse(400, {
        ok: false,
        error: "A PayPal order ID is required for verification."
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

    if (session.paypalOrderId !== orderId) {
      return jsonResponse(409, {
        ok: false,
        error: "The PayPal order does not match this checkout session."
      });
    }

    const capture = await capturePayPalOrder(orderId);

    if (capture?.status !== "COMPLETED") {
      return jsonResponse(409, {
        ok: false,
        error: "Payment was not completed successfully in PayPal."
      });
    }

    const amountValue = getCapturedAmountValue(capture);
    const expectedAmountValue = Number(session.summary.totalCents) / 100;

    if (Number.isFinite(amountValue) && Math.abs(amountValue - expectedAmountValue) > 0.001) {
      return jsonResponse(409, {
        ok: false,
        error: "The verified PayPal amount does not match the checkout total."
      });
    }

    const capturedCurrency = getCapturedCurrency(capture);
    if (capturedCurrency && capturedCurrency !== String(session.summary.currency || "").toUpperCase()) {
      return jsonResponse(409, {
        ok: false,
        error: "The verified PayPal currency does not match the checkout currency."
      });
    }

    return jsonResponse(200, buildSuccessPayload(session, capture));
  } catch (error) {
    const safeError = toSafePayPalErrorPayload(
      error,
      "Unable to verify PayPal payment right now."
    );

    return jsonResponse(safeError.statusCode, {
      ok: false,
      error: safeError.message
    });
  }
}
