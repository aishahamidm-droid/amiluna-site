import { jsonResponse, methodNotAllowed, optionsResponse } from "./lib/http.js";
import {
  fetchPrintifyShops,
  getPrintifyShopId,
  isPrintifyError,
  toSafeErrorPayload
} from "./lib/printify-client.js";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return optionsResponse();
  }

  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  try {
    const shops = await fetchPrintifyShops();
    const configuredShopId = process.env.PRINTIFY_SHOP_ID?.trim() || null;
    const matchedShop = configuredShopId
      ? shops.find((shop) => String(shop.id) === configuredShopId)
      : null;

    return jsonResponse(200, {
      ok: true,
      service: "printify",
      connected: true,
      shopIdConfigured: Boolean(configuredShopId),
      configuredShopId,
      configuredShopFound: configuredShopId ? Boolean(matchedShop) : null,
      shopsCount: Array.isArray(shops) ? shops.length : 0,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    const safeError = toSafeErrorPayload(
      error,
      "Unable to connect to Printify from the server."
    );

    return jsonResponse(safeError.statusCode, {
      ok: false,
      service: "printify",
      connected: false,
      error: safeError.message,
      details: isPrintifyError(error) ? safeError.details : null
    });
  }
}
