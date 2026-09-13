const { connectLambda, getStore } = require("@netlify/blobs");
const { requireAdmin, getUserEmail } = require("./_admin");
const { visible, allowed } = require("../../access-policy");
const { normalizeArticle } = require("./_article-validation");
const { rateLimit } = require("./_rate-limit");
const { json, logSafe, safeError } = require("./_security");

function withViews(article, views = {}) {
  return { ...article, views: Number(views[article.id] || 0) };
}

function summaryArticle(article, views = {}) {
  const next = withViews(article, views);
  const { bodyHtml, updatedBy, ...summary } = next;
  if (String(summary.image || "").startsWith("data:")) {
    summary.image = `/.netlify/functions/articles?id=${encodeURIComponent(article.id)}&image=1&v=${encodeURIComponent(article.updatedAt || "1")}`;
    summary.hasFullImage = true;
  }
  summary.hasFullBody = Boolean(bodyHtml);
  return summary;
}

async function handle(event, context) {
  connectLambda(event);
  const store = getStore("articles");
  const viewStore = getStore("article-views");
  const mediaStore = getStore("article-media");

  if (event.httpMethod === "GET") {
    const admin = (await requireAdmin(event, context)).ok;
    const imageId = event.queryStringParameters?.image === "1" && event.queryStringParameters?.id;
    if (imageId) {
      const cached = await mediaStore.get(imageId, { type: "json" });
      if (cached && visible(cached, admin) && cached.revision === (event.queryStringParameters.v || "1")) return cached.response;
    }
    const raw = await store.get("published", { type: "json" });
    const views = (await viewStore.get("counts", { type: "json" })) || {};
    const published = (raw || []).filter((article) => visible(article, admin));
    const slug = event.queryStringParameters?.slug;
    const id = event.queryStringParameters?.id;
    if (slug || id) {
      const article = published.find((item) => item.slug === slug || item.id === id);
      if (!article) return json(404, { error: "This story is not available." });
      if (event.queryStringParameters?.image === "1") {
        const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([a-z0-9+/=\s]+)$/i.exec(article.image || "");
        if (!match) return json(404, { error: "Image not available." });
        const response = { statusCode: 200, headers: { "content-type": match[1], "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff" }, body: match[2], isBase64Encoded: true };
        await mediaStore.setJSON(article.id, { access: article.access, status: article.status, revision: article.updatedAt || "1", response });
        return response;
      }
      const email = await getUserEmail(event, context);
      const members = email ? (await getStore("members").get("accounts", { type: "json" })) || [] : [];
      const member = members.find((item) => String(item.email).trim().toLowerCase() === email);
      if (!allowed(article, member, admin)) return json(403, { error: "This story requires a membership.", article: summaryArticle(article, views), locked: true });
      return json(200, { article: withViews(article, views) }, { "cache-control": "no-store" });
    }
    return json(200, { articles: published.map((article) => summaryArticle(article, views)) }, { "cache-control": "no-store" });
  }

  const limited = rateLimit(event, { key: "articles:mutate", limit: 30, windowMs: 60_000 });
  if (limited.limited) return json(429, { error: "Too many requests" }, { "retry-after": String(limited.retryAfter) });

  const admin = await requireAdmin(event, context);
  if (!admin.ok) return admin.response;
  const views = (await viewStore.get("counts", { type: "json" })) || {};

  if (event.httpMethod === "POST" || event.httpMethod === "PUT") {
    try {
      const article = JSON.parse(event.body || "{}");
      const raw = await store.get("published", { type: "json" });
      const articles = raw || [];
      const existingArticle = articles.find((item) => item.id === article.id);
      if (event.httpMethod === "PUT" && !existingArticle) return json(404, { error: "Article no longer exists. Refresh the article list." });
      const body = article.bodyHtml ?? existingArticle?.bodyHtml;
      if (!String(body || "").replace(/<[^>]*>/g, "").trim() && !/<img\b/i.test(body || "")) return json(400, { error: "Article body is required." });
      const nextArticle = {
        ...normalizeArticle({ ...existingArticle, ...article }, existingArticle),
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
      await mediaStore.delete(nextArticle.id);
      await store.setJSON("published", next);
      logSafe("article.saved", { articleId: nextArticle.id, admin: admin.email, status: nextArticle.status });
      return json(200, { article: summaryArticle(nextArticle, views), articles: next.map((item) => summaryArticle(item, views)) });
    } catch (error) {
      return json(error.statusCode || 400, safeError(error.message || "Article could not be saved."));
    }
  }

  if (event.httpMethod === "DELETE") {
    const { id } = JSON.parse(event.body || "{}");
    const raw = await store.get("published", { type: "json" });
    const articles = (raw || []).filter((item) => item.id !== id);
    if (id) await mediaStore.delete(id);
    await store.setJSON("published", articles);
    logSafe("article.deleted", { articleId: id, admin: admin.email });
    return json(200, { articles: articles.map((item) => summaryArticle(item, views)) });
  }

  return json(405, { error: "Method not allowed" });
}

exports.handler = async (event, context) => {
  try { return await handle(event, context); }
  catch (error) { logSafe("articles.error", { message: error.message }); return json(error instanceof SyntaxError ? 400 : 503, { error: "Articles could not be loaded or saved. Please try again." }); }
};

module.exports = { handler: exports.handler, summaryArticle, withViews };
