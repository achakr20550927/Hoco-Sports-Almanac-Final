// Run with Playwright installed and scripts/qa-server.cjs serving local fixtures.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://127.0.0.1:4175/");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.getByPlaceholder("Email", { exact: true }).fill("owner@example.test");
    await page.getByPlaceholder("Password", { exact: true }).fill("local-fixture-only");
    await page.getByRole("button", { name: "Log In", exact: true }).last().click();
    await page.getByRole("button", { name: "Admin Dashboard", exact: true }).click();
    await page.getByPlaceholder("Write the article headline").fill("Disposable private test");
    await page.locator("#adminBody").fill("Local test body for draft recovery.");
    await page.locator("#adminAccess").selectOption("admin");
    await page.getByRole("button", { name: "Save Draft", exact: true }).click();
    await page.getByRole("button", { name: "Discard Draft", exact: true }).click();
    assert.equal(await page.locator("#adminTitle").inputValue(), "");
    assert.equal(await page.locator("#adminAccess").inputValue(), "paid");
    await page.reload();
    assert.equal(await page.locator("#adminTitle").inputValue(), "");
    await page.getByRole("button", { name: "Restore Last Discarded Draft", exact: true }).click();
    assert.equal(await page.locator("#adminTitle").inputValue(), "Disposable private test");
    await page.getByRole("button", { name: "New Article", exact: true }).click();

    for (const sport of ["general", "field hockey", "flag football", "cheer"]) {
      const title = `QA ${sport} ${Date.now()}`;
      await page.locator("#adminTitle").fill(title);
      await page.locator("#adminBody").fill(`Published ${sport} body.`);
      await page.locator("#adminSport").selectOption(sport);
      await page.getByRole("button", { name: "Publish Now", exact: true }).click();
      await page.getByRole("heading", { name: "Article Manager", exact: true }).waitFor();
      assert.equal(await page.getByRole("row").filter({ hasText: title }).count(), 1);
      await page.getByRole("button", { name: "New Article", exact: true }).click();
      assert.equal(await page.locator("#adminTitle").inputValue(), "");
    }

    await page.getByRole("link", { name: "Archive", exact: true }).click();
    const initialResults = await page.getByRole("heading", { name: /Results$/ }).textContent();
    await page.getByRole("searchbox", { name: "Search articles" }).pressSequentially("Public");
    assert.equal(await page.getByRole("heading", { name: /Results$/ }).textContent(), initialResults);
    assert.equal(await page.getByRole("searchbox", { name: "Search articles" }).inputValue(), "Public");
    await page.getByRole("searchbox", { name: "Search articles" }).press("Enter");
    assert.equal(await page.getByRole("heading", { name: "1 Results", exact: true }).count(), 1);
    await page.getByRole("button", { name: "Clear Filters", exact: true }).click();
    await page.getByRole("combobox", { name: "Sport", exact: true }).selectOption("cheer");
    await page.locator(".card img").first().waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll(".card img")].every(img => img.complete && img.naturalWidth > 0));
    assert.match(await page.locator(".card img").first().getAttribute("src"), /\/assets\/sports\/cheer.jpg$/);
    await page.locator(".card img").first().click();
    await page.waitForURL(/#article-/);
    await page.locator(".article-body").filter({hasText:"Published cheer body."}).waitFor();
    await page.getByRole("link", { name: "Home", exact: true }).first().click();
    await page.waitForURL(/#home$/);
    await page.getByRole("link", { name: "Archive", exact: true }).click();
    await page.getByRole("button", { name: "Clear Filters", exact: true }).click();
    await page.screenshot({ path: path.join(os.tmpdir(), "hoco-editor-desktop.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("searchbox", { name: "Search articles" }).fill("QA");
    await page.getByRole("search").getByRole("button", { name: "Search", exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(os.tmpdir(), "hoco-editor-mobile.png") });
    assert.deepEqual(errors, []);
    console.log("PASS: draft reset/restore/reload, publishing four sports, search submission, image navigation, desktop/mobile layout; no page errors.");
    console.log(path.join(os.tmpdir(), "hoco-editor-desktop.png"));
    console.log(path.join(os.tmpdir(), "hoco-editor-mobile.png"));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
