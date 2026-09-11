const test = require("node:test");
const assert = require("node:assert/strict");
const Stripe = require("stripe");
const { harness, fixtures } = require("../scripts/qa-harness.cjs");
const access = require("../access-policy");
const { normalizeArticle } = require("../netlify/functions/_article-validation");
const { periodEnd, planOf, subscriptionId } = require("../netlify/functions/_stripe-subscription");

for (const [label, email, permitted] of [["visitor", undefined, false], ["free", "free@example.test", false], ["monthly", "monthly@example.test", true], ["annual", "annual@example.test", true], ["admin", "owner@example.test", true]]) {
  test(`${label}: article list and full paid/private article permissions`, async () => {
    const app = harness(fixtures());
    const list = await app.request("articles", "GET", undefined, email);
    assert.equal(list.statusCode, 200);
    assert.equal(list.json.articles.some(a => a.id === "private"), label === "admin");
    assert.equal(list.json.articles.some(a => a.id === "draft"), label === "admin");
    assert.equal(list.json.articles.some(a => a.id === "paid"), true);
    assert.equal(list.json.articles.some(a => a.bodyHtml), false);
    const paid = await app.request("articles", "GET", undefined, email, { slug: "paid-story" });
    assert.equal(paid.statusCode, permitted ? 200 : 403);
    assert.equal(Boolean(paid.json.article?.bodyHtml), permitted);
    const privateStory = await app.request("articles", "GET", undefined, email, { slug: "private-story" });
    assert.equal(privateStory.statusCode, label === "admin" ? 200 : 404);
    assert.equal((await app.request("articles", "GET", undefined, email, { slug: "does-not-exist" })).statusCode, 404);
  });
}

test("partial edit preserves body, image, credits, and slug", async () => {
  const app = harness(fixtures());
  const original = app.data.articles.published.find(a => a.id === "paid");
  const result = await app.request("articles", "PUT", { id: "paid", access: "public" }, "owner@example.test");
  assert.equal(result.statusCode, 200);
  const stored = app.data.articles.published.find(a => a.id === "paid");
  assert.equal(stored.bodyHtml, original.bodyHtml);
  assert.equal(stored.image, original.image);
  assert.equal(stored.slug, original.slug);
  assert.equal(stored.access, "public");
});

test("article creates are idempotent, reject slug collisions and invalid/unauthorized writes", async () => {
  const app = harness(fixtures());
  const body = { id: "new", slug: "new-story", title: "New Story", access: "paid", bodyHtml: "<p>Complete story</p>" };
  assert.equal((await app.request("articles", "POST", body, "free@example.test")).statusCode, 403);
  assert.equal((await app.request("articles", "POST", body, "owner@example.test")).statusCode, 200);
  assert.equal((await app.request("articles", "POST", body, "owner@example.test")).statusCode, 200);
  assert.equal(app.data.articles.published.filter(a => a.id === "new").length, 1);
  assert.equal((await app.request("articles", "POST", { ...body, id: "duplicate" }, "owner@example.test")).statusCode, 409);
  assert.equal((await app.request("articles", "POST", { title: "Empty" }, "owner@example.test")).statusCode, 400);
  assert.equal((await app.request("articles", "DELETE", "{", "owner@example.test")).statusCode, 400);
  assert.equal((await app.request("articles", "DELETE", { id: "new" }, "owner@example.test")).statusCode, 200);
  assert.equal(app.data.articles.published.some(a => a.id === "new"), false);
});

test("all data images use separate endpoints and summaries stay small", async () => {
  const f = fixtures();
  f.articles.published = Array.from({ length: 120 }, (_, i) => ({ id: String(i), slug: String(i), title: "Image story", access: "public", bodyHtml: "<p>Body</p>", image: `data:image/jpeg;base64,${"a".repeat(150000)}` }));
  const app = harness(f);
  const list = await app.request("articles");
  assert.ok(Buffer.byteLength(list.body) < 100000);
  const image = await app.request("articles", "GET", undefined, undefined, { id: "0", image: "1" });
  assert.equal(image.statusCode, 200);
  assert.equal(image.isBase64Encoded, true);
  assert.equal(image.headers["content-type"], "image/jpeg");
  assert.equal(image.body.length, 150000);
  assert.throws(() => normalizeArticle({ title: "Oversize", image: `data:image/jpeg;base64,${"a".repeat(800000)}` }), /too large/);
});

