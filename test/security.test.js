const assert = require("node:assert/strict");
const test = require("node:test");

const { normalizeArticle } = require("../netlify/functions/_article-validation");
const { adminEmails } = require("../netlify/functions/_config");
const { redact } = require("../netlify/functions/_security");
const { subscriptionLineItem } = require("../netlify/functions/_stripe-line-item");
const { cleanId } = require("../netlify/functions/article-view");

test("article sanitizer removes scripts and event handlers", () => {
  const article = normalizeArticle({
    title: "Safe title",
    slug: "safe-title",
    bodyHtml: '<p onclick="alert(1)">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>',
  });

  assert.equal(article.bodyHtml.includes("<script"), false);
  assert.equal(article.bodyHtml.includes("onclick"), false);
  assert.equal(article.bodyHtml.includes("javascript:"), false);
});

test("article validation rejects invalid year and normalizes slug", () => {
  assert.throws(() => normalizeArticle({ title: "Bad", year: 3000 }), /Year is out of range/);
  const article = normalizeArticle({ title: "My Great Story!", year: 2026 });
  assert.equal(article.slug, "my-great-story");
});

test("article validation accepts expanded sport list", () => {
  for (const sport of ["cross country", "golf", "field hockey", "flag football", "softball", "tennis", "gymnastics"]) {
    const article = normalizeArticle({ title: `${sport} story`, sport, year: 2026 });
    assert.equal(article.sport, sport);
  }
});

test("admin email parsing trims spaces and wrapper parentheses", () => {
  const previous = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "one@example.com, (two@example.com)";
  assert.deepEqual(adminEmails(), ["one@example.com", "two@example.com"]);
  process.env.ADMIN_EMAILS = previous;
});

test("redaction hides Stripe secrets and bearer tokens", () => {
  const stripeKey = "sk_" + "live_" + "abc";
  const webhookSecret = "whsec_" + "secret";
  const output = redact(`${stripeKey} ${webhookSecret} Bearer token.value`);
  assert.equal(output.includes(stripeKey), false);
  assert.equal(output.includes(webhookSecret), false);
  assert.equal(output.includes("token.value"), false);
});

test("article view ids are bounded and sanitized", () => {
  const id = cleanId("../article<script>" + "x".repeat(200));
  assert.equal(id.includes("<"), false);
  assert.equal(id.includes("."), false);
  assert.equal(id.length <= 120, true);
});

test("subscription line items accept Stripe price ids or dollar amounts", () => {
  assert.deepEqual(subscriptionLineItem("monthly", "price_123"), { price: "price_123", quantity: 1 });

  const monthly = subscriptionLineItem("monthly", "6.95");
  assert.equal(monthly.price_data.unit_amount, 695);
  assert.equal(monthly.price_data.recurring.interval, "month");

  const annual = subscriptionLineItem("annual", "24.95");
  assert.equal(annual.price_data.unit_amount, 2495);
  assert.equal(annual.price_data.recurring.interval, "year");
});
