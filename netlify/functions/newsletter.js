const { createHash } = require("crypto");
const { connectLambda, getStore } = require("@netlify/blobs");
const { requireAdmin } = require("./_admin");
const { rateLimit } = require("./_rate-limit");
const { json, withErrorHandling } = require("./_security");

exports.handler = withErrorHandling(async (event, context) => {
  connectLambda(event);
  const store = getStore("newsletter");
  if (event.httpMethod === "GET") {
    const admin = await requireAdmin(event, context);
    if (!admin.ok) return admin.response;
    const { blobs } = await store.list();
    const subscribers = (await Promise.all(blobs.map(({ key }) => store.get(key, { type: "json" })))).filter(Boolean);
    return json(200, { subscribers });
  }
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const limited = rateLimit(event, { key: "newsletter", limit: 5, windowMs: 60000 });
  if (limited.limited) return json(429, { error: "Please try again in a minute." });
  const input = JSON.parse(event.body || "{}");
  const email = String(input.email || "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: "Enter a valid email address." });
  const key = createHash("sha256").update(email).digest("hex");
  const existing = await store.get(key, { type: "json" });
  if (!existing) await store.setJSON(key, { email, subscribedAt: new Date().toISOString() });
  return json(200, { subscribed: true });
});
