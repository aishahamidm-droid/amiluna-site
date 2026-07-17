export function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
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
