import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures/test";
import {
  E2E_ROUTE_PATHS,
  E2E_TAB_LABELS,
  E2E_URL_PATTERNS,
} from "./helpers/constants";
import { resetApp, signInAs } from "./helpers/auth";

const CLUB_BOOK_URL = E2E_ROUTE_PATHS.fixtureBook;
const CLUB_DETAIL_URL_PATTERN = E2E_URL_PATTERNS.clubBoard;

function clubBoardPathFromUrl(url: string) {
  return new URL(url).pathname;
}

function clubRootPathFromUrl(url: string) {
  return clubBoardPathFromUrl(url).replace(/\/(board|members)$/, "");
}

function clubManageMembersPathFromUrl(url: string) {
  return `${clubRootPathFromUrl(url)}/manage/members`;
}

test.beforeEach(async ({ request }) => {
  await resetApp(request);
});

async function addFixtureBookToClub(page: Page, clubName: string) {
  await page.goto(CLUB_BOOK_URL);
  await page.getByRole("button", { name: "Add Book" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(clubName).check();
  await dialog.getByRole("button", { name: "Add to clubs" }).click();
  await expect(page.getByText("Book added to 1 club.")).toBeVisible();
}

async function openFixtureBookCardDetails(page: Page) {
  await page
    .getByLabel("Toggle details for The Test-Driven Book Club")
    .click();
}

async function openMembersTab(page: Page) {
  await page.getByRole("link", { name: new RegExp(`^${E2E_TAB_LABELS.members}$`) }).click();
}

async function openManagePage(page: Page) {
  const manageLink = page.getByRole("link", { name: E2E_TAB_LABELS.manage });
  const manageHref = await manageLink.getAttribute("href");
  expect(manageHref).toBeTruthy();
  await page.goto(manageHref!);
  await expect(page).toHaveURL(E2E_URL_PATTERNS.manageMembers);
}

async function openManageTab(
  page: Page,
  tabName:
    | typeof E2E_TAB_LABELS.members
    | typeof E2E_TAB_LABELS.readingBoard
    | typeof E2E_TAB_LABELS.invite,
) {
  await page.getByRole("link", { name: tabName, exact: true }).click();
}

test("user can create a public club and another user can join it", async ({
  page,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.clubsNew);

  await page.getByLabel("Name").fill("Weekend Readers");
  await page.getByLabel("Description").fill("A public club for weekend reading.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(page.getByRole("heading", { name: "Weekend Readers" })).toBeVisible();
  await expect(page.getByRole("link", { name: E2E_TAB_LABELS.manage })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to clubs" })).toHaveCount(0);

  await signInAs(page, "member", E2E_ROUTE_PATHS.clubs);
  await expect(page.getByRole("heading", { name: "Discover Public Clubs" })).toBeVisible();
  await expect(page.getByText("Weekend Readers")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open club" })).toHaveCount(0);
  await page.getByRole("link", { name: "Open Weekend Readers" }).click();
  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(page.getByRole("link", { name: /^Reading board$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Members$/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: E2E_TAB_LABELS.manage })).toHaveCount(0);

  await page.goto(E2E_ROUTE_PATHS.clubs);
  await page.getByRole("button", { name: "Join club" }).click();

  await expect(page.getByText("You joined the club.")).toBeVisible();
  await page.getByRole("link", { name: "Open Weekend Readers" }).click();
  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(page.getByRole("button", { name: "Leave club" })).toBeVisible();
  await expect(page.getByRole("link", { name: E2E_TAB_LABELS.manage })).toHaveCount(0);
  await openMembersTab(page);
  await expect(page).toHaveURL(E2E_URL_PATTERNS.clubMembers);
  await expect(page.getByRole("heading", { name: E2E_TAB_LABELS.members })).toBeVisible();
  await expect(page.getByText("owner-reader")).toBeVisible();
  await expect(page.getByText("member-reader")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add admin" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Kick out" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete club" })).toHaveCount(0);
});

test("club creation is throttled per user after the configured limit", async ({
  page,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.clubsNew);

  await page.getByLabel("Name").fill("First Limited Club");
  await page.getByLabel("Description").fill("Initial club creation succeeds.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(page.getByRole("heading", { name: "First Limited Club" })).toBeVisible();

  await page.goto(E2E_ROUTE_PATHS.clubsNew);
  await page.getByLabel("Name").fill("Second Limited Club");
  await page.getByLabel("Description").fill("Second allowed creation.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(page.getByRole("heading", { name: "Second Limited Club" })).toBeVisible();

  await page.goto(E2E_ROUTE_PATHS.clubsNew);
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
  await signInAs(page, "owner", E2E_ROUTE_PATHS.clubsNew);

  await page.getByLabel("Name").fill("Private Circle");
  await page.getByLabel("Description").fill("Invitation only");
  await page.getByLabel("Visibility").selectOption("PRIVATE");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  const managePath = clubManageMembersPathFromUrl(page.url());
  await page.goto(managePath);
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\/members(?:\?|$)/i);
  await expect(page.getByRole("heading", { name: E2E_TAB_LABELS.members })).toBeVisible();
  await expect(page.getByRole("link", { name: E2E_TAB_LABELS.invite, exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Reading board management" }),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Private invites" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Danger zone" })).toBeVisible();
  await openManageTab(page, E2E_TAB_LABELS.invite);
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\/invite(?:\?|$)/i);
  await expect(page.getByRole("heading", { name: E2E_TAB_LABELS.members })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Private invites" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Danger zone" })).toBeVisible();
  await page.getByLabel("Nickname").fill("member-reader");
  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\/invite\?message=/i);
  await expect(page.getByText("member-reader")).toBeVisible();

  const inviteField = page.getByLabel("Most recent invite link");
  await expect(inviteField).toBeVisible();
  const inviteLink = await inviteField.inputValue();

  await signInAs(page, "member", "/clubs");
  await page.goto(inviteLink);

  await expect(page.getByRole("heading", { name: "Club invitation" })).toBeVisible();
  await expect(page.getByText("Signed in as member-reader.")).toBeVisible();
  await page.getByRole("button", { name: "Accept invitation" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(page.getByText("Invitation accepted.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Leave club" })).toBeVisible();
  await openMembersTab(page);
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/members(?:\?|$)/i);
  await expect(page.getByRole("heading", { name: E2E_TAB_LABELS.members })).toBeVisible();
});

test("members and non-members cannot access the manage page", async ({
  page,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.clubsNew);

  await page.getByLabel("Name").fill("Invite Guard Club");
  await page.getByLabel("Description").fill("Admin access should stay restricted.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(
    page.getByRole("heading", { name: "Invite Guard Club" }),
  ).toBeVisible();
  const clubBoardPath = clubBoardPathFromUrl(page.url());
  const manageUrl = clubManageMembersPathFromUrl(page.url());

  await signInAs(page, "member", "/clubs");
  await page.goto(clubBoardPath);

  await page.getByRole("button", { name: "Join club" }).click();
  await expect(page.getByText("You joined the club.")).toBeVisible();
  await expect(page.getByRole("link", { name: E2E_TAB_LABELS.manage })).toHaveCount(0);

  const response = await page.goto(manageUrl);
  expect(response?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();

  await signInAs(page, "stranger", "/clubs");
  const outsiderResponse = await page.goto(manageUrl);
  expect(outsiderResponse?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
});

test("private clubs stay out of discovery for non-members", async ({ page }) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.clubsNew);

  await page.getByLabel("Name").fill("Stealth Readers");
  await page.getByLabel("Description").fill("This club should stay private.");
  await page.getByLabel("Visibility").selectOption("PRIVATE");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  const clubBoardPath = clubBoardPathFromUrl(page.url());
  await openManagePage(page);
  await expect(page.getByRole("link", { name: E2E_TAB_LABELS.invite, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Private invites" })).toHaveCount(0);

  await signInAs(page, "stranger", "/clubs");
  await expect(page.getByRole("heading", { name: "Discover Public Clubs" })).toBeVisible();
  await expect(page.getByText("Stealth Readers")).toHaveCount(0);

  const response = await page.goto(clubBoardPath);
  expect(response?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
});

test("member can leave a public club and see it in discovery again", async ({
  page,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.clubsNew);

  await page.getByLabel("Name").fill("Drop-In Readers");
  await page.getByLabel("Description").fill("Members can come and go.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  const clubBoardPath = clubBoardPathFromUrl(page.url());

  await signInAs(page, "member", clubBoardPath);
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
  await signInAs(page, "owner", E2E_ROUTE_PATHS.clubsNew);

  await page.getByLabel("Name").fill("Relay Readers");
  await page.getByLabel("Description").fill("Ownership can pass to another admin.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  const clubBoardPath = clubBoardPathFromUrl(page.url());
  await expect(page.getByRole("button", { name: "Leave club" })).toHaveCount(0);

  await signInAs(page, "member", clubBoardPath);
  await page.getByRole("button", { name: "Join club" }).click();
  await expect(page.getByText("You joined the club.")).toBeVisible();

  await signInAs(page, "owner", clubBoardPath);
  await openManagePage(page);
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\/members(?:\?|$)/i);
  await expect(page.getByRole("link", { name: E2E_TAB_LABELS.invite, exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Danger zone" })).toBeVisible();
  await page.getByRole("button", { name: "Add admin for member-reader" }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\/members\?message=/i);
  await expect(page.getByText("Member role updated.")).toBeVisible();
  await page.getByRole("link", { name: /^Admins 1$/ }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\/members\?role=ADMIN/i);
  await expect(page.getByText("member-reader")).toBeVisible();
  await expect(page.getByText("owner-reader")).toHaveCount(0);

  await page
    .getByRole("button", { name: "Hand over owner to member-reader" })
    .click();
  await expect(page.getByText("Ownership transferred.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Danger zone" })).toHaveCount(0);

  await page.goto(clubBoardPath);
  await expect(page.getByRole("button", { name: "Leave club" })).toBeVisible();

  await page.getByRole("button", { name: "Leave club" }).click();
  await expect(page).toHaveURL(/\/clubs\?message=/);
  await expect(page.getByText("You left the club.")).toBeVisible();

  await signInAs(page, "member", clubBoardPath);
  await expect(page.getByRole("button", { name: "Leave club" })).toHaveCount(0);
  await openManagePage(page);
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\/members(?:\?|$)/i);
  await expect(page.getByRole("button", { name: "Delete club" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Leave club" })).toHaveCount(0);
});

test("owner and admins can both use Add admin from the manage page", async ({
  page,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.clubsNew);

  await page.getByLabel("Name").fill("Admin Ladder Club");
  await page.getByLabel("Description").fill("Used for admin promotion checks.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  const clubBoardPath = clubBoardPathFromUrl(page.url());

  await signInAs(page, "member", clubBoardPath);
  await page.getByRole("button", { name: "Join club" }).click();
  await expect(page.getByText("You joined the club.")).toBeVisible();

  await signInAs(page, "stranger", clubBoardPath);
  await page.getByRole("button", { name: "Join club" }).click();
  await expect(page.getByText("You joined the club.")).toBeVisible();

  await signInAs(page, "owner", clubBoardPath);
  await openManagePage(page);
  await expect(page.getByRole("link", { name: E2E_TAB_LABELS.invite, exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Danger zone" })).toBeVisible();
  await page.getByRole("button", { name: "Add admin for member-reader" }).click();
  await expect(page.getByText("Member role updated.")).toBeVisible();

  await signInAs(page, "member", clubBoardPath);
  await expect(page.getByRole("link", { name: E2E_TAB_LABELS.manage })).toBeVisible();
  await openManagePage(page);
  await expect(page.getByRole("heading", { name: "Danger zone" })).toHaveCount(0);
  await openManageTab(page, E2E_TAB_LABELS.readingBoard);
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\/board(?:\?|$)/i);
  await expect(page.getByRole("heading", { name: "Danger zone" })).toHaveCount(0);
  await openManageTab(page, E2E_TAB_LABELS.members);
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\/members(?:\?|$)/i);
  await page.getByRole("link", { name: /^Members 1$/ }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\/members\?role=MEMBER/i);
  await page.getByRole("button", { name: "Add admin for stranger-reader" }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\/members\?role=MEMBER&message=/i);
  await expect(page.getByText("Member role updated.")).toBeVisible();
  await page.getByRole("link", { name: /^Admins 2$/ }).click();
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\/members\?role=ADMIN/i);
  await expect(page.getByText("stranger-reader")).toBeVisible();
});

test("owner can delete a club from the manage page after confirming", async ({
  page,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.clubsNew);

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
  await signInAs(page, "owner", E2E_ROUTE_PATHS.clubsNew);

  await page.getByLabel("Name").fill("Section Operators");
  await page.getByLabel("Description").fill("Used for section transitions.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(
    page.getByRole("heading", { name: "Section Operators" }),
  ).toBeVisible();
  const clubBoardPath = clubBoardPathFromUrl(page.url());

  await addFixtureBookToClub(page, "Section Operators");

  await page.goto(clubBoardPath);
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
  await openManageTab(page, E2E_TAB_LABELS.readingBoard);
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\/manage\/board(?:\?|$)/i);
  await expect(page.getByRole("heading", { name: "Private invites" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Reading board management" })).toBeVisible();
  await expect(page.getByRole("heading", { name: E2E_TAB_LABELS.members })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Danger zone" })).toBeVisible();
  await openFixtureBookCardDetails(page);
  await page.locator('select[name="status"]').first().selectOption("READING");
  await Promise.all([
    page.waitForURL(/\/clubs\/[0-9a-f-]+\/manage\/board\?message=/i),
    page.getByRole("button", { name: "Move" }).first().click(),
  ]);

  await expect(
    page.getByRole("heading", { name: "Reading", exact: true }),
  ).toBeVisible();
  await openFixtureBookCardDetails(page);
  await Promise.all([
    page.waitForURL(/\/clubs\/[0-9a-f-]+\/manage\/board\?message=/i),
    page.getByRole("button", { name: "Remove" }).click(),
  ]);
  await expect(page.getByText("No books in this section yet.")).toHaveCount(3);
});
