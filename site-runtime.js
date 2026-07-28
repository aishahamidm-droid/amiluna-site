const NETLIFY_BACKEND_ORIGIN = "https://amiluna-site.netlify.app";
const CLOUDFLARE_PAYMENT_ORIGIN = "https://amilunacanvasart.com";

export function getBackendOrigin() {
  return window.location.hostname.endsWith("github.io") ? NETLIFY_BACKEND_ORIGIN : "";
}

export function buildFunctionUrl(path) {
  return `${getBackendOrigin()}${path}`;
}

export function buildPaymentApiUrl(path) {
  return window.location.hostname.endsWith("github.io")
    ? `${CLOUDFLARE_PAYMENT_ORIGIN}${path}`
    : path;
}

export function buildPublicAssetUrl(path) {
  const normalized = String(path || "").replace(/^\/+/, "");
  return `./${normalized}`;
}
