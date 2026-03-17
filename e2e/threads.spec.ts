import { expect, test, type APIRequestContext } from "@playwright/test";

import { resetApp, signInAs } from "./helpers/auth";

const CLUB_BOARD_URL_PATTERN = /\/clubs\/[0-9a-f-]+\/board(?:\?|$)/i;
const discussionPathPattern = /^\/clubs\/([^/]+)\/books\/([^/]+)$/i;
const threadPathPattern = /^\/clubs\/([^/]+)\/threads\/([^/]+)$/i;

function parseDiscussionPath(pathname: string) {
  const match = pathname.match(discussionPathPattern);
  if (!match) {
    throw new Error(`Expected a discussion path, received ${pathname}.`);
  }

  return {
    clubId: match[1]!,
    clubBookId: match[2]!,
  };
}

function parseThreadPath(pathname: string) {
  const match = pathname.match(threadPathPattern);
  if (!match) {
    throw new Error(`Expected a thread detail path, received ${pathname}.`);
  }

  return {
    clubId: match[1]!,
    threadId: match[2]!,
  };
}

function postBody(page: import("@playwright/test").Page, text: string) {
  return page.locator("p").filter({ hasText: text }).first();
}

function commentArticle(page: import("@playwright/test").Page, text: string) {
  return postBody(page, text).locator("xpath=ancestor::article[1]");
}

async function expectCommentAnchor(
  page: import("@playwright/test").Page,
  article: import("@playwright/test").Locator,
) {
  const articleId = await article.getAttribute("id");
  expect(articleId).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`#${articleId}$`));
  await expect(page.locator(`#${articleId}`)).toBeInViewport();
  return articleId as string;
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
  await page.getByLabel("Toggle details for The Test-Driven Book Club").click();
}

async function openThreadCard(
  page: import("@playwright/test").Page,
  threadTitle: string,
) {
  await page.getByLabel(`Open thread ${threadTitle}`).click();
}

async function openManagePage(page: import("@playwright/test").Page) {
  await page.getByRole("link", { name: "Manage" }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\/members(?:\?|$)/i);
}

async function openManageTab(
  page: import("@playwright/test").Page,
  tabName: "Members" | "Reading board" | "Invite",
) {
  await page.getByRole("link", { name: tabName, exact: true }).click();
}

async function openStartThreadModal(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Start a thread" }).click();
  await expect(
    page.locator('body > [data-modal-root="start-thread"]'),
  ).toBeVisible();
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

async function createDiscussionThreads(
  request: APIRequestContext,
  page: import("@playwright/test").Page,
  count: number,
  prefix: string,
) {
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/books\/[0-9a-f-]+(?:\?|$)/i);
  const { clubId, clubBookId } = parseDiscussionPath(new URL(page.url()).pathname);
  const response = await request.post("/api/test/threads", {
    data: {
      kind: "threads",
      clubId,
      clubBookId,
      count,
      prefix,
      user: "owner",
    },
  });
  expect(response.ok()).toBeTruthy();

  await page.reload();
  await expect(
    page.getByLabel(`Open thread ${prefix} ${String(count).padStart(2, "0")}`),
  ).toBeVisible();
}

async function createTopLevelComments(
  request: APIRequestContext,
  page: import("@playwright/test").Page,
  count: number,
  prefix: string,
) {
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/threads\/[0-9a-f-]+(?:\?|$)/i);
  const { clubId, threadId } = parseThreadPath(new URL(page.url()).pathname);
  const response = await request.post("/api/test/threads", {
    data: {
      kind: "posts",
      clubId,
      threadId,
      count,
      prefix,
      user: "member",
    },
  });
  expect(response.ok()).toBeTruthy();
}

