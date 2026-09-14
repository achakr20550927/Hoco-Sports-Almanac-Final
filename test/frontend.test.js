const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { harness, fixtures } = require("../scripts/qa-harness.cjs");

function frontend(storage = {}, fetchOverride) {
  const api = harness(fixtures());
  const elements = {};
  const intervals = [];
  const listeners = {};
  const el = (id) => elements[id] ||= { innerHTML: "", textContent: "", value: "", innerText: "", classList: { add() {}, remove() {}, toggle() {} }, style: { setProperty() {} } };
  el("app"); el("toast");
  const location = { hash: "", search: "", pathname: "/", origin: "http://localhost:4175" };
  const document = { getElementById: id => elements[id] || null, body: { classList: { toggle() {} } }, querySelector: () => null, addEventListener: (name, fn) => { listeners[name] = fn; } };
  const context = vm.createContext({
    console, crypto, URL, URLSearchParams, Intl, Date, HocoAccess: require("../access-policy"), document, location,
    history: { pushState: (_, __, url) => { location.hash = url; }, replaceState() {} },
    localStorage: { getItem: key => storage[key] || null, setItem: (key, value) => { storage[key] = value; }, removeItem: key => { delete storage[key]; } },
    setTimeout() {}, setInterval: (fn, ms) => intervals.push({ fn, ms }), confirm: () => true,
    fetch: fetchOverride || (async (url, options = {}) => {
      const parsed = new URL(url, location.origin);
      const response = await api.request(parsed.pathname.split("/").pop(), options.method || "GET", options.body, options.headers?.["x-user-email"], Object.fromEntries(parsed.searchParams));
      return { ok: response.statusCode < 400, status: response.statusCode, json: async () => response.json };
    }),
    window: { addEventListener: (name, fn) => { listeners[name] = fn; }, scrollTo() {} },
  });
  vm.runInContext(fs.readFileSync(require.resolve("../app.js"), "utf8"), context);
  return { run: code => vm.runInContext(code, context), api, el, elements, intervals, storage, location, document };
}

test("password setup is self-service; unverified profiles cannot save a password", async () => {
  const app = frontend();
  app.run("state.authEnabled = true; state.user = {email:'annual@example.test',plan:'annual'}; state.secureSession = false");
  assert.match(app.run("accountPage()"), /Send Password Setup Link/);
  assert.equal(app.run("accountPage()").includes('id="newPassword"'), false);
  app.run("window.HocoAuth = {setPassword(){throw new Error('Must not call for legacy session')}}");
  await app.run("saveAccountPassword()");
});

test("confirmed password save uses Auth only and never persists plaintext in member cache", async () => {
  const app = frontend();
  app.run("state.authEnabled = true; state.secureSession = true; state.user = {email:'annual@example.test',plan:'annual'}; window.HocoAuth = {setPassword:async () => ({user:{}})}");
  app.el("newPassword").value = "synthetic-test-password-123";
  app.el("confirmPassword").value = "synthetic-test-password-123";
  await app.run("saveAccountPassword()");
  assert.equal(app.el("newPassword").value, "");
  assert.equal(app.el("confirmPassword").value, "");
  assert.equal(JSON.stringify(app.storage).includes("synthetic-test-password"), false);
  assert.equal(app.run("state.user.plan"), "annual");
  assert.match(app.run("state.passwordStatus"), /saved securely/);
});

test("mismatched passwords never reach the authentication provider", async () => {
  const app = frontend();
  app.run("state.secureSession = true; window.HocoAuth = {setPassword(){throw new Error('Should not be called')}}");
  app.el("newPassword").value = "synthetic-test-password-123";
  app.el("confirmPassword").value = "different-password";
  await app.run("saveAccountPassword()");
  assert.match(app.el("toast").textContent, /do not match/);
});

test("a delayed secure login cannot restore an account after logout", async () => {
  let finish;
  const app = frontend({}, async url => {
    if (url.endsWith("/members")) return new Promise(resolve => { finish = resolve; });
    return { ok: true, json: async () => ({ articles: [] }) };
  });
  const pending = app.run("completeSecureLogin({access_token:'fixture',user:{email:'annual@example.test'}})");
  app.run("logout()");
  finish({ ok: true, json: async () => ({ member: { email: "annual@example.test", plan: "annual" } }) });
  await pending;
  assert.equal(app.run("state.user"), null);
  assert.equal(app.run("state.secureSession"), false);
});

