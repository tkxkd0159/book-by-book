import { expect, test } from "@playwright/test";

import { signInAs } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await signInAs(page, "owner", "/books/search");
});

test("search button is correctly positioned relative to the search input", async ({
  page,
}) => {
  await page.goto("/books/search");

  const searchInput = page.getByLabel("Search term");
  const searchButton = page.getByRole("button", { name: "Search", exact: true });

  await expect(searchInput).toBeVisible();
  await expect(searchButton).toBeVisible();

  const inputBox = await searchInput.boundingBox();
  const buttonBox = await searchButton.boundingBox();

  expect(inputBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();

  const viewportWidth = page.viewportSize()?.width ?? 1024;
  const isMobileLayout = viewportWidth < 640;

  if (isMobileLayout) {
    const inputBottom = (inputBox?.y ?? 0) + (inputBox?.height ?? 0);
    expect(buttonBox?.y ?? 0).toBeGreaterThan(inputBottom - 1);
  } else {
    const topOffset = Math.abs((inputBox?.y ?? 0) - (buttonBox?.y ?? 0));
    expect(topOffset).toBeLessThanOrEqual(3);
  }
});

test("basic search keeps boolean-style operators in URL query", async ({ page }) => {
  await page.goto("/books/search");

  const basicQuery = '"Elizabeth Bennet" +Darcy -Austen';
  await page.getByLabel("Search term").fill(basicQuery);
  await page.getByRole("button", { name: "Search", exact: true }).click();

  await expect(page).toHaveURL(/\/books\/search\?/);
  const currentUrl = new URL(page.url());

  expect(currentUrl.pathname).toBe("/books/search");
  expect(currentUrl.searchParams.get("q")).toBe(basicQuery);
  expect(currentUrl.searchParams.get("advanced")).toBeNull();
});

test("advanced layout replaces basic layout and keeps toggle metadata behavior", async ({
  page,
}) => {
  await page.goto("/books/search?advanced=1&title=Cosmos&author=Sagan&page=3");

  await expect(page.getByLabel("Search term")).toHaveCount(0);
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Cosmos");
  await expect(page.getByLabel("Author")).toHaveValue("Sagan");

  await page.getByRole("button", { name: "Advanced search" }).click();

  await expect(page).toHaveURL(/advanced=1/);
  await expect(page).toHaveURL(/page=3/);
  await expect(page.getByText("Title only")).toBeVisible();
  await expect(page.getByLabel("Search term")).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toHaveCount(0);

  const basicQuery = '"Elizabeth Bennet" +Darcy -Austen';
  await page.getByLabel("Search term").fill(basicQuery);
  await expect(page.getByLabel("Search term")).toHaveValue(basicQuery);

  await page.getByRole("button", { name: "Advanced search" }).click();
  await expect(page.getByLabel("Search term")).toHaveCount(0);
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Cosmos");
  await expect(page.getByLabel("Author")).toBeVisible();
  await page.getByLabel("Title", { exact: true }).fill("Pride and Prejudice");
  await page.getByRole("button", { name: "Search", exact: true }).click();

  await expect(page).toHaveURL(/\/books\/search\?/);

  const currentUrl = new URL(page.url());
  expect(currentUrl.pathname).toBe("/books/search");
  expect(currentUrl.searchParams.get("advanced")).toBe("1");
  expect(currentUrl.searchParams.get("title")).toBe("Pride and Prejudice");
  expect(currentUrl.searchParams.get("author")).toBe("Sagan");
  expect(currentUrl.searchParams.get("q")).toBeNull();
  expect(currentUrl.searchParams.get("page")).toBeNull();
});
