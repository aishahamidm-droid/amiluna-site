import { jsonResponse, methodNotAllowed, optionsResponse } from "./lib/http.js";
import {
  fetchPrintifyProducts,
  toSafeErrorPayload
} from "./lib/printify-client.js";

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
    options: Array.isArray(product.options)
      ? product.options.map((option) => ({
          name: option.name,
          type: option.type,
          values: Array.isArray(option.values)
            ? option.values.map((value) => ({
                id: value.id,
                title: value.title
              }))
            : []
        }))
      : [],
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
  if (event.httpMethod === "OPTIONS") {
    return optionsResponse();
  }

  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  try {
    const response = await fetchPrintifyProducts();
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
      error: safeError.message
    });
  }
}
