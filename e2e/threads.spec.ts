import { expect, test } from "@playwright/test";

import { resetApp, signInAs } from "./helpers/auth";

function postBody(page: import("@playwright/test").Page, text: string) {
  return page.locator("p").filter({ hasText: text }).first();
}

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

test("post authors can create, edit, and delete their own posts while non-authors cannot", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Post Lifecycle Club");
  await page.getByLabel("Description").fill("Used for post lifecycle checks.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+(?:\?|$)/i);
  const clubPath = new URL(page.url()).pathname;

  await page.goto("/books/club-test-book");
  await page.getByRole("button", { name: "Add to club" }).click();
  await expect(page.getByText("Book added to the club.")).toBeVisible();

  await page.goto(clubPath);
  await page.getByRole("link", { name: "Discussion" }).click();
  await page.getByLabel("Thread title").fill("Post lifecycle thread");
  await page.getByLabel("Opening note").fill("Owner starts the thread.");
  await page.getByRole("button", { name: "Start thread" }).click();

  await expect(
    page.getByRole("link", { name: "Post lifecycle thread" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Post lifecycle thread" }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/threads\/[0-9a-f-]+(?:\?|$)/i);
  await expect(
    page.getByRole("heading", { name: "Post lifecycle thread" }),
  ).toBeVisible();
  const threadUrl = page.url();

  await signInAs(page, "member", clubPath);
  await page.getByRole("button", { name: "Join club" }).click();
  await expect(page.getByText("You joined the club.")).toBeVisible();

  await page.goto(threadUrl);
  await page.getByLabel("Write a reply").fill("My first reaction.");
  await page.getByRole("button", { name: "Post reply" }).click();
  await expect(page.getByText("Post created.")).toBeVisible();
  await expect(postBody(page, "My first reaction.")).toBeVisible();

  await page.getByText("Edit post").click();
  await page.getByLabel("Edit your reply").fill("My updated reaction.");
  await page.getByRole("button", { name: "Update post" }).click();
  await expect(page.getByText("Post updated.")).toBeVisible();
  await expect(postBody(page, "My updated reaction.")).toBeVisible();

  await signInAs(page, "owner", threadUrl);
  await expect(page.getByRole("button", { name: "Delete post" })).toHaveCount(0);
  await expect(page.getByText("Edit post")).toHaveCount(0);
  await expect(postBody(page, "My updated reaction.")).toBeVisible();

  await signInAs(page, "member", threadUrl);
  await page.getByRole("button", { name: "Delete post" }).click();
  await expect(page.getByText("Post deleted.")).toBeVisible();
  await expect(page.getByText("This post was deleted.")).toBeVisible();
});