test("changing article visibility invalidates its cached cover image", async () => {
  const f = fixtures();
  f.articles.published.find(a => a.id === "paid").image = "data:image/jpeg;base64,YWJj";
  const app = harness(f);
  assert.equal((await app.request("articles", "GET", undefined, undefined, { id: "paid", image: "1" })).statusCode, 200);
  assert.ok(app.data["article-media"].paid);
  assert.equal((await app.request("articles", "PUT", { id: "paid", access: "admin" }, "owner@example.test")).statusCode, 200);
  assert.equal(app.data["article-media"].paid, undefined);
  assert.equal((await app.request("articles", "GET", undefined, undefined, { id: "paid", image: "1" })).statusCode, 404);
});

test("admin changes all three plans without losing Stripe linkage; ordinary users cannot", async () => {
  const app = harness(fixtures());
  assert.equal((await app.request("members", "GET", undefined, "free@example.test", { list: "all" })).statusCode, 403);
  assert.equal((await app.request("members", "PATCH", { email: "free@example.test", plan: "annual" }, "free@example.test")).statusCode, 403);
  for (const plan of ["free", "monthly", "annual"]) {
    const result = await app.request("members", "PATCH", { email: "annual@example.test", plan }, "owner@example.test");
    assert.equal(result.statusCode, 200);
    assert.equal(result.json.member.plan, plan);
    assert.equal(result.json.member.stripeCustomerId, "cus_annual");
    assert.equal(access.paid(result.json.member), plan !== "free");
  }
  assert.equal((await app.request("members", "PATCH", { email: "annual@example.test", plan: "typo" }, "owner@example.test")).statusCode, 400);
  assert.equal((await app.request("members", "POST", "{")).statusCode, 400);
});

test("existing annual record survives repeated signup and email normalization", async () => {
  const app = harness(fixtures());
  const result = await app.request("members", "POST", { email: " ANNUAL@EXAMPLE.TEST ", mode: "signup" });
  assert.equal(result.json.member.plan, "annual");
  assert.equal(result.json.member.accountType, "paid");
  assert.equal(app.data.members.accounts.length, 4);
});

test("expired and failed memberships cannot use stale annual plan to unlock stories", () => {
  for (const subscription of ["cancelled", "canceled", "unpaid", "past_due", "review"]) assert.equal(access.paid({ plan: "annual", subscription }), false);
  assert.equal(access.paid({ plan: "annual", subscription: "active", cancelAtPeriodEnd: true, currentPeriodEnd: "2020-01-01" }), false);
  assert.equal(access.paid({ plan: "annual", subscription: "active", cancelAtPeriodEnd: true, currentPeriodEnd: "2099-01-01" }), true);
});

test("cancel schedules end of term, preserves annual plan and paid access", async () => {
  const app = harness(fixtures());
  const result = await app.request("stripe-cancel-subscription", "POST", {}, "annual@example.test");
  assert.equal(result.statusCode, 200);
  assert.equal(result.json.member.plan, "annual");
  assert.equal(result.json.member.cancelAtPeriodEnd, true);
  assert.equal(result.json.member.subscription, "active");
  assert.ok(result.json.member.currentPeriodEnd);
  assert.equal(app.calls[0].patch.cancel_at_period_end, true);
  assert.equal((await app.request("stripe-cancel-subscription", "POST", {}, "free@example.test")).statusCode, 403);
  assert.equal((await app.request("stripe-cancel-subscription", "POST", {}, "annual@example.test")).json.alreadyCancelled, true);
  assert.equal(app.calls.length, 1);
});

test("Stripe payload helpers support older and newer API formats", () => {
  assert.equal(subscriptionId({ parent: { subscription_details: { subscription: "sub_new" } } }), "sub_new");
  assert.equal(subscriptionId({ subscription: { id: "sub_old" } }), "sub_old");
  assert.equal(periodEnd({ current_period_end: 2000000000 }), periodEnd({ items: { data: [{ current_period_end: 2000000000 }] } }));
  assert.equal(planOf({ items: { data: [{ price: { recurring: { interval: "year" } } }] } }), "annual");
});

