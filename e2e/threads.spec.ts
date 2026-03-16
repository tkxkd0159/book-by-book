import { expect, test } from "@playwright/test";

import { resetApp, signInAs } from "./helpers/auth";

test.beforeEach(async ({ request }) => {
  await resetApp(request);
});

test("club member can open a club-book discussion page and create a thread", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Discussion Launch Club");
  await page.getByLabel("Description").fill("Used for thread creation.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+(?:\?|$)/i);
  const clubUrl = page.url();

  await page.goto("/books/club-test-book");
  await page.getByRole("button", { name: "Add to club" }).click();
  await expect(page.getByText("Book added to the club.")).toBeVisible();

  await page.goto(clubUrl);
  await page.getByRole("link", { name: "Discussion" }).click();

  await expect(
    page.getByRole("heading", { name: "Discussion threads" }),
  ).toBeVisible();
  await expect(page.getByText("No threads yet.")).toBeVisible();

  await page.getByLabel("Thread title").fill("Chapter one reactions");
  await page.getByLabel("Opening note").fill("Let's talk about the opening scene.");
  await page.getByRole("button", { name: "Start thread" }).click();

  await expect(page.getByText("Thread created.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Chapter one reactions" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Chapter one reactions" }).click();
  await expect(
    page.getByRole("heading", { name: "Chapter one reactions" }),
  ).toBeVisible();
  await expect(page.getByText("No posts yet.")).toBeVisible();
});
