const { getStore } = require("@netlify/blobs");
const { requireAdmin } = require("./_admin");
const { normalizeArticle } = require("./_article-validation");
const { rateLimit } = require("./_rate-limit");
const { json, logSafe, safeError } = require("./_security");

exports.handler = async (event, context) => {
  const store = getStore("articles");
  const viewStore = getStore("article-views");

  if (event.httpMethod === "GET") {
    const raw = await store.get("published", { type: "json" });
    const views = (await viewStore.get("counts", { type: "json" })) || {};
    const articles = (raw || [])
      .filter((article) => (article.status || "published") === "published")
      .map((article) => ({ ...article, views: Number(views[article.id] || 0) }));
    return json(200, { articles }, { "cache-control": "no-store" });
  }

  const limited = rateLimit(event, { key: "articles:mutate", limit: 30, windowMs: 60_000 });
  if (limited.limited) return json(429, { error: "Too many requests" }, { "retry-after": String(limited.retryAfter) });

  const admin = requireAdmin(event, context);
  if (!admin.ok) return admin.response;

  if (event.httpMethod === "POST" || event.httpMethod === "PUT") {
    try {
      const article = JSON.parse(event.body || "{}");
      const raw = await store.get("published", { type: "json" });
      const articles = raw || [];
      const existingArticle = articles.find((item) => item.id === article.id);
      const nextArticle = {
        ...normalizeArticle(article, existingArticle),
        views: Number(existingArticle?.views || article.views || 0),
        updatedAt: new Date().toISOString(),
        updatedBy: admin.email,
      };
      const duplicateSlug = articles.find((item) => item.slug === nextArticle.slug && item.id !== nextArticle.id);
      if (duplicateSlug) return json(409, { error: "Another article already uses this slug." });
      const existing = articles
        .filter((item) => item.id !== nextArticle.id)
        .map((item) => (nextArticle.featured && nextArticle.status === "published" ? { ...item, featured: false } : item));
      const next = [nextArticle, ...existing];
      await store.setJSON("published", next);
      logSafe("article.saved", { articleId: nextArticle.id, admin: admin.email, status: nextArticle.status });
      return json(200, { article: nextArticle, articles: next });
    } catch (error) {
      return json(error.statusCode || 400, safeError(error.message || "Article could not be saved."));
    }
  }

  if (event.httpMethod === "DELETE") {
    const { id } = JSON.parse(event.body || "{}");
    const raw = await store.get("published", { type: "json" });
    const articles = (raw || []).filter((item) => item.id !== id);
    await store.setJSON("published", articles);
    logSafe("article.deleted", { articleId: id, admin: admin.email });
    return json(200, { articles });
  }

  return json(405, { error: "Method not allowed" });
};
