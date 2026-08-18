const sanitizeHtml = require("sanitize-html");

const SPORTS = new Set([
  "football",
  "basketball",
  "baseball",
  "hockey",
  "soccer",
  "lacrosse",
  "wrestling",
  "track",
  "volleyball",
  "cheer",
  "cross country",
  "golf",
  "field hockey",
  "flag football",
  "softball",
  "tennis",
  "gymnastics",
]);
const ACCESS = new Set(["public", "free", "paid", "admin"]);
const STATUSES = new Set(["draft", "published", "archived"]);

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function cleanText(value, max = 500) {
  return sanitizeHtml(String(value || ""), { allowedTags: [], allowedAttributes: {} }).trim().slice(0, max);
}

function cleanUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!["https:", "http:", "data:"].includes(url.protocol)) return "";
    if (url.protocol === "data:" && !raw.startsWith("data:image/")) return "";
    return raw.slice(0, url.protocol === "data:" ? 750000 : 2500);
  } catch {
    return "";
  }
}

function cleanBody(html) {
  return sanitizeHtml(String(html || "<p></p>"), {
    allowedTags: ["p", "br", "strong", "em", "b", "i", "u", "h2", "h3", "blockquote", "ul", "ol", "li", "figure", "figcaption", "img", "a"],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt"],
    },
    allowedSchemes: ["http", "https", "mailto", "data"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
    },
    transformTags: {
      a: (tagName, attribs) => {
        const next = {
          ...attribs,
          rel: "noopener noreferrer",
        };
        if (attribs.target === "_blank") next.target = "_blank";
        return { tagName, attribs: next };
      },
    },
  });
}

function normalizeArticle(input = {}, existing = null) {
  const title = cleanText(input.title, 180);
  if (!title) throw Object.assign(new Error("Title is required."), { statusCode: 400 });
  const sport = SPORTS.has(input.sport) ? input.sport : "football";
  const slug = slugify(input.slug || title);
  if (!slug) throw Object.assign(new Error("Valid slug is required."), { statusCode: 400 });
  const status = STATUSES.has(input.status) ? input.status : "published";
  const access = ACCESS.has(input.access) ? input.access : "public";
  const year = Number(input.year) || new Date().getFullYear();
  if (year < 1900 || year > 2100) throw Object.assign(new Error("Year is out of range."), { statusCode: 400 });

  return {
    id: cleanText(input.id || existing?.id || `custom-${Date.now()}`, 120),
    slug,
    title,
    subtitle: cleanText(input.subtitle, 300),
    sport,
    year,
    image: cleanUrl(input.image),
    imageCredit: cleanText(input.imageCredit, 200),
    access,
    status,
    featured: Boolean(input.featured),
    author: cleanText(input.author, 160) || "Willie Sean Coughlan",
    credits: cleanText(input.credits, 1000),
    date: cleanText(input.date, 80) || new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date()),
    readTime: Math.max(1, Math.min(60, Number(input.readTime) || 1)),
    bodyHtml: cleanBody(input.bodyHtml),
    tags: Array.isArray(input.tags) ? input.tags.map((tag) => cleanText(tag, 40)).filter(Boolean).slice(0, 12) : [sport, "Howard County"],
    custom: true,
  };
}

module.exports = { cleanBody, normalizeArticle, slugify };
