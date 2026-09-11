const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const Stripe = require("stripe");

function harness(initial = {}, stripeOverrides = {}) {
  const data = structuredClone(initial);
  const calls = [];
  const cache = new Map();
  const stripe = {
    webhooks: Stripe.webhooks,
    subscriptions: {
      retrieve: async (id) => ({ id, status: "active", customer: "cus_annual", metadata: { plan: "annual", email: "annual@example.test" }, items: { data: [{ price: { recurring: { interval: "year" } }, current_period_end: 2000000000 }] } }),
      list: async () => ({ data: [{ id: "sub_annual", status: "active" }] }),
      update: async (id, patch) => { calls.push({ action: "subscription.update", id, patch }); return { id, ...patch, items: { data: [{ current_period_end: 2000000000 }] } }; },
    },
    customers: { retrieve: async (id) => ({ id, email: "annual@example.test" }) },
    checkout: { sessions: {
      create: async (params) => { calls.push({ action: "checkout.create", params }); return { url: "https://checkout.stripe.com/test-fixture" }; },
      retrieve: async () => ({ mode: "subscription", payment_status: "paid", metadata: { email: "annual@example.test", plan: "annual" }, customer: "cus_annual", subscription: { id: "sub_annual", status: "active", items: { data: [{ price: { recurring: { interval: "year" } }, current_period_end: 2000000000 }] } } }),
    } },
    billingPortal: { sessions: { create: async (params) => { calls.push({ action: "portal.create", params }); return { url: "https://billing.stripe.com/test-fixture" }; } } },
    ...stripeOverrides,
  };
  const blobs = {
    connectLambda() {},
    getStore(options) {
      const name = typeof options === "string" ? options : options.name;
      data[name] ||= {};
      return {
        get: async (key) => structuredClone(data[name][key] ?? null),
        list: async () => ({ blobs: Object.keys(data[name]).map(key => ({ key })) }),
        delete: async (key) => { delete data[name][key]; },
        setJSON: async (key, value) => { data[name][key] = structuredClone(value); },
      };
    },
  };
  function load(file) {
    const absolute = path.resolve(__dirname, "../netlify/functions", file);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} };
    cache.set(absolute, module);
    const requireFrom = createRequire(absolute);
    const sandbox = {
      module, exports: module.exports, Buffer, URL, Intl, Date, JSON, SyntaxError, setTimeout, clearTimeout,
      console: { log() {}, error() {} },
      process: { env: { ADMIN_EMAILS: "owner@example.test", STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture", STRIPE_MONTHLY_PRICE_ID: "6.95", STRIPE_ANNUAL_PRICE_ID: "24.95", URL: "http://localhost:4175" } },
      require(name) {
        if (name === "@netlify/blobs") return blobs;
        if (name === "stripe") return function () { return stripe; };
        if (name.startsWith(".")) return load(requireFrom.resolve(name));
        return requireFrom(name);
      },
    };
    vm.runInNewContext(fs.readFileSync(absolute, "utf8"), sandbox, { filename: absolute });
    return module.exports;
  }
  async function request(name, method = "GET", body, email, query = {}) {
    const event = { httpMethod: method, headers: email ? { "x-user-email": email } : {}, queryStringParameters: query, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) };
    const response = await load(`${name}.js`).handler(event, {});
    return { ...response, json: response.isBase64Encoded ? null : JSON.parse(response.body) };
  }
  return { data, calls, load, request, stripe };
}

function fixtures() {
  const base = { sport: "flag football", year: 2026, date: "September 10, 2026", author: "Test Editor", subtitle: "A new county story", custom: true, status: "published", readTime: 3, tags: ["football"] };
  return {
    articles: { published: [
      { ...base, id: "private", slug: "private-story", title: "Private Story", access: "admin", bodyHtml: "<p>Private editorial content.</p>" },
      { ...base, id: "paid", slug: "paid-story", title: "Flag Football Opens With A Bang", access: "paid", bodyHtml: "<p>The complete paid article with the final score.</p>", image: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=1400&q=80" },
      { ...base, id: "public", slug: "public-story", title: "Public Story", access: "public", bodyHtml: "<p>Public reporting.</p>" },
      { ...base, id: "free", slug: "free-story", title: "Registered Reader Story", access: "free", bodyHtml: "<p>For registered readers.</p>" },
      { ...base, id: "draft", slug: "draft-story", title: "Draft Story", access: "paid", status: "draft", bodyHtml: "<p>Not published.</p>" },
    ] },
    members: { accounts: [
      { name: "Owner", email: "owner@example.test", plan: "free", subscription: "free" },
      { name: "Annual", email: "annual@example.test", plan: "annual", subscription: "active", stripeCustomerId: "cus_annual", stripeSubscriptionId: "sub_annual" },
      { name: "Monthly", email: "monthly@example.test", plan: "monthly", subscription: "active" },
      { name: "Free", email: "free@example.test", plan: "free", subscription: "free" },
    ] },
  };
}

module.exports = { harness, fixtures };
