const PRINTIFY_API_BASE_URL = "https://api.printify.com/v1";

class PrintifyError extends Error {
  constructor(message, { statusCode = 500, details = null, expose = false } = {}) {
    super(message);
    this.name = "PrintifyError";
    this.statusCode = statusCode;
    this.details = details;
    this.expose = expose;
  }
}

function readRequiredEnvVar(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new PrintifyError(`Missing required environment variable: ${name}`, {
      statusCode: 500,
      details: `${name} is not configured on the server.`,
      expose: false
    });
  }

  return value;
}

async function parseResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function buildSafeErrorMessage(statusCode, responseBody) {
  if (typeof responseBody === "string" && responseBody.trim()) {
    return `Printify request failed with status ${statusCode}.`;
  }

  if (responseBody && typeof responseBody === "object") {
    if (typeof responseBody.message === "string" && responseBody.message.trim()) {
      return responseBody.message;
    }

    if (typeof responseBody.error === "string" && responseBody.error.trim()) {
      return responseBody.error;
    }
  }

  return `Printify request failed with status ${statusCode}.`;
}

export function getPrintifyApiToken() {
  return readRequiredEnvVar("PRINTIFY_API_TOKEN");
}

export function getPrintifyShopId() {
  return readRequiredEnvVar("PRINTIFY_SHOP_ID");
}

export function isPrintifyError(error) {
  return error instanceof PrintifyError;
}

export function toSafeErrorPayload(error, fallbackMessage) {
  if (isPrintifyError(error)) {
    return {
      message: error.expose ? error.message : fallbackMessage,
      details: error.expose ? error.details : null,
      statusCode: error.statusCode
    };
  }

  return {
    message: fallbackMessage,
    details: null,
    statusCode: 500
  };
}

export async function printifyRequest(path, { method = "GET", body } = {}) {
  const token = getPrintifyApiToken();

  const response = await fetch(`${PRINTIFY_API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const responseBody = await parseResponseBody(response);

  if (!response.ok) {
    throw new PrintifyError(buildSafeErrorMessage(response.status, responseBody), {
      statusCode: response.status,
      details: typeof responseBody === "object" ? responseBody : null,
      expose: true
    });
  }

  return responseBody;
}

export async function fetchPrintifyShops() {
  return printifyRequest("/shops.json");
}

export async function fetchPrintifyProducts(shopId = getPrintifyShopId()) {
  const encodedShopId = encodeURIComponent(shopId);
  return printifyRequest(`/shops/${encodedShopId}/products.json`);
}
