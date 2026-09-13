const test = require("node:test");
const assert = require("node:assert/strict");
const { harness, fixtures } = require("../scripts/qa-harness.cjs");
const env = { AUTH_MODE: "identity" };
const users = {
  annual: { id: "auth-annual", email: "Annual@example.test", confirmed_at: "2026-09-12", user_metadata: { full_name: "Changed Name" } },
  owner: { id: "auth-owner", email: "owner@example.test", confirmed_at: "2026-09-12" },
  unverified: { id: "auth-unverified", email: "owner@example.test" },
};
const api = (mode = "identity") => harness(fixtures(), {}, { env: { ...env, AUTH_MODE: mode }, users });
const header = token => ({ authorization: `Bearer ${token}` });

test("secure mode rejects legacy email headers and query/body impersonation", async () => {
  const h = api();
  assert.equal((await h.request("admin-status", "GET", undefined, "owner@example.test")).json.isAdmin, false);
  assert.equal((await h.request("members", "GET", undefined, undefined, { email: "annual@example.test" })).json.member, null);
  assert.equal((await h.request("members", "POST", { email: "owner@example.test", mode: "login" })).statusCode, 401);
  assert.equal((await h.request("members", "GET", undefined, "owner@example.test", { list: "all" })).statusCode, 403);
  assert.equal((await h.request("stripe-cancel-subscription", "POST", { email: "annual@example.test" })).statusCode, 401);
  assert.equal((await h.request("stripe-confirm-checkout-session", "POST", { email: "annual@example.test", sessionId: "cs_fixture" })).statusCode, 400);
});

test("invalid and unverified tokens never fall back to an admin email in either mode", async () => {
  for (const mode of ["pilot", "identity"]) for (const token of ["invalid", "unverified"]) {
    const h = api(mode);
    assert.equal((await h.request("admin-status", "GET", undefined, "owner@example.test", {}, header(token))).json.isAdmin, false);
    assert.equal((await h.request("members", "PATCH", { email: "annual@example.test", plan: "free" }, "owner@example.test", {}, header(token))).statusCode, 401);
  }
});

test("verified annual member keeps every existing billing field and can read paid stories", async () => {
  const h = api();
  const before = structuredClone(h.data.members.accounts.find(x => x.email === "annual@example.test"));
  before.currentPeriodEnd = "2027-08-01T00:00:00.000Z";
  Object.assign(h.data.members.accounts.find(x => x.email === before.email), before);
  const result = await h.request("members", "POST", { email: "owner@example.test", plan: "free", name: "Impersonation" }, undefined, {}, header("annual"));
  assert.equal(result.statusCode, 200);
  assert.equal(result.json.member.plan, "annual");
  const after = h.data.members.accounts.find(x => x.email === before.email);
  for (const key of Object.keys(before)) assert.deepEqual(after[key], before[key]);
  assert.equal(after.authUserId, "auth-annual");
  assert.equal(h.data.members.accounts.length, 4);
  const read = await h.request("articles", "GET", undefined, undefined, { id: "paid" }, header("annual"));
  assert.equal(read.statusCode, 200);
  assert.equal((await h.request("members", "PATCH", { email: "free@example.test", plan: "annual" }, undefined, {}, header("annual"))).statusCode, 403);
});

test("existing auth linkage cannot be overwritten during setup", async () => {
  const h = api();
  const member = h.data.members.accounts.find(x => x.email === "annual@example.test");
  member.authUserId = "another-subject";
  assert.equal((await h.request("members", "POST", {}, undefined, {}, header("annual"))).statusCode, 409);
  assert.equal(member.authUserId, "another-subject");
  assert.equal(member.plan, "annual");
});

test("full migration backup requires admin and includes original billing metadata", async () => {
  const h = api();
  assert.equal((await h.request("members", "GET", undefined, undefined, { backup: "1" }, header("annual"))).statusCode, 403);
  const result = await h.request("members", "GET", undefined, undefined, { backup: "1" }, header("owner"));
  assert.equal(result.statusCode, 200);
  assert.equal(result.json.recordCount, 4);
  assert.deepEqual(result.json.members, h.data.members.accounts);
});

