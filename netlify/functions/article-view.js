const { connectLambda, getStore } = require("@netlify/blobs");
const { rateLimit } = require("./_rate-limit");
const { json } = require("./_security");

function cleanId(value) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120);
}

exports.handler = async (event) => {
  connectLambda(event);
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const limited = rateLimit(event, { key: "article:view", limit: 120, windowMs: 60_000 });
  if (limited.limited) return json(429, { error: "Too many requests" }, { "retry-after": String(limited.retryAfter) });

  const { id } = JSON.parse(event.body || "{}");
  const articleId = cleanId(id);
  if (!articleId) return json(400, { error: "Article id is required" });

  const store = getStore("article-views");
  const views = (await store.get("counts", { type: "json" })) || {};
  const count = Number(views[articleId] || 0) + 1;
  views[articleId] = count;
  await store.setJSON("counts", views);
  return json(200, { id: articleId, views: count });
};

module.exports.cleanId = cleanId;
