import { expect, test } from "@playwright/test";

import { resetApp, signInAs } from "./helpers/auth";

const CLUB_BOOK_URL = "/books/club-test-book";
const CLUB_DETAIL_URL_PATTERN = /\/clubs\/[0-9a-f-]+(?:\?|$)/i;

test.beforeEach(async ({ request }) => {
  await resetApp(request);
});

async function addFixtureBookToClub(page: import("@playwright/test").Page, clubName: string) {
  await page.goto(CLUB_BOOK_URL);
  await page.getByRole("button", { name: "Add Book" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(clubName).check();
  await dialog.getByRole("button", { name: "Add Book" }).click();
  await expect(page.getByText("Book added to 1 club.")).toBeVisible();
}

async function openFixtureBookCardDetails(page: import("@playwright/test").Page) {
  await page
    .getByLabel("Toggle details for The Test-Driven Book Club")
    .click();
}

async function openMembersTab(page: import("@playwright/test").Page) {
  await page.getByRole("link", { name: /^Members$/ }).click();
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

test("user can create a public club and another user can join it", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Weekend Readers");
  await page.getByLabel("Description").fill("A public club for weekend reading.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(page.getByRole("heading", { name: "Weekend Readers" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Manage" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to clubs" })).toHaveCount(0);

  await signInAs(page, "member", "/clubs");
  await expect(page.getByRole("heading", { name: "Discover Public Clubs" })).toBeVisible();
  await expect(page.getByText("Weekend Readers")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open club" })).toHaveCount(0);
  await page.getByRole("link", { name: "Open Weekend Readers" }).click();
  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(page.getByRole("link", { name: /^Reading board$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Members$/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Manage" })).toHaveCount(0);

  await page.goto("/clubs");
  await page.getByRole("button", { name: "Join club" }).click();

  await expect(page.getByText("You joined the club.")).toBeVisible();
  await page.getByRole("link", { name: "Open Weekend Readers" }).click();
  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(page.getByRole("button", { name: "Leave club" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Manage" })).toHaveCount(0);
  await openMembersTab(page);
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\?tab=members/i);
  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
  await expect(page.getByText("Owner Reader")).toBeVisible();
  await expect(page.getByText("Member Reader")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add admin" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Kick out" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete club" })).toHaveCount(0);
});

test("club creation is throttled per user after the configured limit", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("First Limited Club");
  await page.getByLabel("Description").fill("Initial club creation succeeds.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(page.getByRole("heading", { name: "First Limited Club" })).toBeVisible();

  await page.goto("/clubs/new");
  await page.getByLabel("Name").fill("Second Limited Club");
  await page.getByLabel("Description").fill("Second allowed creation.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(page.getByRole("heading", { name: "Second Limited Club" })).toBeVisible();

  await page.goto("/clubs/new");
  await page.getByLabel("Name").fill("Third Limited Club");
  await page.getByLabel("Description").fill("This request should be throttled.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(/\/clubs\/new\?error=/);
  await expect(
    page.getByText("You're creating clubs too quickly."),
  ).toBeVisible();
});

test("private invite can be created and accepted by the matching user", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Private Circle");
  await page.getByLabel("Description").fill("Invitation only");
  await page.getByLabel("Visibility").selectOption("PRIVATE");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await openManagePage(page);
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage(?:\?|$)/i);
  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Invite", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Reading board management" }),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Private invites" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Danger zone" })).toBeVisible();
  await openManageTab(page, "Invite");
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\?tab=invite/i);
  await expect(page.getByRole("heading", { name: "Members" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Private invites" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Danger zone" })).toBeVisible();
  await page.getByLabel("Email").fill("member@book-by-book.test");
  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\?tab=invite&message=/i);

  const inviteField = page.getByLabel("Most recent invite link");
  await expect(inviteField).toBeVisible();
  const inviteLink = await inviteField.inputValue();

  await signInAs(page, "member", "/clubs");
  await page.goto(inviteLink);

  await expect(page.getByRole("heading", { name: "Club invitation" })).toBeVisible();
  await page.getByRole("button", { name: "Accept invitation" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(page.getByText("Invitation accepted.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Leave club" })).toBeVisible();
  await openMembersTab(page);
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\?tab=members/i);
  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
});

test("members and non-members cannot access the manage page", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Invite Guard Club");
  await page.getByLabel("Description").fill("Admin access should stay restricted.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(
    page.getByRole("heading", { name: "Invite Guard Club" }),
  ).toBeVisible();
  const clubPath = new URL(page.url()).pathname;
  const manageUrl = `${clubPath}/manage`;

  await signInAs(page, "member", "/clubs");
  await page.goto(clubPath);

  await page.getByRole("button", { name: "Join club" }).click();
  await expect(page.getByText("You joined the club.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Manage" })).toHaveCount(0);

  const response = await page.goto(manageUrl);
  expect(response?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();

  await signInAs(page, "stranger", "/clubs");
  const outsiderResponse = await page.goto(manageUrl);
  expect(outsiderResponse?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
});

test("private clubs stay out of discovery for non-members", async ({ page }) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Stealth Readers");
  await page.getByLabel("Description").fill("This club should stay private.");
  await page.getByLabel("Visibility").selectOption("PRIVATE");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  const clubPath = new URL(page.url()).pathname;
  await openManagePage(page);
  await expect(page.getByRole("link", { name: "Invite", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Private invites" })).toHaveCount(0);

  await signInAs(page, "stranger", "/clubs");
  await expect(page.getByRole("heading", { name: "Discover Public Clubs" })).toBeVisible();
  await expect(page.getByText("Stealth Readers")).toHaveCount(0);

  const response = await page.goto(clubPath);
  expect(response?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
});

test("member can leave a public club and see it in discovery again", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Drop-In Readers");
  await page.getByLabel("Description").fill("Members can come and go.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  const clubPath = new URL(page.url()).pathname;

  await signInAs(page, "member", clubPath);
  await page.getByRole("button", { name: "Join club" }).click();
  await expect(page.getByText("You joined the club.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Leave club" })).toBeVisible();

  await page.getByRole("button", { name: "Leave club" }).click();
  await expect(page).toHaveURL(/\/clubs\?message=/);
  await expect(page.getByText("You left the club.")).toBeVisible();
  await expect(page.getByText("Drop-In Readers")).toBeVisible();
  await expect(page.getByRole("button", { name: "Join club" })).toBeVisible();
});

test("owner can promote a member, transfer ownership, and then leave", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Relay Readers");
  await page.getByLabel("Description").fill("Ownership can pass to another admin.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  const clubPath = new URL(page.url()).pathname;
  await expect(page.getByRole("button", { name: "Leave club" })).toHaveCount(0);

  await signInAs(page, "member", clubPath);
  await page.getByRole("button", { name: "Join club" }).click();
  await expect(page.getByText("You joined the club.")).toBeVisible();

  await signInAs(page, "owner", clubPath);
  await openManagePage(page);
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage(?:\?|$)/i);
  await expect(page.getByRole("link", { name: "Invite", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Danger zone" })).toBeVisible();
  await page.getByRole("button", { name: "Add admin for Member Reader" }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\?tab=members&message=/i);
  await expect(page.getByText("Member role updated.")).toBeVisible();
  await page.getByRole("link", { name: /^Admins 1$/ }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\?tab=members&role=ADMIN/i);
  await expect(page.getByText("Member Reader")).toBeVisible();
  await expect(page.getByText("Owner Reader")).toHaveCount(0);

  await page
    .getByRole("button", { name: "Hand over owner to Member Reader" })
    .click();
  await expect(page.getByText("Ownership transferred.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Danger zone" })).toHaveCount(0);

  await page.goto(clubPath);
  await expect(page.getByRole("button", { name: "Leave club" })).toBeVisible();

  await page.getByRole("button", { name: "Leave club" }).click();
  await expect(page).toHaveURL(/\/clubs\?message=/);
  await expect(page.getByText("You left the club.")).toBeVisible();

  await signInAs(page, "member", clubPath);
  await expect(page.getByRole("button", { name: "Leave club" })).toHaveCount(0);
  await openManagePage(page);
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage(?:\?|$)/i);
  await expect(page.getByRole("button", { name: "Delete club" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Leave club" })).toHaveCount(0);
});

test("owner and admins can both use Add admin from the manage page", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Admin Ladder Club");
  await page.getByLabel("Description").fill("Used for admin promotion checks.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  const clubPath = new URL(page.url()).pathname;

  await signInAs(page, "member", clubPath);
  await page.getByRole("button", { name: "Join club" }).click();
  await expect(page.getByText("You joined the club.")).toBeVisible();

  await signInAs(page, "stranger", clubPath);
  await page.getByRole("button", { name: "Join club" }).click();
  await expect(page.getByText("You joined the club.")).toBeVisible();

  await signInAs(page, "owner", clubPath);
  await openManagePage(page);
  await expect(page.getByRole("link", { name: "Invite", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Danger zone" })).toBeVisible();
  await page.getByRole("button", { name: "Add admin for Member Reader" }).click();
  await expect(page.getByText("Member role updated.")).toBeVisible();

  await signInAs(page, "member", clubPath);
  await expect(page.getByRole("link", { name: "Manage" })).toBeVisible();
  await openManagePage(page);
  await expect(page.getByRole("heading", { name: "Danger zone" })).toHaveCount(0);
  await openManageTab(page, "Reading board");
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\?tab=board/i);
  await expect(page.getByRole("heading", { name: "Danger zone" })).toHaveCount(0);
  await openManageTab(page, "Members");
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\?tab=members/i);
  await page.getByRole("link", { name: /^Members 1$/ }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\?tab=members&role=MEMBER/i);
  await page.getByRole("button", { name: "Add admin for Stranger Reader" }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\?tab=members&role=MEMBER&message=/i);
  await expect(page.getByText("Member role updated.")).toBeVisible();
  await page.getByRole("link", { name: /^Admins 2$/ }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\?tab=members&role=ADMIN/i);
  await expect(page.getByText("Stranger Reader")).toBeVisible();
});

test("owner can delete a club from the manage page after confirming", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Closing Chapter Club");
  await page.getByLabel("Description").fill("This club will be deleted.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await openManagePage(page);
  await expect(page.getByRole("heading", { name: "Danger zone" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete club" })).toBeVisible();

  await page.getByRole("button", { name: "Delete club" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Yes, delete club" }).click();
  await expect(page).toHaveURL(/\/clubs\?message=/);
  await expect(page.getByText("Club deleted.")).toBeVisible();
  await expect(page.getByText("Closing Chapter Club")).toHaveCount(0);
});

test("club admin can add, move, and remove a book in section management", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Section Operators");
  await page.getByLabel("Description").fill("Used for section transitions.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(
    page.getByRole("heading", { name: "Section Operators" }),
  ).toBeVisible();
  const clubUrl = page.url();

  await addFixtureBookToClub(page, "Section Operators");

  await page.goto(clubUrl);
  await expect(page.getByText("The Test-Driven Book Club")).toBeVisible();
  await expect(page.getByRole("link", { name: "Book details" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Want to Read" }),
  ).toBeVisible();

  await openFixtureBookCardDetails(page);
  await expect(page.getByRole("link", { name: "Book details" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Discussion" })).toBeVisible();
  await expect(page.locator('select[name="status"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Move" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);

  await openManagePage(page);
  await openManageTab(page, "Reading board");
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\?tab=board/i);
  await expect(page.getByRole("heading", { name: "Private invites" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Reading board management" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Members" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Danger zone" })).toBeVisible();
  await openFixtureBookCardDetails(page);
  await page.locator('select[name="status"]').first().selectOption("READING");
  await page.getByRole("button", { name: "Move" }).first().click();
  await expect(page.getByText("Book moved.")).toBeVisible();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\?tab=board&message=/i);

  await expect(
    page.getByRole("heading", { name: "Reading", exact: true }),
  ).toBeVisible();
  await openFixtureBookCardDetails(page);
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Book removed.")).toBeVisible();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\?tab=board&message=/i);
  await expect(page.getByText("No books in this section yet.")).toHaveCount(3);
});
