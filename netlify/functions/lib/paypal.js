const PAYPAL_API_BASE_BY_ENV = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com"
};

class PayPalError extends Error {
  constructor(message, { statusCode = 500, details = null, expose = false } = {}) {
    super(message);
    this.name = "PayPalError";
    this.statusCode = statusCode;
    this.details = details;
    this.expose = expose;
  }
}

function readRequiredEnvVar(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new PayPalError(`Missing required environment variable: ${name}`, {
      statusCode: 500,
      details: `${name} is not configured on the server.`,
      expose: false
    });
  }

  return value;
}

function getPayPalEnvironment() {
  const rawValue = process.env.PAYPAL_ENV?.trim().toLowerCase() || "sandbox";

  if (!PAYPAL_API_BASE_BY_ENV[rawValue]) {
    throw new PayPalError("PAYPAL_ENV is invalid.", {
      statusCode: 500,
      details: "PAYPAL_ENV must be either sandbox or live.",
      expose: false
    });
  }

  return rawValue;
}

function getPayPalApiBaseUrl() {
  return PAYPAL_API_BASE_BY_ENV[getPayPalEnvironment()];
}

function getBasicAuthToken() {
  const clientId = readRequiredEnvVar("PAYPAL_CLIENT_ID");
  const clientSecret = readRequiredEnvVar("PAYPAL_CLIENT_SECRET");
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

async function parseResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function buildErrorMessage(statusCode, responseBody) {
  if (responseBody && typeof responseBody === "object") {
    if (typeof responseBody.message === "string" && responseBody.message.trim()) {
      return responseBody.message;
    }

    if (Array.isArray(responseBody.details) && responseBody.details[0]?.issue) {
      return responseBody.details[0].issue;
    }

    if (typeof responseBody.error_description === "string" && responseBody.error_description.trim()) {
      return responseBody.error_description;
    }
  }

  return `PayPal request failed with status ${statusCode}.`;
}

export function getPayPalClientId() {
  return readRequiredEnvVar("PAYPAL_CLIENT_ID");
}

export function getPayPalReturnUrl() {
  return readRequiredEnvVar("PAYPAL_RETURN_URL");
}

export function getPayPalCancelUrl() {
  return readRequiredEnvVar("PAYPAL_CANCEL_URL");
}

export function isPayPalError(error) {
  return error instanceof PayPalError;
}

export function toSafePayPalErrorPayload(error, fallbackMessage) {
  if (isPayPalError(error)) {
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

async function getPayPalAccessToken() {
  const response = await fetch(`${getPayPalApiBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${getBasicAuthToken()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: "grant_type=client_credentials"
  });

  const responseBody = await parseResponseBody(response);

  if (!response.ok || !responseBody?.access_token) {
    throw new PayPalError(buildErrorMessage(response.status, responseBody), {
      statusCode: response.status || 500,
      details: responseBody ?? null,
      expose: false
    });
  }

  return responseBody.access_token;
}

async function payPalRequest(path, { method = "GET", body } = {}) {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${getPayPalApiBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      Prefer: "return=representation"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const responseBody = await parseResponseBody(response);

  if (!response.ok) {
    throw new PayPalError(buildErrorMessage(response.status, responseBody), {
      statusCode: response.status,
      details: responseBody ?? null,
      expose: false
    });
  }

  return responseBody;
}

export async function createPayPalOrder(payload) {
  return payPalRequest("/v2/checkout/orders", {
    method: "POST",
    body: payload
  });
}

export async function capturePayPalOrder(orderId) {
  return payPalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    body: {}
  });
}
