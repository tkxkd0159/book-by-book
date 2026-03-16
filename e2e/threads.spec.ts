import { expect, test } from "@playwright/test";

import { resetApp, signInAs } from "./helpers/auth";

function postBody(page: import("@playwright/test").Page, text: string) {
  return page.locator("p").filter({ hasText: text }).first();
}

async function addFixtureBookToClub(
  page: import("@playwright/test").Page,
  clubName: string,
) {
  await page.goto("/books/club-test-book");
  await page.getByRole("button", { name: "Add Book" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(clubName).check();
  await dialog.getByRole("button", { name: "Add Book" }).click();
  await expect(page.getByText("Book added to 1 club.")).toBeVisible();
}

async function openFixtureBookCardDetails(
  page: import("@playwright/test").Page,
) {
  await page
    .getByLabel("Toggle details for The Test-Driven Book Club")
    .click();
}

async function openManagePage(page: import("@playwright/test").Page) {
  await page.getByRole("link", { name: "Manage" }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage(?:\?|$)/i);
}

async function openManageTab(
  page: import("@playwright/test").Page,
  tabName: "Members" | "Reading board" | "Invite",
) {
  await page.getByRole("link", { name: tabName, exact: true }).click();
}

async function openStartThreadModal(
  page: import("@playwright/test").Page,
) {
  await page.getByRole("button", { name: "Start a thread" }).click();
  await expect(page.locator('body > [data-modal-root="start-thread"]')).toBeVisible();
  return page.getByRole("dialog");
}

async function submitThreadFromModal(
  page: import("@playwright/test").Page,
  input: {
    title: string;
    body: string;
  },
) {
  const dialog = await openStartThreadModal(page);
  await dialog.getByLabel("Thread title").fill(input.title);
  await dialog.getByLabel("Opening note").fill(input.body);
  await dialog.getByRole("button", { name: "Start thread" }).click();
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

  await addFixtureBookToClub(page, "Discussion Launch Club");

  await page.goto(clubUrl);
  await openFixtureBookCardDetails(page);
  await page.getByRole("link", { name: "Discussion" }).click();

  await expect(
    page.getByRole("heading", { name: "Discussion threads" }),
  ).toBeVisible();
  await expect(page.getByText("No threads yet.")).toBeVisible();
  const openedDialog = await openStartThreadModal(page);
  await openedDialog.getByRole("button", { name: "Close start-thread modal" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const escapedDialog = await openStartThreadModal(page);
  await expect(escapedDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await openStartThreadModal(page);
  await page
    .locator('body > [data-modal-root="start-thread"]')
    .click({ position: { x: 8, y: 8 } });
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await submitThreadFromModal(page, {
    title: "Chapter one reactions",
    body: "Let's talk about the opening scene.",
  });

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

  await addFixtureBookToClub(page, "Post Lifecycle Club");

  await page.goto(clubPath);
  await openFixtureBookCardDetails(page);
  await page.getByRole("link", { name: "Discussion" }).click();
  await submitThreadFromModal(page, {
    title: "Post lifecycle thread",
    body: "Owner starts the thread.",
  });

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

test("club admins can pin a thread and move it ahead of newer threads", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Pin Ordering Club");
  await page.getByLabel("Description").fill("Used for pin ordering checks.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+(?:\?|$)/i);
  const clubUrl = page.url();

  await addFixtureBookToClub(page, "Pin Ordering Club");

  await page.goto(clubUrl);
  await openFixtureBookCardDetails(page);
  await page.getByRole("link", { name: "Discussion" }).click();

  await submitThreadFromModal(page, {
    title: "Earlier thread",
    body: "Created first.",
  });
  await expect(page.getByRole("link", { name: "Earlier thread" })).toBeVisible();

  await submitThreadFromModal(page, {
    title: "Later thread",
    body: "Created second.",
  });
  await expect(page.getByRole("link", { name: "Later thread" })).toBeVisible();

  await page.getByRole("link", { name: "Earlier thread" }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/threads\/[0-9a-f-]+(?:\?|$)/i);
  await page.locator("section").first().getByRole("button", { name: "Pin thread" }).click();
  await expect(page.getByText("Thread pinned.")).toBeVisible();

  await page.getByRole("link", { name: "Back to discussion list" }).click();
  await expect(page.locator("h3 a").nth(0)).toHaveText("Earlier thread");
  await expect(page.locator("h3 a").nth(1)).toHaveText("Later thread");
});

test("archived club books keep discussion readable but disable new thread creation", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Archived Discussion Club");
  await page.getByLabel("Description").fill("Used for archived discussion coverage.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+(?:\?|$)/i);
  const clubUrl = page.url();

  await addFixtureBookToClub(page, "Archived Discussion Club");

  await page.goto(clubUrl);
  await openFixtureBookCardDetails(page);
  await page.getByRole("link", { name: "Discussion" }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/books\/[0-9a-f-]+(?:\?|$)/i);
  const discussionUrl = page.url();

  await submitThreadFromModal(page, {
    title: "Archived thread",
    body: "This thread should survive archive.",
  });
  await expect(page.getByRole("link", { name: "Archived thread" })).toBeVisible();

  await page.goto(clubUrl);
  await openManagePage(page);
  await openManageTab(page, "Reading board");
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\?tab=board/i);
  await openFixtureBookCardDetails(page);
  await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Book removed.")).toBeVisible();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\?tab=board&message=/i);

  await page.goto(discussionUrl);
  await expect(page.getByText("Archived book")).toBeVisible();
  await expect(page.getByText("This club book has been archived.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start a thread" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Archived thread" })).toBeVisible();
});

test("club admins can delete threads while members cannot", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Thread Moderation UI Club");
  await page.getByLabel("Description").fill("Used for thread deletion coverage.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+(?:\?|$)/i);
  const clubPath = new URL(page.url()).pathname;

  await addFixtureBookToClub(page, "Thread Moderation UI Club");

  await page.goto(clubPath);
  await openFixtureBookCardDetails(page);
  await page.getByRole("link", { name: "Discussion" }).click();

  await submitThreadFromModal(page, {
    title: "Delete me",
    body: "This thread should be removable.",
  });
  await page.getByRole("link", { name: "Delete me" }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/threads\/[0-9a-f-]+(?:\?|$)/i);
  const threadUrl = page.url();

  await signInAs(page, "member", clubPath);
  await page.getByRole("button", { name: "Join club" }).click();
  await expect(page.getByText("You joined the club.")).toBeVisible();
  await page.goto(threadUrl);
  await expect(page.getByRole("button", { name: "Delete thread" })).toHaveCount(0);

  await signInAs(page, "owner", threadUrl);
  await page.getByRole("button", { name: "Delete thread" }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/books\/[0-9a-f-]+(?:\?|$)/i);
  await expect(page.getByText("Thread deleted.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Delete me" })).toHaveCount(0);
});

test("non-members see forbidden pages for discussion and thread routes", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Members Only Discussion Club");
  await page.getByLabel("Description").fill("Discussion stays inside the club.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+(?:\?|$)/i);
  const clubPath = new URL(page.url()).pathname;

  await addFixtureBookToClub(page, "Members Only Discussion Club");

  await page.goto(clubPath);
  await openFixtureBookCardDetails(page);
  await page.getByRole("link", { name: "Discussion" }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/books\/[0-9a-f-]+(?:\?|$)/i);
  const discussionUrl = page.url();

  await submitThreadFromModal(page, {
    title: "Locked chapter talk",
    body: "Only members should see this thread.",
  });
  await expect(page.getByRole("link", { name: "Locked chapter talk" })).toBeVisible();
  await page.getByRole("link", { name: "Locked chapter talk" }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/threads\/[0-9a-f-]+(?:\?|$)/i);
  const threadUrl = page.url();

  await signInAs(page, "stranger", "/clubs");

  const discussionResponse = await page.goto(discussionUrl);
  expect(discussionResponse?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();

  const threadResponse = await page.goto(threadUrl);
  expect(threadResponse?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
});
