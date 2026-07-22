const NETLIFY_BACKEND_ORIGIN = "https://amiluna-site.netlify.app";

export function getBackendOrigin() {
  return window.location.hostname.endsWith("github.io") ? NETLIFY_BACKEND_ORIGIN : "";
}

export function buildFunctionUrl(path) {
  return `${getBackendOrigin()}${path}`;
}

export function buildPublicAssetUrl(path) {
  const normalized = String(path || "").replace(/^\/+/, "");
  return `./${normalized}`;
}
