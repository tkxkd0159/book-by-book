import { expect, test } from "@playwright/test";

const CLUB_BOOK_URL = "/books/club-test-book";

async function resetApp(page: Parameters<typeof test>[0]["page"]) {
  const response = await page.request.get("/api/test/reset");
  expect(response.ok()).toBeTruthy();
}

async function signInAs(
  page: Parameters<typeof test>[0]["page"],
  user: "owner" | "member" | "stranger",
  returnTo = "/clubs",
) {
  await page.goto(
    `/api/test/auth?user=${encodeURIComponent(user)}&returnTo=${encodeURIComponent(returnTo)}`,
  );
}

test.beforeEach(async ({ page }) => {
  await resetApp(page);
});

test("user can create a public club and another user can join it", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Weekend Readers");
  await page.getByLabel("Description").fill("A public club for weekend reading.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(/\/clubs\/.+/);
  await expect(page.getByRole("heading", { name: "Weekend Readers" })).toBeVisible();

  await signInAs(page, "member", "/clubs");
  await expect(page.getByRole("heading", { name: "Discover Public Clubs" })).toBeVisible();
  await expect(page.getByText("Weekend Readers")).toBeVisible();
  await page.getByRole("button", { name: "Join club" }).click();

  await expect(page.getByText("You joined the club.")).toBeVisible();
  await expect(page.getByText("MEMBER", { exact: true })).toBeVisible();
});

test("private invite can be created and accepted by the matching user", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Private Circle");
  await page.getByLabel("Description").fill("Invitation only");
  await page.getByLabel("Visibility").selectOption("PRIVATE");
  await page.getByRole("button", { name: "Create club" }).click();

  await page.getByRole("link", { name: "Manage invites" }).click();
  await page.getByLabel("Email").fill("member@book-by-book.test");
  await page.getByRole("button", { name: "Create invite" }).click();

  const inviteField = page.getByLabel("Most recent invite link");
  await expect(inviteField).toBeVisible();
  const inviteLink = await inviteField.inputValue();

  await signInAs(page, "member", "/clubs");
  await page.goto(inviteLink);

  await expect(page.getByRole("heading", { name: "Club invitation" })).toBeVisible();
  await page.getByRole("button", { name: "Accept invitation" }).click();

  await expect(page).toHaveURL(/\/clubs\/.+/);
  await expect(page.getByText("Invitation accepted.")).toBeVisible();
  await expect(page.getByText("MEMBER", { exact: true })).toBeVisible();
});

test("club admin can add, move, and remove a book in section management", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Section Operators");
  await page.getByLabel("Description").fill("Used for section transitions.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(/\/clubs\/.+/);
  await expect(
    page.getByRole("heading", { name: "Section Operators" }),
  ).toBeVisible();
  const clubUrl = page.url();

  await page.goto(CLUB_BOOK_URL);
  await page.getByRole("button", { name: "Add to club" }).click();
  await expect(page.getByText("Book added to the club.")).toBeVisible();

  await page.goto(clubUrl);
  await expect(page.getByText("The Test-Driven Book Club")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Want to Read" }),
  ).toBeVisible();

  await page.locator('select[name="status"]').first().selectOption("READING");
  await page.getByRole("button", { name: "Move" }).first().click();
  await expect(page.getByText("Book moved.")).toBeVisible();

  await expect(page.getByText("Reading").first()).toBeVisible();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Book removed.")).toBeVisible();
  await expect(page.getByText("No books in this section yet.")).toHaveCount(3);
});
