import { expect, test } from "./fixtures/test";
import { resetApp, signInAs } from "./helpers/auth";
import { E2E_ROUTE_PATHS, E2E_URL_PATTERNS } from "./helpers/constants";

test.beforeEach(async ({ request }) => {
  await resetApp(request);
});

test("profile links to shelves", async ({ page }) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.me);

  await expect(page.getByRole("link", { name: "Open my shelves" })).toBeVisible();

  await page.getByRole("link", { name: "Open my shelves" }).click();
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

test("members can create, update, and delete reviews from the book detail page", async ({
  page,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.fixtureBook);
  const publicReviewsSection = page
    .getByRole("heading", { name: "Recent public reviews" })
    .locator("xpath=..");

  await expect(page.getByText("Write your review")).toBeVisible();

  await page.getByLabel("4 stars").check();
  await page.getByLabel("Review").fill("Strong opening and a solid finish.");
  await page.getByRole("button", { name: "Publish review" }).click();

  await expect(page).toHaveURL(E2E_URL_PATTERNS.bookReview);
  await expect(page.getByText("Review saved.")).toBeVisible();
  await expect(page.getByText("Your review")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit review" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete review" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish review" })).toHaveCount(
    0,
  );
  await expect(
    publicReviewsSection.getByText("Strong opening and a solid finish."),
  ).toBeVisible();
  await expect(page.getByText(/^1 review$/)).toBeVisible();

  await page.goto(E2E_ROUTE_PATHS.meReviewed);
  await expect(
    page.getByRole("heading", { name: "Reviewed books" }),
  ).toBeVisible();
  await expect(page.getByText("The Test-Driven Book Club")).toBeVisible();
  await expect(page.getByText("Strong opening and a solid finish.")).toBeVisible();

  await page.getByRole("link", { name: "Edit review" }).click();
  await expect(page).toHaveURL(E2E_URL_PATTERNS.bookReview);
  await expect(page.getByText("Your review")).toBeVisible();

  await page.getByRole("button", { name: "Edit review" }).click();
  await expect(page.getByText("Edit your review")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  await page.getByLabel("2 stars").check();
  await page.getByLabel("Review").fill("Less effective on a second read.");
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(page.getByText("Review saved.")).toBeVisible();
  await expect(page.getByText("Your review")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save review" })).toHaveCount(
    0,
  );
  await expect(
    publicReviewsSection.getByText("Less effective on a second read."),
  ).toBeVisible();
  await page.goto(E2E_ROUTE_PATHS.meReviewed);
  await expect(page.getByText("Less effective on a second read.")).toBeVisible();
  await page.getByRole("link", { name: "Edit review" }).click();
  await expect(page).toHaveURL(E2E_URL_PATTERNS.bookReview);
  await page.getByRole("button", { name: "Edit review" }).click();
  await expect(page.getByText("Edit your review")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Your review")).toBeVisible();

  await page.getByRole("button", { name: "Delete review" }).click();
  await expect(page.getByText("Review deleted.")).toBeVisible();
  await expect(
    publicReviewsSection.getByText("No public reviews yet."),
  ).toBeVisible();
  await page.goto(E2E_ROUTE_PATHS.meReviewed);
  await expect(page.getByText("No reviews yet")).toBeVisible();

  await page.goto(E2E_ROUTE_PATHS.fixtureBook);
  await expect(page.getByText("Write your review")).toBeVisible();
  await expect(page.getByText("No ratings yet")).toBeVisible();
  await expect(page.getByText("Be the first to review this book.")).toBeVisible();
});

test("book detail shows aggregate ratings, recent public reviews, and keeps the add-book modal available", async ({
  page,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.fixtureBook);
  const publicReviewsSection = page
    .getByRole("heading", { name: "Recent public reviews" })
    .locator("xpath=..");

  await page.getByLabel("4 stars").check();
  await page.getByLabel("Review").fill("Owner review body.");
  await page.getByRole("button", { name: "Publish review" }).click();
  await expect(page).toHaveURL(E2E_URL_PATTERNS.bookReview);
  await expect(page.getByText("Review saved.")).toBeVisible();
  await expect(publicReviewsSection.getByText("Owner review body.")).toBeVisible();
  await expect(page.getByText("Your review")).toBeVisible();

  await signInAs(page, "member", E2E_ROUTE_PATHS.fixtureBook);
  await page.getByLabel("5 stars").check();
  await page.getByLabel("Review").fill("Member review body.");
  await page.getByRole("button", { name: "Publish review" }).click();
  await expect(page).toHaveURL(E2E_URL_PATTERNS.bookReview);
  await expect(page.getByText("Review saved.")).toBeVisible();
  await expect(page.getByLabel("Rating 4.5")).toBeVisible();
  await expect(page.getByText("Your review")).toBeVisible();

  await page.goto(E2E_ROUTE_PATHS.fixtureBook);
  await expect(page.getByRole("heading", { name: "Reader reviews" })).toBeVisible();
  await expect(page.getByLabel("Rating 4.5")).toBeVisible();
  await expect(page.getByText(/^2 reviews$/)).toBeVisible();
  await expect(page.getByText("Member review body.")).toBeVisible();
  await expect(page.getByText("Owner review body.")).toBeVisible();
  await expect(page.getByText("Your review")).toBeVisible();

  await page.getByRole("button", { name: "Add Book" }).click();
  const addBookDialog = page.getByRole("dialog");
  await expect(addBookDialog.getByRole("tab", { name: /^Clubs/ })).toBeVisible();
  await expect(addBookDialog.getByRole("tab", { name: /^Shelves/ })).toBeVisible();
});