for (const endpoint of ["articles", "members", "article-view", "stripe-create-checkout-session", "stripe-confirm-checkout-session", "stripe-create-portal-session", "stripe-cancel-subscription"]) {
  test(`${endpoint}: malformed request returns JSON error without crashing`, async () => {
    const app = harness(fixtures());
    const result = await app.request(endpoint, "POST", "{", "owner@example.test");
    assert.equal(result.statusCode, 400);
    assert.ok(result.json.error);
  });
}

test("view recording starts at zero and article edits retain the real count", async () => {
  const app = harness(fixtures());
  const view = await app.request("article-view", "POST", { id: "paid" });
  assert.equal(view.json.views, 1);
  const updated = await app.request("articles", "PUT", { id: "paid", subtitle: "Changed" }, "owner@example.test");
  assert.equal(updated.json.article.views, 1);
});

test("newsletter persists deduplicated signups separately from paid accounts", async () => {
  const app = harness(fixtures());
  for (let i = 0; i < 2; i++) assert.equal((await app.request("newsletter", "POST", { email: " Person@Example.test " })).statusCode, 200);
  assert.equal((await app.request("newsletter", "POST", { email: "not an email" })).statusCode, 400);
  assert.equal((await app.request("newsletter", "GET")).statusCode, 403);
  const result = await app.request("newsletter", "GET", undefined, "owner@example.test");
  assert.equal(result.json.subscribers.length, 1);
  assert.equal(result.json.subscribers[0].email, "person@example.test");
  assert.equal(app.data.members.accounts.length, 4);
});

test("signed invoice.paid webhook upgrades annual member and deduplicates deliveries", async () => {
  const app = harness(fixtures());
  const payload = JSON.stringify({ id: "evt_paid", created: 1900000000, type: "invoice.paid", data: { object: { customer: "cus_annual", parent: { subscription_details: { subscription: "sub_annual" } } } } });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_fixture" });
  const event = { httpMethod: "POST", headers: { "stripe-signature": signature }, body: payload };
  const handler = app.load("stripe-webhook.js").handler;
  assert.equal((await handler(event)).statusCode, 200);
  const member = app.data.members.accounts.find(m => m.email === "annual@example.test");
  assert.equal(member.plan, "annual");
  assert.equal(member.subscription, "active");
  assert.ok(member.currentPeriodEnd);
  assert.equal(JSON.parse((await handler(event)).body).duplicate, true);
  assert.equal((await handler({ ...event, headers: { "stripe-signature": "invalid" } })).statusCode, 400);
});

test("checkout validates plans, uses correct prices and billing portal uses stored customer", async () => {
  const app = harness(fixtures());
  for (const plan of ["monthly", "annual"]) {
    const result = await app.request("stripe-create-checkout-session", "POST", { email: "free@example.test", plan }, "free@example.test");
    assert.equal(result.statusCode, 200);
    const params = app.calls.at(-1).params;
    assert.equal(params.line_items[0].price_data.unit_amount, plan === "monthly" ? 695 : 2495);
    assert.equal(params.automatic_tax.enabled, true);
  }
  assert.equal((await app.request("stripe-create-checkout-session", "POST", { plan: "invalid", email: "free@example.test" }, "free@example.test")).statusCode, 400);
  assert.equal((await app.request("stripe-create-checkout-session", "POST", { plan: "annual", email: "annual@example.test" }, "annual@example.test")).statusCode, 409);
  assert.equal((await app.request("stripe-create-portal-session", "POST", {}, "annual@example.test")).statusCode, 200);
  assert.equal(app.calls.at(-1).params.customer, "cus_annual");
  assert.equal((await app.request("stripe-confirm-checkout-session", "POST", { sessionId: "cs_test" }, "annual@example.test")).json.member.plan, "annual");
  assert.equal((await app.request("stripe-confirm-checkout-session", "POST", { sessionId: "cs_test" }, "free@example.test")).statusCode, 403);
});
