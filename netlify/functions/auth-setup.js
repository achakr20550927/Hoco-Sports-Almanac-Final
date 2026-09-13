const crypto = require("node:crypto");
const { authMode, identityURL } = require("./_auth");
const { json } = require("./_security");
const { rateLimit } = require("./_rate-limit");

exports.handler = async event => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    if (authMode() === "legacy") return json(503, { error: "Password setup is not enabled yet." });
    const limited = rateLimit(event, { key: "auth:setup", limit: 3, windowMs: 60_000 });
    if (limited.limited) return json(429, { error: "Please wait before requesting another link." }, { "retry-after": String(limited.retryAfter) });
    const email = String(JSON.parse(event.body || "{}").email || "").trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: "Enter a valid email." });
    const options = { redirect: "error", signal: AbortSignal.timeout(8000) };
    const settingsResponse = await fetch(`${identityURL}/settings`, options);
    if (!settingsResponse.ok) throw new Error("Identity unavailable");
    const settings = await settingsResponse.json();
    if (settings.autoconfirm !== false || settings.disable_signup) throw new Error("Email confirmation is required");
    // Never expose or persist the bootstrap password. The customer chooses their password after email verification.
    const response = await fetch(`${identityURL}/signup`, {
      ...options, method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: crypto.randomBytes(48).toString("base64url") }),
    });
    if (!response.ok) {
      const failure = await response.json();
      if (response.status !== 422 || !/already.*registered/i.test(failure.msg || failure.message || "")) throw new Error("Setup unavailable");
      const recovery = await fetch(`${identityURL}/recover`, {
        ...options, method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }),
      });
      if (!recovery.ok) throw new Error("Recovery unavailable");
    }
    return json(200, { message: "Check your email for the secure link. Your membership has not changed." });
  } catch {
    return json(503, { error: "Password setup email could not be sent. Please try again later." });
  }
};
