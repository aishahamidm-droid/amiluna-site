import { jsonResponse, methodNotAllowed, optionsResponse } from "./lib/http.js";
import { buildCheckoutSummary } from "./lib/checkout.js";
import { toSafeErrorPayload } from "./lib/printify-client.js";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return optionsResponse();
  }

  if (event.httpMethod !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const result = await buildCheckoutSummary(payload);

    if (!result.ok) {
      return jsonResponse(result.statusCode, {
        ok: false,
        error: result.error
      });
    }

    return jsonResponse(200, {
      ok: true,
      summary: result.summary
    });
  } catch (error) {
    const safeError = toSafeErrorPayload(
      error,
      "Unable to prepare checkout totals right now."
    );

    return jsonResponse(safeError.statusCode, {
      ok: false,
      error: safeError.message
    });
  }
}
