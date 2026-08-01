const crypto = require("crypto");

const json = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
    "cache-control": "no-store",
    ...headers,
  },
  body: JSON.stringify(body),
});

function redact(value) {
  return String(value || "")
    .replace(/sk_(live|test)_[A-Za-z0-9_]+/g, "sk_$1_[redacted]")
    .replace(/rk_(live|test)_[A-Za-z0-9_]+/g, "rk_$1_[redacted]")
    .replace(/whsec_[A-Za-z0-9_]+/g, "whsec_[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]");
}

function safeError(message = "Request failed") {
  return { error: redact(message) };
}

function requestId(event = {}) {
  return (
    event.headers?.["x-nf-request-id"] ||
    event.headers?.["x-request-id"] ||
    crypto.randomUUID()
  );
}

function logSafe(eventName, details = {}) {
  const safeDetails = Object.fromEntries(
    Object.entries(details).map(([key, value]) => [key, redact(typeof value === "string" ? value : JSON.stringify(value))])
  );
  console.log(JSON.stringify({ event: eventName, ...safeDetails }));
}

module.exports = { json, logSafe, redact, requestId, safeError };
