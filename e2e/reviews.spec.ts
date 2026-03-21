import { expect, test } from "./fixtures/test";
import { resetApp, signInAs } from "./helpers/auth";
import { E2E_ROUTE_PATHS, E2E_URL_PATTERNS } from "./helpers/constants";
import { seedReview } from "./helpers/test-data";

test.beforeEach(async ({ request }) => {
  await resetApp(request);
});

test("profile links to shelves", async ({ page }) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.me);

  await expect(
    page.getByRole("link", { name: "Open my shelves" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Open my shelves" }).click();
  await expect(page).toHaveURL(E2E_ROUTE_PATHS.meShelves);
});

test("profile banner shows identity details without exposing internal identifiers", async ({
  page,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.me);

  await expect(page.getByRole("heading", { name: "owner-reader" })).toBeVisible();
  await expect(page.getByText("owner@book-by-book.test")).toBeVisible();
  await expect(page.getByText(/United States/i)).toBeVisible();
  await expect(page.getByText("Fantasy")).toBeVisible();
  await expect(page.getByText("Science")).toBeVisible();
  await expect(page.getByText("User ID")).toHaveCount(0);
});

test("protected navigation links to shelves", async ({ page }) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.booksSearch);

  await expect(page.getByRole("link", { name: "Shelves" })).toBeVisible();
  await page.getByRole("link", { name: "Shelves" }).click();
  await expect(page).toHaveURL(E2E_ROUTE_PATHS.meShelves);
});

test("profile links to reviewed books", async ({ page }) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.me);

  await expect(
    page.getByRole("link", { name: "Open reviewed books" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open reviewed books" }).click();
  await expect(page).toHaveURL(E2E_ROUTE_PATHS.meReviewed);
});

test("legacy review routes redirect into the inline editor on the book detail page", async ({
  page,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.fixtureBook);

  await page.goto(E2E_ROUTE_PATHS.legacyFixtureReview);
  await expect(page).toHaveURL(E2E_URL_PATTERNS.bookReview);
  await expect(page.getByText("Write your review")).toBeVisible();
});

test("members can update and delete reviews from the book detail page", async ({
  page,
  request,
}) => {
  await seedReview(request, {
    user: "owner",
    rating: 4.5,
    title: "Strong opener",
    body: "Strong opening and a solid finish.",
  });

  await signInAs(page, "owner", E2E_ROUTE_PATHS.fixtureBook);
  const publicReviewsSection = page.getByTestId("public-review-list");
  await expect(
    page.getByText("Your review", { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Edit review" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByRole("button", { name: "Delete review" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish review" }),
  ).toHaveCount(0);
  await expect(
    publicReviewsSection.getByText("Strong opening and a solid finish."),
  ).toBeVisible();
  await expect(publicReviewsSection.getByText("Strong opener")).toBeVisible();
  await expect(page.getByText(/^1 review$/)).toBeVisible();

  await page.goto(E2E_ROUTE_PATHS.meReviewed);
  await expect(
    page.getByRole("heading", { name: "Reviewed books" }),
  ).toBeVisible();
  await expect(page.getByText("The Test-Driven Book Club")).toBeVisible();
  await expect(page.getByText("Strong opener")).toBeVisible();
  await expect(
    page.getByText("Strong opening and a solid finish."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Edit review" }).click();
  await expect(page).toHaveURL(/\/me\/reviewed(?:\?.*)?(?:#.*)?$/i);
  await expect(page.getByText("Edit your review")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Title").fill("Less effective later");
  await page.getByLabel("2.5 stars").check();
  await page
    .getByRole("textbox", { name: "Review" })
    .fill("Less effective on a second read.");
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(page).toHaveURL(/\/me\/reviewed(?:\?.*)?(?:#.*)?$/i);
  await expect(page.getByText("Less effective later")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save review" })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("Less effective on a second read."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit review" }).click();
  await expect(page.getByText("Edit your review")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("Less effective later")).toBeVisible();

  await page.getByRole("button", { name: "Delete review" }).click();
  await expect(page.getByText("No reviews yet")).toBeVisible();

  await page.goto(E2E_ROUTE_PATHS.fixtureBook);
  await expect(page.getByText("Write your review")).toBeVisible();
  await expect(page.getByText("No ratings yet")).toBeVisible();
  await expect(
    page.getByText("Be the first to review this book."),
  ).toBeVisible();
});

test("book detail shows aggregate ratings, reader reviews, and keeps the add-book modal available", async ({
  page,
  request,
}) => {
  await seedReview(request, {
    user: "owner",
    rating: 4.5,
    title: "Owner headline",
    body: "Owner review body.",
  });
  await seedReview(request, {
    user: "member",
    rating: 4,
    title: "Member headline",
    body: "Member review body.",
  });

  await signInAs(page, "member", E2E_ROUTE_PATHS.fixtureBook);
  const publicReviewsSection = page.getByTestId("public-review-list");

  await expect(page).toHaveURL(E2E_URL_PATTERNS.bookReview);
  await expect(
    page.getByRole("heading", { name: "Reader reviews", exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("4.3 (2)")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/^2 reviews$/)).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Member review body.")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Owner review body.")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Member headline")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Owner headline")).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByText("Your review", { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    publicReviewsSection.getByText("Owner review body."),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    publicReviewsSection.getByText("Owner headline"),
  ).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "Add Book" }).click();
  const addBookDialog = page.getByRole("dialog");
  await expect(
    addBookDialog.getByRole("tab", { name: /^Clubs/ }),
  ).toBeVisible();
  await expect(
    addBookDialog.getByRole("tab", { name: /^Shelves/ }),
  ).toBeVisible();
});
