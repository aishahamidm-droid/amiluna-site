const DEFAULT_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization"
};

export function jsonResponse(statusCode, payload, headers = {}) {
  return {
    statusCode,
    headers: {
      ...DEFAULT_HEADERS,
      ...headers
    },
    body: JSON.stringify(payload)
  };
}

export function methodNotAllowed(allowedMethods) {
  return jsonResponse(405, {
    ok: false,
    error: "Method not allowed",
    allowedMethods
  });
}

export function optionsResponse() {
  return {
    statusCode: 204,
    headers: DEFAULT_HEADERS,
    body: ""
  };
}