async function expectNoClassicDiscussionPagination(
  page: import("@playwright/test").Page,
) {
  await expect(page.getByRole("link", { name: "Previous" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Next" })).toHaveCount(0);
  await expect(page.getByText(/Page \d+ of \d+/)).toHaveCount(0);
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

  await expect(page).toHaveURL(CLUB_BOARD_URL_PATTERN);
  const clubBoardPath = new URL(page.url()).pathname;

  await addFixtureBookToClub(page, "Discussion Launch Club");

  await page.goto(clubBoardPath);
  await openFixtureBookCardDetails(page);
  await page.getByRole("link", { name: "Discussion" }).click();

  await expect(
    page.getByRole("heading", { name: "Discussion threads" }),
  ).toBeVisible();
  await expect(page.getByText("No threads yet.")).toBeVisible();
  const openedDialog = await openStartThreadModal(page);
  await openedDialog
    .getByRole("button", { name: "Close start-thread modal" })
    .click();
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
    page.getByLabel("Open thread Chapter one reactions"),
  ).toBeVisible();

  await openThreadCard(page, "Chapter one reactions");
  await expect(
    page.getByRole("heading", { name: "Chapter one reactions" }),
  ).toBeVisible();
  await expect(page.getByText("No comments yet.")).toBeVisible();
});

test("members can create one-depth replies while authors retain edit and delete control", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Post Lifecycle Club");
  await page.getByLabel("Description").fill("Used for post lifecycle checks.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_BOARD_URL_PATTERN);
  const clubBoardPath = new URL(page.url()).pathname;

  await addFixtureBookToClub(page, "Post Lifecycle Club");

  await page.goto(clubBoardPath);
  await openFixtureBookCardDetails(page);
  await page.getByRole("link", { name: "Discussion" }).click();
  await submitThreadFromModal(page, {
    title: "Post lifecycle thread",
    body: "Owner starts the thread.",
  });

  await expect(
    page.getByLabel("Open thread Post lifecycle thread"),
  ).toBeVisible();
  await openThreadCard(page, "Post lifecycle thread");
  await expect(page).toHaveURL(
    /\/clubs\/[0-9a-f-]+\/threads\/[0-9a-f-]+(?:\?|$)/i,
  );
  await expect(
    page.getByRole("heading", { name: "Post lifecycle thread" }),
  ).toBeVisible();
  const threadUrl = page.url();

  await signInAs(page, "member", clubBoardPath);
  await page.getByRole("button", { name: "Join club" }).click();
  await expect(page.getByText("You joined the club.")).toBeVisible();

  await page.goto(threadUrl);
  await expect(page.getByText("Add a reply")).toHaveCount(0);
  await expect(
    page.getByText(
      "Keep the discussion moving with questions, reactions, and notes.",
    ),
  ).toHaveCount(0);
  await page.getByLabel("Reply body").fill("My first reaction.");
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.getByText("Post created.")).toBeVisible();
  await expect(postBody(page, "My first reaction.")).toBeVisible();
  const topLevelComment = commentArticle(page, "My first reaction.");
  const topLevelCommentId = await topLevelComment.getAttribute("id");
  expect(topLevelCommentId).toBeTruthy();
  await expect(topLevelComment.getByTestId("thread-post-meta")).toContainText(
    "Member Reader",
  );

  await topLevelComment.getByRole("button", { name: "Edit post" }).click();
  await topLevelComment.getByLabel("Edit reply").fill("My updated reaction.");
  await topLevelComment.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Post updated.")).toBeVisible();
  const updatedTopLevelComment = page.locator(`#${topLevelCommentId}`);
  await expect(updatedTopLevelComment).toContainText("My updated reaction.");
  await expectCommentAnchor(page, updatedTopLevelComment);
  await expect(updatedTopLevelComment.getByTestId("thread-post-meta")).toContainText(
    "edited",
  );

  await updatedTopLevelComment
    .getByRole("button", { name: "Reply to Member Reader" })
    .click();
  const firstReplyComposer = updatedTopLevelComment.getByRole("textbox", {
    name: "Reply to Member Reader",
  });
  await firstReplyComposer.fill("Nested reply one.");
  await firstReplyComposer
    .locator("xpath=ancestor::form[1]")
    .getByRole("button", { name: "Post" })
    .click();
  await expect(page.getByText("Post created.")).toBeVisible();
  await expect(
    updatedTopLevelComment.locator("span.font-medium").filter({ hasText: "1 reply" }),
  ).toBeVisible();
  await expect(
    updatedTopLevelComment.getByRole("button", { name: "Hide 1 reply" }),
  ).toBeVisible();
  await expect(postBody(page, "Nested reply one.")).toBeVisible();

  const firstReplyComment = commentArticle(page, "Nested reply one.");
  const firstReplyCommentId = await firstReplyComment.getAttribute("id");
  expect(firstReplyCommentId).toBeTruthy();
  await expect(
    firstReplyComment.getByRole("button", { name: /Reply/i }),
  ).toHaveCount(0);
  await expect(
    firstReplyComment.getByRole("button", { name: /^(Show|Hide) \d+ repl/i }),
  ).toHaveCount(0);

  const freshThreadPage = await page.context().newPage();
  await signInAs(freshThreadPage, "member", threadUrl);
  const freshTopLevelComment = freshThreadPage.locator(`#${topLevelCommentId}`);
  await expect(
    freshTopLevelComment.getByRole("button", { name: "Show 1 reply" }),
  ).toBeVisible();
  await expect(freshThreadPage.locator(`#${firstReplyCommentId}`)).toBeHidden();
  await freshThreadPage.close();

  await page.reload();
  await expect(updatedTopLevelComment.getByRole("button", { name: "Hide 1 reply" })).toBeVisible();
  await expect(page.locator(`#${firstReplyCommentId}`)).toBeVisible();

  await updatedTopLevelComment
    .getByRole("button", { name: "Hide 1 reply" })
    .click();
  await expect(page.locator(`#${firstReplyCommentId}`)).toBeHidden();
  await page.reload();
  await expect(updatedTopLevelComment.getByRole("button", { name: "Show 1 reply" })).toBeVisible();
  await expect(page.locator(`#${firstReplyCommentId}`)).toBeHidden();

  await page.goto(`${threadUrl}#${firstReplyCommentId}`);
  await expect(updatedTopLevelComment.getByRole("button", { name: "Hide 1 reply" })).toBeVisible();
  await expect(page.locator(`#${firstReplyCommentId}`)).toBeVisible();

  await page.goto(threadUrl);
  await expect(updatedTopLevelComment.getByRole("button", { name: "Show 1 reply" })).toBeVisible();
  await expect(page.locator(`#${firstReplyCommentId}`)).toBeHidden();

  await updatedTopLevelComment
    .getByRole("button", { name: "Reply to Member Reader" })
    .click();
  await expect(updatedTopLevelComment.getByRole("button", { name: "Hide 1 reply" })).toBeVisible();
  await expect(updatedTopLevelComment.getByRole("textbox", {
    name: "Reply to Member Reader",
  })).toBeVisible();
  await expect(page.locator(`#${firstReplyCommentId}`)).toBeVisible();

  await page.locator(`#${firstReplyCommentId}`).getByRole("button", { name: "Edit post" }).click();
  await page.locator(`#${firstReplyCommentId}`).getByLabel("Edit reply").fill("Nested reply updated.");
  await page.locator(`#${firstReplyCommentId}`).getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Post updated.")).toBeVisible();
  const updatedReplyComment = page.locator(`#${firstReplyCommentId}`);
  await expect(updatedReplyComment).toContainText("Nested reply updated.");
  await expectCommentAnchor(page, updatedReplyComment);
  await expect(updatedReplyComment.getByTestId("thread-post-meta")).toContainText(
    "edited",
  );

  await updatedTopLevelComment
    .getByRole("button", { name: "Reply to Member Reader" })
    .click();
  const secondReplyComposer = updatedTopLevelComment.getByRole("textbox", {
    name: "Reply to Member Reader",
  });
  await secondReplyComposer.fill("Still here reply.");
  await secondReplyComposer
    .locator("xpath=ancestor::form[1]")
    .getByRole("button", { name: "Post" })
    .click();
  await expect(page.getByText("Post created.")).toBeVisible();
  await expect(
    updatedTopLevelComment.locator("span.font-medium").filter({ hasText: "2 replies" }),
  ).toBeVisible();
  await expect(
    updatedTopLevelComment.getByRole("button", { name: "Hide 2 replies" }),
  ).toBeVisible();
  await expect(postBody(page, "Still here reply.")).toBeVisible();

  await signInAs(page, "owner", threadUrl);
  await expect(page.getByRole("button", { name: "Delete post" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Edit post" })).toHaveCount(0);
  await expect(postBody(page, "My updated reaction.")).toBeVisible();
  await expect(postBody(page, "Still here reply.")).toBeVisible();

  await signInAs(page, "member", threadUrl);
  await page
    .locator(`#${firstReplyCommentId}`)
    .getByRole("button", { name: "Delete post" })
    .click();
  await expect(page.getByText("Post deleted.")).toBeVisible();
  const deletedReplyComment = page.locator(`#${firstReplyCommentId}`);
  await expect(deletedReplyComment.getByTestId("thread-post-meta")).toContainText(
    "[deleted]",
  );
  await expectCommentAnchor(page, deletedReplyComment);

  await page
    .locator(`#${topLevelCommentId}`)
    .getByRole("button", { name: "Delete post" })
    .first()
    .click();
  await expect(page.getByText("Post deleted.")).toBeVisible();
  const deletedTopLevelComment = page.locator(`#${topLevelCommentId}`);
  await expect(deletedTopLevelComment).toContainText("This post was deleted.");
  await expect(
    deletedTopLevelComment.getByTestId("thread-post-meta").first(),
  ).toContainText("[deleted]");
  await expectCommentAnchor(page, deletedTopLevelComment);
  const deletedParentReplyToggle = deletedTopLevelComment.getByRole("button", {
    name: /^(Show|Hide) 2 replies$/,
  });
  await expect(deletedParentReplyToggle).toBeVisible();
  if (!(await postBody(page, "Still here reply.").isVisible())) {
    await deletedTopLevelComment.getByRole("button", { name: "Show 2 replies" }).click();
    await expect(postBody(page, "Still here reply.")).toBeVisible();
  }
  await deletedTopLevelComment.getByRole("button", { name: "Hide 2 replies" }).click();
  await expect(postBody(page, "Still here reply.")).toBeHidden();
  await page.reload();
  await expect(deletedTopLevelComment.getByRole("button", { name: "Show 2 replies" })).toBeVisible();
  await expect(postBody(page, "Still here reply.")).toBeHidden();
  await deletedTopLevelComment.getByRole("button", { name: "Show 2 replies" }).click();
  await expect(postBody(page, "Still here reply.")).toBeVisible();
  await expect(
    commentArticle(page, "Still here reply.").getByRole("button", { name: /Reply/i }),
  ).toHaveCount(0);
});

test("club admins can pin a thread and move it ahead of newer threads", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Pin Ordering Club");
  await page.getByLabel("Description").fill("Used for pin ordering checks.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_BOARD_URL_PATTERN);
  const clubBoardPath = new URL(page.url()).pathname;

  await addFixtureBookToClub(page, "Pin Ordering Club");

  await page.goto(clubBoardPath);
  await openFixtureBookCardDetails(page);
  await page.getByRole("link", { name: "Discussion" }).click();

  await submitThreadFromModal(page, {
    title: "Earlier thread",
    body: "Created first.",
  });
  await expect(page.getByLabel("Open thread Earlier thread")).toBeVisible();

  await submitThreadFromModal(page, {
    title: "Later thread",
    body: "Created second.",
  });
  await expect(page.getByLabel("Open thread Later thread")).toBeVisible();

  await page
    .getByLabel("Open thread Earlier thread")
    .locator("xpath=..")
    .getByRole("button", { name: "Pin" })
    .click();
  await expect(page.getByText("Thread pinned.")).toBeVisible();

  await expect(page.getByLabel("Open thread Earlier thread")).toBeVisible();
  await expect(page.getByLabel("Open thread Later thread")).toBeVisible();
  await expect(page.locator("h3").nth(0)).toHaveText("Earlier thread");
  await expect(page.locator("h3").nth(1)).toHaveText("Later thread");
  await page.getByRole("button", { name: "Unpin" }).first().click();
  await expect(page.getByText("Thread unpinned.")).toBeVisible();
});

test("discussion lists infinite-load older threads and restore later thread actions", async ({
  page,
  request,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Infinite Thread Club");
  await page.getByLabel("Description").fill("Used for infinite thread list coverage.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_BOARD_URL_PATTERN);
  const clubBoardPath = new URL(page.url()).pathname;

  await addFixtureBookToClub(page, "Infinite Thread Club");

  await page.goto(clubBoardPath);
  await openFixtureBookCardDetails(page);
  await page.getByRole("link", { name: "Discussion" }).click();

  await createDiscussionThreads(request, page, 21, "Infinite thread");
  await expectNoClassicDiscussionPagination(page);
  await expect(page.getByRole("button", { name: "Load more" })).toBeVisible();
  await expect(page.getByLabel("Open thread Infinite thread 01")).toHaveCount(0);

  await page.getByRole("button", { name: "Load more" }).scrollIntoViewIfNeeded();
  await expect(page.getByLabel("Open thread Infinite thread 01")).toBeVisible();

  const oldestThreadCard = page
    .getByLabel("Open thread Infinite thread 01")
    .locator("xpath=..");
  await oldestThreadCard.getByRole("button", { name: "Pin" }).click();
  await expect(page.getByText("Thread pinned.")).toBeVisible();
  await expect(page.getByLabel("Open thread Infinite thread 01")).toBeVisible();
  await expect(page.locator("h3").nth(0)).toHaveText("Infinite thread 01");
  await expect(page).not.toHaveURL(/after=|focusThreadId=/);

  await page.getByRole("button", { name: "Unpin" }).first().click();
  await expect(page.getByText("Thread unpinned.")).toBeVisible();
  await expect(page.getByLabel("Open thread Infinite thread 01")).toBeVisible();
  await expect(page).not.toHaveURL(/after=|focusThreadId=/);
});

test("archived club books keep discussion readable but disable new thread creation", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Archived Discussion Club");
  await page
    .getByLabel("Description")
    .fill("Used for archived discussion coverage.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_BOARD_URL_PATTERN);
  const clubBoardPath = new URL(page.url()).pathname;

  await addFixtureBookToClub(page, "Archived Discussion Club");

  await page.goto(clubBoardPath);
  await openFixtureBookCardDetails(page);
  await page.getByRole("link", { name: "Discussion" }).click();
  await expect(page).toHaveURL(
    /\/clubs\/[0-9a-f-]+\/books\/[0-9a-f-]+(?:\?|$)/i,
  );
  const discussionUrl = page.url();

  await submitThreadFromModal(page, {
    title: "Archived thread",
    body: "This thread should survive archive.",
  });
  await expect(page.getByLabel("Open thread Archived thread")).toBeVisible();

  await page.goto(clubBoardPath);
  await openManagePage(page);
  await openManageTab(page, "Reading board");
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\/board(?:\?|$)/i);
  await openFixtureBookCardDetails(page);
  await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Book removed.")).toBeVisible();
  await expect(page).toHaveURL(
    /\/clubs\/[0-9a-f-]+\/manage\/board\?message=/i,
  );

  await page.goto(discussionUrl);
  await expect(page.getByText("Archived book")).toBeVisible();
  await expect(
    page.getByText("This club book has been archived."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start a thread" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Open thread Archived thread")).toBeVisible();
});

test("club admins can delete threads while members cannot", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Thread Moderation UI Club");
  await page
    .getByLabel("Description")
    .fill("Used for thread deletion coverage.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_BOARD_URL_PATTERN);
  const clubBoardPath = new URL(page.url()).pathname;

  await addFixtureBookToClub(page, "Thread Moderation UI Club");

  await page.goto(clubBoardPath);
  await openFixtureBookCardDetails(page);
  await page.getByRole("link", { name: "Discussion" }).click();

  await submitThreadFromModal(page, {
    title: "Delete me",
    body: "This thread should be removable.",
  });
  await openThreadCard(page, "Delete me");
  await expect(page).toHaveURL(
    /\/clubs\/[0-9a-f-]+\/threads\/[0-9a-f-]+(?:\?|$)/i,
  );
  const threadUrl = page.url();

  await signInAs(page, "member", clubBoardPath);
  await page.getByRole("button", { name: "Join club" }).click();
  await expect(page.getByText("You joined the club.")).toBeVisible();
  await page.goto(threadUrl);
  await expect(page.getByRole("button", { name: "Delete thread" })).toHaveCount(
    0,
  );

  await signInAs(page, "owner", threadUrl);
  await page.getByRole("button", { name: "Delete thread" }).click();
  await expect(page).toHaveURL(
    /\/clubs\/[0-9a-f-]+\/books\/[0-9a-f-]+(?:\?|$)/i,
  );
  await expect(page.getByText("Thread deleted.")).toBeVisible();
  await expect(page.getByLabel("Open thread Delete me")).toHaveCount(0);
});

test("thread comments infinite-load older batches and preserve long-feed mutations", async ({
  page,
  request,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Infinite Comment Club");
  await page
    .getByLabel("Description")
    .fill("Used for infinite thread comment coverage.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_BOARD_URL_PATTERN);
  const clubBoardPath = new URL(page.url()).pathname;

  await addFixtureBookToClub(page, "Infinite Comment Club");

  await page.goto(clubBoardPath);
  await openFixtureBookCardDetails(page);
  await page.getByRole("link", { name: "Discussion" }).click();
  await submitThreadFromModal(page, {
    title: "Infinite comments thread",
    body: "Long-running discussion.",
  });
  await openThreadCard(page, "Infinite comments thread");
  await expect(page).toHaveURL(
    /\/clubs\/[0-9a-f-]+\/threads\/[0-9a-f-]+(?:\?|$)/i,
  );
  const threadUrl = page.url();

  await signInAs(page, "member", clubBoardPath);
  await page.getByRole("button", { name: "Join club" }).click();
  await expect(page.getByText("You joined the club.")).toBeVisible();

  await page.goto(threadUrl);
  await createTopLevelComments(request, page, 21, "Long comment");
  await page.goto(threadUrl);
  await expectNoClassicDiscussionPagination(page);
  await expect(page.getByRole("button", { name: "Load more" })).toBeVisible();
  await expect(postBody(page, "Long comment 21")).toHaveCount(0);

  await page.getByRole("button", { name: "Load more" }).scrollIntoViewIfNeeded();
  await expect(postBody(page, "Long comment 21")).toBeVisible();

  const laterComment = commentArticle(page, "Long comment 21");
  await laterComment.getByRole("button", { name: "Edit post" }).click();
  await laterComment.getByLabel("Edit reply").fill("Long comment 21 updated");
  await laterComment.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Post updated.")).toBeVisible();
  await expect(postBody(page, "Long comment 21 updated")).toBeVisible();
  await expect(page).not.toHaveURL(/after=|focusPostId=/);

  await commentArticle(page, "Long comment 21 updated")
    .getByRole("button", { name: "Delete post" })
    .click();
  await expect(page.getByText("Post deleted.")).toBeVisible();
  await expect(commentArticle(page, "This post was deleted.")).toContainText(
    "This post was deleted.",
  );
  await expect(page).not.toHaveURL(/after=|focusPostId=/);

  await page.goto(threadUrl);
  await page.getByLabel("Reply body").fill("Newest long comment");
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.getByText("Post created.")).toBeVisible();
  await expect(postBody(page, "Newest long comment")).toBeVisible();
  await expect(page).not.toHaveURL(/after=|focusPostId=/);
});

test("non-members see forbidden pages for discussion and thread routes", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Members Only Discussion Club");
  await page
    .getByLabel("Description")
    .fill("Discussion stays inside the club.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_BOARD_URL_PATTERN);
  const clubBoardPath = new URL(page.url()).pathname;

  await addFixtureBookToClub(page, "Members Only Discussion Club");

  await page.goto(clubBoardPath);
  await openFixtureBookCardDetails(page);
  await page.getByRole("link", { name: "Discussion" }).click();
  await expect(page).toHaveURL(
    /\/clubs\/[0-9a-f-]+\/books\/[0-9a-f-]+(?:\?|$)/i,
  );
  const discussionUrl = page.url();

  await submitThreadFromModal(page, {
    title: "Locked chapter talk",
    body: "Only members should see this thread.",
  });
  await expect(
    page.getByLabel("Open thread Locked chapter talk"),
  ).toBeVisible();
  await openThreadCard(page, "Locked chapter talk");
  await expect(page).toHaveURL(
    /\/clubs\/[0-9a-f-]+\/threads\/[0-9a-f-]+(?:\?|$)/i,
  );
  const threadUrl = page.url();

  await signInAs(page, "stranger", "/clubs");

  const discussionResponse = await page.goto(discussionUrl);
  expect(discussionResponse?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();

  const threadResponse = await page.goto(threadUrl);
  expect(threadResponse?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
});
