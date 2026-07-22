import { buildCheckoutContext } from "./lib/checkout.js";
import { jsonResponse, methodNotAllowed, optionsResponse } from "./lib/http.js";
import {
  createCheckoutSessionToken,
  generateCheckoutReference
} from "./lib/checkout-session.js";
import {
  createPayPalOrder,
  getPayPalCancelUrl,
  getPayPalReturnUrl,
  toSafePayPalErrorPayload
} from "./lib/paypal.js";
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

function centsToAmount(cents) {
  return (Number(cents) / 100).toFixed(2);
}

function getApprovalUrl(order) {
  return order?.links?.find((link) => link.rel === "approve")?.href || "";
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
    const summary = checkoutResult.summary;
    const customer = sanitizeCustomerForPayment(checkoutResult.customer);

    const order = await createPayPalOrder({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: checkoutReference,
          description: `AmiLuna order for ${customer.fullName}`,
          amount: {
            currency_code: summary.currency,
            value: centsToAmount(summary.totalCents),
            breakdown: {
              item_total: {
                currency_code: summary.currency,
                value: centsToAmount(summary.subtotalCents)
              },
              shipping: {
                currency_code: summary.currency,
                value: centsToAmount(summary.shipping.amountCents)
              }
            }
          },
          items: summary.items.map((item) => ({
            name: item.title,
            description: item.variantTitle,
            quantity: String(item.quantity),
            unit_amount: {
              currency_code: summary.currency,
              value: centsToAmount(item.unitPriceCents)
            }
          }))
        }
      ],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
            brand_name: "AmiLuna",
            locale: "en-US",
            landing_page: "LOGIN",
            user_action: "PAY_NOW",
            return_url: getPayPalReturnUrl(),
            cancel_url: getPayPalCancelUrl()
          }
        }
      }
    });

    const orderId = String(order?.id || "").trim();
    const approvalUrl = getApprovalUrl(order);

    if (!orderId || !approvalUrl) {
      return jsonResponse(502, {
        ok: false,
        error: "PayPal did not return an approval link."
      });
    }

    const sessionToken = createCheckoutSessionToken({
      checkoutReference,
      paypalOrderId: orderId,
      status: "initialized",
      provider: "paypal",
      customer,
      summary
    });

    return jsonResponse(200, {
      ok: true,
      provider: "paypal",
      checkoutReference,
      orderId,
      approvalUrl,
      sessionToken
    });
  } catch (error) {
    const safePayPalError = toSafePayPalErrorPayload(
      error,
      "Unable to initialize PayPal right now."
    );

    if (safePayPalError.statusCode !== 500 || safePayPalError.details) {
      return jsonResponse(safePayPalError.statusCode, {
        ok: false,
        error: safePayPalError.message
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
