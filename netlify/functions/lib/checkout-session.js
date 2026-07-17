import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const SESSION_VERSION = "v1";
const SESSION_TTL_MS = 1000 * 60 * 60 * 4;

function readRequiredEnvVar(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSigningSecret() {
  return readRequiredEnvVar("CHECKOUT_SESSION_SECRET");
}

function signPayload(payloadBase64) {
  return createHmac("sha256", getSigningSecret())
    .update(payloadBase64)
    .digest("base64url");
}

function assertValidTokenParts(parts) {
  if (parts.length !== 3 || parts[0] !== SESSION_VERSION || !parts[1] || !parts[2]) {
    throw new Error("Invalid checkout session token.");
  }
}

export function generateCheckoutReference() {
  return `AML-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export function generatePaystackReference() {
  return `AMLPAY-${Date.now()}-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export function createCheckoutSessionToken(session) {
  const payload = {
    ...session,
    createdAt: session.createdAt || new Date().toISOString(),
    expiresAt: session.expiresAt || new Date(Date.now() + SESSION_TTL_MS).toISOString()
  };

  const payloadBase64 = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadBase64);
  return `${SESSION_VERSION}.${payloadBase64}.${signature}`;
}

export function readCheckoutSessionToken(token) {
  const parts = String(token || "").split(".");
  assertValidTokenParts(parts);

  const [version, payloadBase64, signature] = parts;
  const expectedSignature = signPayload(payloadBase64);
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error("Checkout session signature is invalid.");
  }

  const payload = JSON.parse(base64UrlDecode(payloadBase64));

  if (version !== SESSION_VERSION) {
    throw new Error("Checkout session version is invalid.");
  }

  if (!payload?.expiresAt || Number.isNaN(Date.parse(payload.expiresAt))) {
    throw new Error("Checkout session is missing an expiry.");
  }

  if (Date.parse(payload.expiresAt) < Date.now()) {
    throw new Error("Checkout session has expired.");
  }

  return payload;
}
