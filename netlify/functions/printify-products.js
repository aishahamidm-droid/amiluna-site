import { jsonResponse, methodNotAllowed } from "./lib/http.js";
import {
  fetchPrintifyProducts,
  toSafeErrorPayload
} from "./lib/printify-client.js";

const PRINTIFY_PRODUCTS_BASE_URL = "https://api.printify.com/v1";

function sanitizeProduct(product) {
  return {
    id: product.id,
    title: product.title,
    description: product.description,
    tags: product.tags || [],
    visible: product.visible,
    is_locked: product.is_locked,
    blueprint_id: product.blueprint_id,
    print_provider_id: product.print_provider_id,
    created_at: product.created_at,
    updated_at: product.updated_at,
    variants: Array.isArray(product.variants)
      ? product.variants.map((variant) => ({
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          price: variant.price,
          is_enabled: variant.is_enabled,
          is_available: variant.is_available,
          options: variant.options || []
        }))
      : [],
    images: Array.isArray(product.images)
      ? product.images.map((image) => ({
          src: image.src,
          variant_ids: image.variant_ids || [],
          is_default: Boolean(image.is_default)
        }))
      : []
  };
}

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  const shopId = process.env.PRINTIFY_SHOP_ID?.trim() || "";
  const shopIdFound = Boolean(shopId);
  const encodedShopId = shopIdFound ? encodeURIComponent(shopId) : "";
  const printifyUrl = shopIdFound
    ? `${PRINTIFY_PRODUCTS_BASE_URL}/shops/${encodedShopId}/products.json`
    : `${PRINTIFY_PRODUCTS_BASE_URL}/shops/{PRINTIFY_SHOP_ID}/products.json`;

  try {
    const response = await fetchPrintifyProducts(shopId);
    const rawProducts = Array.isArray(response?.data) ? response.data : [];
    const products = rawProducts.map(sanitizeProduct);

    return jsonResponse(200, {
      ok: true,
      count: products.length,
      products
    });
  } catch (error) {
    const safeError = toSafeErrorPayload(
      error,
      "Unable to retrieve Printify products from the server."
    );

    return jsonResponse(safeError.statusCode, {
      ok: false,
      error: safeError.message,
      debug: {
        printify_shop_id_found: shopIdFound,
        printify_shop_id_value: shopIdFound ? shopId : null,
        printify_url_called: printifyUrl,
        http_status_code: safeError.details?.printify_status_code ?? safeError.statusCode,
        printify_response_body: safeError.details?.printify_error_body ?? null
      }
    });
  }
}
