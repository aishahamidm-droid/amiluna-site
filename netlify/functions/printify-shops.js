import { jsonResponse, methodNotAllowed, optionsResponse } from "./lib/http.js";
import {
  fetchPrintifyShops,
  toSafeErrorPayload
} from "./lib/printify-client.js";

function sanitizeShop(shop) {
  return {
    shop_id: shop.id,
    shop_title: shop.title
  };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return optionsResponse();
  }

  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  try {
    const shops = await fetchPrintifyShops();

    return jsonResponse(200, {
      ok: true,
      shops: Array.isArray(shops) ? shops.map(sanitizeShop) : []
    });
  } catch (error) {
    const safeError = toSafeErrorPayload(
      error,
      "Unable to retrieve Printify shops from the server."
    );

    return jsonResponse(safeError.statusCode, {
      ok: false,
      error: safeError.message,
      debug: {
        http_status_code: safeError.details?.printify_status_code ?? safeError.statusCode,
        printify_error_body: safeError.details?.printify_error_body ?? null,
        printify_api_token_found: safeError.details?.printify_api_token_found ?? Boolean(process.env.PRINTIFY_API_TOKEN?.trim()),
        authorization_header_sent: safeError.details?.authorization_header_sent ?? Boolean(process.env.PRINTIFY_API_TOKEN?.trim())
      }
    });
  }
}
