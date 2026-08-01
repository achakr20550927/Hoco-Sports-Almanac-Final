const { getStore } = require("@netlify/blobs");
const { requireAdmin } = require("./_admin");

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event, context) => {
  const store = getStore("articles");

  if (event.httpMethod === "GET") {
    const raw = await store.get("published", { type: "json" });
    return json(200, { articles: raw || [] });
  }

  const admin = requireAdmin(event, context);
  if (!admin.ok) return admin.response;

  if (event.httpMethod === "POST" || event.httpMethod === "PUT") {
    const article = JSON.parse(event.body || "{}");
    if (!article.title || !article.slug) {
      return json(400, { error: "Article title and slug are required" });
    }
    const raw = await store.get("published", { type: "json" });
    const articles = raw || [];
    const nextArticle = {
      ...article,
      updatedAt: new Date().toISOString(),
      author: article.author || "Willie Sean Coughlan",
    };
    const existing = articles
      .filter((item) => item.id !== nextArticle.id)
      .map((item) => (nextArticle.featured ? { ...item, featured: false } : item));
    const next = [nextArticle, ...existing];
    await store.setJSON("published", next);
    return json(200, { article: nextArticle, articles: next });
  }

  if (event.httpMethod === "DELETE") {
    const { id } = JSON.parse(event.body || "{}");
    const raw = await store.get("published", { type: "json" });
    const articles = (raw || []).filter((item) => item.id !== id);
    await store.setJSON("published", articles);
    return json(200, { articles });
  }

  return json(405, { error: "Method not allowed" });
};