test("auth configuration errors still permit anonymous article requests", async () => {
  const app = frontend();
  app.run("state.authError = true; window.HocoAuth = {headers(){throw new Error('Unavailable')}}");
  const headers = await app.run("authHeaders()");
  assert.equal(headers.authorization, undefined);
  assert.equal(headers["x-user-email"], undefined);
  await app.run("loadRemoteArticles()");
  assert.match(app.run("homePage()"), /Public Story/);
});

test("corrupt browser cache does not crash startup; lists never reveal private/draft stories", async () => {
  const app = frontend({ sp_user: "{", sp_reads: "{", hoco_accounts: "{" });
  await app.run("loadRemoteArticles()");
  for (const page of ["homePage()", "archivePage()", "sidebar()", "sportSections()", "articlePage('paid-story')"]) {
    const html = app.run(page);
    assert.equal(html.includes("Private Story"), false);
    assert.equal(html.includes("Draft Story"), false);
  }
  assert.match(app.run("articlePage('missing')"), /Story unavailable/);
  app.location.hash = "#%invalid";
  assert.doesNotThrow(() => app.run("applyHashRoute()"));
});

test("all sport routes and navigation return home; search text is escaped", async () => {
  const app = frontend();
  await app.run("loadRemoteArticles()");
  for (const sport of JSON.parse(app.run("JSON.stringify(sports)"))) {
    app.run(`setSport(${JSON.stringify(sport)})`);
    assert.equal(app.run("state.route"), "archive");
    app.run("routeTo('home')");
    assert.equal(app.location.hash, "#home");
  }
  app.run(`state.query = '<script>bad</script>"'`);
  assert.equal(app.run("archivePage()").includes('<script>bad</script>'), false);
});

test("paid subscriber can read full story; logout hides cached paid content", async () => {
  const app = frontend();
  app.el("email").value = "annual@example.test";
  await app.run("login('login')");
  assert.equal(app.run("membershipPlan()"), "annual");
  assert.equal(app.run("isAdmin()"), false);
  await app.run("loadFullArticle('paid-story')");
  assert.match(app.run("articlePage('paid-story')"), /complete paid article/);
  app.run("logout()");
  assert.equal(app.run("articlePage('paid-story')").includes("complete paid article"), false);
  assert.equal(app.run("isSubscriber()"), false);
});

test("failed login never creates local paid/admin session", async () => {
  const app = frontend({}, async () => ({ ok: false, status: 503, json: async () => ({ error: "Unavailable" }) }));
  app.el("email").value = "annual@example.test";
  await app.run("login('login')");
  assert.equal(app.run("state.user"), null);
  assert.equal(app.run("isAdmin()"), false);
});

test("new articles default to paid; editor opens full body and preserves original date", async () => {
  const app = frontend();
  app.el("email").value = "owner@example.test";
  await app.run("login('login')");
  app.run("routeTo('admin')");
  app.run("newArticle()");
  assert.equal(app.run("state.editorDraft.access"), "paid");
  await app.run("editArticle('paid')");
  assert.match(app.run("state.editorDraft.bodyHtml"), /complete paid article/);
  assert.equal(app.run("state.editorDraft.slug"), "paid-story");
  assert.equal(app.run("state.editorDraft.date"), "September 10, 2026");
});

test("read meter resets before access check; cancellation appears only for paid billing accounts", () => {
  const app = frontend();
  app.run("state.reads = { month: '2020-01', count: 5, article_ids: [] }");
  assert.equal(app.run("canRead({ id:'public', access:'public' })"), true);
  assert.equal(app.run("accountPage()").includes("Cancel Subscription"), false);
  app.run("state.user = { email:'annual@example.test', plan:'annual', subscription:'active', stripeCustomerId:'cus_annual' }");
  assert.equal(app.run("accountPage()").includes("Cancel Subscription"), true);
  app.run("state.user.cancelAtPeriodEnd = true");
  assert.equal(app.run("accountPage()").includes("Cancel Subscription"), false);
});

test("search waits for submission without replacing the input after each character", async () => {
  const app = frontend();
  await app.run("loadRemoteArticles()");
  app.run("routeTo('archive')");
  const before = app.el("app").innerHTML;
  for (const input of ["P", "Pu", "Public"]) app.run(`updateSearch({value:${JSON.stringify(input)}})`);
  assert.equal(app.run("state.query"), "");
  assert.equal(app.el("app").innerHTML, before);
  app.run("submitSearch()");
  assert.equal(app.run("state.query"), "Public");
  assert.equal(app.run("filteredArticles().length"), 1);
  app.run("clearFilters()");
  assert.equal(app.run("state.searchDraft"), "");
});

