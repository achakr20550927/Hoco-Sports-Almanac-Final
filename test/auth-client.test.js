const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function client(overrides = {}) {
  const calls = [];
  const identity = {
    getUser: async () => ({ id: "identity-1", email: "annual@example.test", confirmedAt: "2026-09-12" }),
    login: async () => { throw new Error("Invalid password"); }, signup: async () => ({}), logout: async () => {},
    handleAuthCallback: async () => null, onAuthChange: () => {}, requestPasswordRecovery: async () => {},
    updateUser: async update => { calls.push(update); }, refreshSession: async () => null,
    ...overrides,
  };
  const context = { ...identity, window: {}, document: { cookie: "nf_jwt=fixture-token" }, location: { pathname: "/", search: "" }, history: { replaceState() {} },
    fetch: async () => ({ ok: true, json: async () => ({ enabled: true, mode: "pilot" }) }) };
  const source = fs.readFileSync(require.resolve("../auth-client.js"), "utf8");
  vm.runInNewContext(source.slice(source.indexOf("\n") + 1), context);
  return { auth: context.window.HocoAuth, calls };
}

test("identity adapter saves only through provider updateUser and sends bearer headers", async () => {
  const { auth, calls } = client();
  await auth.setPassword("synthetic-password-123");
  assert.equal(calls[0].password, "synthetic-password-123");
  assert.equal((await auth.headers()).authorization, "Bearer fixture-token");
});

test("identity adapter never saves a password for an unconfirmed or signed-out user", async () => {
  const unconfirmed = client({ getUser: async () => ({ email: "annual@example.test" }) });
  await assert.rejects(unconfirmed.auth.setPassword("synthetic-password-123"), /Verify your email/);
  assert.equal(unconfirmed.calls.length, 0);
  const confirmed = client();
  await confirmed.auth.init();
  await confirmed.auth.signOut();
  await assert.rejects(confirmed.auth.setPassword("synthetic-password-123"), /Verify your email/);
  assert.equal((await confirmed.auth.headers()).authorization, undefined);
});

test("identity rejects incorrect passwords and handles expired callbacks with recovery UI", async () => {
  await assert.rejects(client().auth.signIn("annual@example.test", "wrong"), /Invalid password/);
  const expired = client({ handleAuthCallback: async () => { throw new Error("Expired"); } });
  const result = await expired.auth.init();
  assert.equal(result.session, null);
  assert.equal(result.callbackError, true);
  assert.equal(result.passwordSetup, true);
});
