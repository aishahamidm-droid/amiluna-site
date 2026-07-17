import { jsonResponse, methodNotAllowed } from "./lib/http.js";
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
      error: safeError.message
    });
  }
}