test("discarding a stuck draft creates a fresh paid draft and retains a recoverable copy", () => {
  const original = { id: "stuck-test", title: "Test", bodyHtml: "<p>Private test</p>", access: "admin" };
  const app = frontend({ hoco_admin_draft: JSON.stringify(original) });
  app.run("state.route='admin'; state.adminVerified=true; state.user={email:'owner@example.test'}");
  app.run("newArticle()");
  const next = JSON.parse(app.storage.hoco_admin_draft);
  assert.notEqual(next.id, original.id);
  assert.equal(next.access, "paid");
  assert.equal(next.title, undefined);
  assert.equal(JSON.parse(app.storage.hoco_discarded_draft).title, "Test");
  assert.equal(frontend(app.storage).run("state.editorDraft.id"), next.id);
  app.run("restoreDraft()");
  assert.equal(app.run("state.editorDraft.id"), original.id);
});

test("stock defaults match the sport, replace only known defaults, and preserve uploads", () => {
  const app = frontend();
  for (const sport of ["field hockey", "flag football", "cheer"]) {
    const expected = `/assets/sports/${sport.replaceAll(" ", "-")}.jpg`;
    assert.equal(app.run(`usableArticleImage({sport:${JSON.stringify(sport)}})`), expected);
    assert.equal(app.run(`usableArticleImage({sport:${JSON.stringify(sport)},image:'data:image/jpeg;base64,USER'})`), "data:image/jpeg;base64,USER");
  }
  assert.equal(app.run("usableArticleImage({sport:'cheer',image:'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1400'})"), "/assets/sports/cheer.jpg");
  assert.match(app.run("archivePage()"), /value="general"/);
  assert.match(app.run("publishPanel()"), /value="general"/);
});

test("image fallbacks use sport photos without intercepting article navigation", () => {
  const app = frontend();
  app.run("globalThis.testImage = {dataset:{imageSport:'cheer'},src:'broken',onerror:()=>{}}");
  app.run("fallbackArticleImage(testImage)");
  assert.equal(app.run("testImage.src"), "/assets/sports/cheer.jpg");
  app.run("fallbackArticleImage(testImage)");
  assert.equal(app.run("testImage.src"), app.run("defaultHeroImage"));
  assert.equal(app.run("testImage.onerror"), null);
  const html = app.run("card({slug:'cheer-test',title:'Cheer',sport:'cheer'})");
  assert.match(html, /data-article="cheer-test"/);
  assert.match(html, /data-image-sport="cheer"/);
  assert.equal(html.includes('data-sport='), false);
});

test("a successful publish clears the draft even when browser storage is unavailable", async () => {
  const app = frontend();
  app.el("email").value = "owner@example.test";
  await app.run("login('login')");
  app.el("adminTitle").value = "General update";
  app.el("adminBody").innerHTML = "<p>Reporting body</p>";
  app.el("adminBody").textContent = "Reporting body";
  app.el("adminBody").innerText = "Reporting body";
  app.el("adminSport").value = "general";
  app.run("localStorage.setItem = () => { throw new Error('Storage full'); }");
  await app.run("publishArticle()");
  assert.equal(app.run("state.adminTab"), "articles");
  assert.equal(app.run("state.editorDraft"), null);
  assert.equal(app.api.data.articles.published[0].sport, "general");
});

test("failed publishing leaves a visible error and offers draft recovery", async () => {
  const app = frontend({}, async () => ({ ok: false, json: async () => ({ error: "Save unavailable" }) }));
  app.run("state.user={email:'owner@example.test'}; state.adminVerified=true; state.route='admin'");
  app.el("adminTitle").value = "Unpublished test";
  app.el("adminBody").innerHTML = "<p>Testing</p>";
  app.el("adminBody").textContent = "Testing";
  app.el("adminBody").innerText = "Testing";
  await app.run("publishArticle()");
  assert.match(app.run("state.publishError"), /Save unavailable/);
  assert.match(app.run("publishPanel()"), /role="alert"/);
  assert.match(app.run("publishPanel()"), /Discard Draft/);
  assert.equal(app.run("state.publishing"), false);
});