test("public auth configuration never publishes a secret key", async () => {
  const h = harness(fixtures(), {}, { env: { ...env, SUPABASE_PUBLISHABLE_KEY: "sb_secret_DO_NOT_EXPOSE" } });
  const result = await h.request("auth-config");
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.includes("DO_NOT_EXPOSE"), false);
});

test("migrated accounts reject legacy login and read access even during pilot", async () => {
  const h = api("pilot");
  await h.request("members", "POST", {}, undefined, {}, header("annual"));
  assert.equal((await h.request("members", "POST", { email: "annual@example.test", mode: "login" })).statusCode, 401);
  assert.equal((await h.request("articles", "GET", undefined, "annual@example.test", { id: "paid" })).statusCode, 403);
  assert.equal((await h.request("articles", "GET", undefined, undefined, { id: "paid" }, header("annual"))).statusCode, 200);
  assert.equal((await h.request("members", "GET", undefined, "owner@example.test", { backup: "1" })).statusCode, 403);
});

test("password setup generates a server-only credential and never changes memberships", async () => {
  const requests = [];
  const h = harness(fixtures(), {}, { env, fetch: async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => url.endsWith("/settings") ? { autoconfirm: false, disable_signup: false } : {} };
  } });
  const before = structuredClone(h.data.members.accounts);
  const response = await h.request("auth-setup", "POST", { email: "Annual@example.test", password: "attacker-chosen", plan: "free" });
  assert.equal(response.statusCode, 200);
  const signup = JSON.parse(requests[1].options.body);
  assert.equal(signup.email, "annual@example.test");
  assert.equal(signup.password.length, 64);
  assert.notEqual(signup.password, "attacker-chosen");
  assert.equal(response.body.includes(signup.password), false);
  assert.deepEqual(h.data.members.accounts, before);
  assert.equal(requests[0].url, "https://hocosportsalmanac.com/.netlify/identity/settings");
});

test("setup refuses autoconfirm and provider failure; rate limits repeated requests", async () => {
  for (const autoconfirm of [true, undefined]) {
    let count = 0;
    const h = harness(fixtures(), {}, { env, fetch: async () => { count++; return { ok: true, json: async () => ({ autoconfirm }) }; } });
    assert.equal((await h.request("auth-setup", "POST", { email: "annual@example.test" })).statusCode, 503);
    assert.equal(count, 1);
  }
  const h = harness(fixtures(), {}, { env, fetch: async () => { throw new Error("Provider down"); } });
  for (let i = 0; i < 3; i++) assert.equal((await h.request("auth-setup", "POST", { email: "annual@example.test" })).statusCode, 503);
  assert.equal((await h.request("auth-setup", "POST", { email: "annual@example.test" })).statusCode, 429);
});

test("already registered setup requests recovery without resetting an existing password", async () => {
  const requests = [];
  const h = harness(fixtures(), {}, { env, fetch: async (url, options) => {
    requests.push(url);
    if (url.endsWith("/signup")) return { ok: false, status: 422, json: async () => ({ msg: "A user with this email address has already been registered" }) };
    return { ok: true, json: async () => ({ autoconfirm: false }) };
  } });
  assert.equal((await h.request("auth-setup", "POST", { email: "annual@example.test" })).statusCode, 200);
  assert.equal(requests[2], "https://hocosportsalmanac.com/.netlify/identity/recover");
});

test("duplicate membership records are never merged automatically", async () => {
  const h = api();
  h.data.members.accounts.push({ email: "Annual@example.test", plan: "free" });
  const before = structuredClone(h.data.members.accounts);
  assert.equal((await h.request("members", "POST", {}, undefined, {}, header("annual"))).statusCode, 409);
  assert.deepEqual(h.data.members.accounts, before);
});
