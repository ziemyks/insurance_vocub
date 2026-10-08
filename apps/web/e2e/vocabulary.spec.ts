import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId(`login-${email}`).click();
  await page.waitForURL("/");
}

async function resultSlugs(page: Page, q: string) {
  await page.goto(`/search?q=${encodeURIComponent(q)}`);
  return page
    .getByTestId("search-results")
    .locator("a.hit-title")
    .evaluateAll((as) => as.map((a) => a.getAttribute("href")));
}

test("search ignores Latvian diacritics and finds abbreviations", async ({ page }) => {
  await login(page, "viewer@demo.local");
  const withDiacritics = await resultSlugs(page, "zaudējumu");
  expect(withDiacritics.length).toBeGreaterThan(0);
  expect(await resultSlugs(page, "zaudejumu")).toEqual(withDiacritics);
  expect((await resultSlugs(page, "GWP"))[0]).toBe("/concepts/gross-written-premium");
});

test("switches the interface between Latvian and English", async ({ page }) => {
  await login(page, "viewer@demo.local");
  await expect(page.locator(".brand strong")).toHaveText("Biznesa vārdnīca");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator(".brand strong")).toHaveText("Business Vocabulary");
  await page.goto("/concepts/combined-ratio");
  await expect(page.getByTestId("concept-title")).toContainText("Combined ratio");
  await page.getByRole("button", { name: "LV", exact: true }).click();
  await expect(page.getByTestId("concept-title")).toContainText("Kombinētais rādītājs");
});

test("a metric cannot be saved without its qualifiers", async ({ page }) => {
  await login(page, "contributor@demo.local");
  await page.goto("/changes/new?domain=claims");
  await page.getByLabel("Veids").selectOption("METRIC");
  await page.locator('input[name="preferred-lv"]').fill("Testa rādītājs");
  await page.locator('input[name="preferred-en"]').fill("Test metric");
  await page.locator('textarea[name="definition-lv"]').fill("Rādītājs testiem.");
  await page.locator('textarea[name="definition-en"]').fill("A metric for tests.");
  await page.locator('input[name="formula"]').fill("A / B");
  await page.locator('textarea[name="reason"]').fill("Test");
  await page.getByRole("button", { name: "Saglabāt melnrakstu" }).click();
  await expect(page.locator(".banner.error")).toContainText("metric.qualifiers.timeBasis");
  await expect(page.locator(".banner.error")).toContainText("Required");
  await expect(page).toHaveURL(/\/changes\/new/);
});

test("contributor proposes, steward endorses, owner approves, viewer sees it", async ({ page }) => {
  const name = `E2E term ${Date.now()}`;
  const slug = name.toLowerCase().replaceAll(" ", "-");

  await login(page, "contributor@demo.local");
  await page.goto("/changes/new");
  await page.getByLabel("Joma").selectOption("claims");
  await page.locator('input[name="preferred-lv"]').fill(`E2E termins ${Date.now()}`);
  await page.locator('input[name="preferred-en"]').fill(name);
  await page
    .locator('textarea[name="definition-lv"]')
    .fill("Jēdziens, kas izveidots pilna cikla testā.");
  await page
    .locator('textarea[name="definition-en"]')
    .fill("A concept created by the end-to-end test.");
  await page.locator('textarea[name="reason"]').fill("End-to-end workflow test");
  await page.getByRole("button", { name: "Saglabāt melnrakstu" }).click();
  await page.waitForURL(/\/changes\/\d+$/);
  const changeUrl = new URL(page.url()).pathname;
  await page.getByTestId("action-submit").click();
  await expect(page.locator(".badge.SUBMITTED").first()).toBeVisible();
  await expect(page.getByTestId("action-approve")).toHaveCount(0);

  await login(page, "steward.claims@demo.local");
  await page.goto(changeUrl);
  await expect(page.getByTestId("action-approve")).toHaveCount(0);
  await page.getByTestId("action-endorse").click();
  await expect(page.locator(".badge.ENDORSED").first()).toBeVisible();

  await login(page, "owner.claims@demo.local");
  await page.goto(changeUrl);
  await page.getByTestId("action-approve").click();
  await expect(page.locator(".badge.APPROVED").first()).toBeVisible();

  await login(page, "viewer@demo.local");
  await page.goto(`/concepts/${slug}`);
  await expect(page.getByTestId("concept-title")).toContainText("E2E termins");
  await expect(page.locator(".badge.APPROVED").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Ierosināt izmaiņas" })).toHaveCount(0);
});
