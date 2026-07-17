const PAYSTACK_API_BASE_URL = "https://api.paystack.co";

class PaystackError extends Error {
  constructor(message, { statusCode = 500, details = null, expose = false } = {}) {
    super(message);
    this.name = "PaystackError";
    this.statusCode = statusCode;
    this.details = details;
    this.expose = expose;
  }
}

function readRequiredEnvVar(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new PaystackError(`Missing required environment variable: ${name}`, {
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

function buildErrorMessage(statusCode, responseBody) {
  if (responseBody && typeof responseBody === "object") {
    if (typeof responseBody.message === "string" && responseBody.message.trim()) {
      return responseBody.message;
    }

    if (typeof responseBody.error === "string" && responseBody.error.trim()) {
      return responseBody.error;
    }
  }

  return `Paystack request failed with status ${statusCode}.`;
}

export function getPaystackSecretKey() {
  return readRequiredEnvVar("PAYSTACK_SECRET_KEY");
}

export function getPaystackCallbackUrl() {
  return readRequiredEnvVar("PAYSTACK_CALLBACK_URL");
}

export function isPaystackError(error) {
  return error instanceof PaystackError;
}

export function toSafePaystackErrorPayload(error, fallbackMessage) {
  if (isPaystackError(error)) {
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

async function paystackRequest(path, { method = "GET", body } = {}) {
  const secretKey = getPaystackSecretKey();
  const response = await fetch(`${PAYSTACK_API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const responseBody = await parseResponseBody(response);

  if (!response.ok) {
    throw new PaystackError(buildErrorMessage(response.status, responseBody), {
      statusCode: response.status,
      details: responseBody ?? null,
      expose: false
    });
  }

  if (!responseBody?.status) {
    throw new PaystackError("Paystack did not return a successful response.", {
      statusCode: 502,
      details: responseBody ?? null,
      expose: false
    });
  }

  return responseBody;
}

export async function initializePaystackTransaction(payload) {
  return paystackRequest("/transaction/initialize", {
    method: "POST",
    body: payload
  });
}

export async function verifyPaystackTransaction(reference) {
  return paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
}
