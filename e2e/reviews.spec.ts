import { expect, test } from "./fixtures/test";
import { resetApp, signInAs } from "./helpers/auth";
import { E2E_ROUTE_PATHS, E2E_URL_PATTERNS } from "./helpers/constants";

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

test("members can create, update, and delete reviews from the book detail page", async ({
  page,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.fixtureBook);
  const publicReviewsSection = page.getByTestId("public-review-list");

  await expect(page.getByText("Write your review")).toBeVisible();

  await page.getByLabel("4.5 stars").check();
  await page.getByLabel("Title").fill("Strong opener");
  await page
    .getByRole("textbox", { name: "Review" })
    .fill("Strong opening and a solid finish.");
  await page.getByRole("button", { name: "Publish review" }).click();

  await expect(page).toHaveURL(E2E_URL_PATTERNS.bookReview);
  await expect(page.getByText("Review saved.")).toBeVisible();
  await expect(page.getByText("Your review")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit review" })).toBeVisible();
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
  await expect(page.getByText("Review saved.")).toHaveCount(0, {
    timeout: 6000,
  });

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
  await expect(page.getByText("Review saved.")).toBeVisible();
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
  await expect(page.getByText("Review deleted.")).toBeVisible();
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
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.fixtureBook);
  const publicReviewsSection = page.getByTestId("public-review-list");

  await page.getByLabel("4.5 stars").check();
  await page.getByLabel("Title").fill("Owner headline");
  await page.getByRole("textbox", { name: "Review" }).fill("Owner review body.");
  await page.getByRole("button", { name: "Publish review" }).click();
  await expect(page).toHaveURL(E2E_URL_PATTERNS.bookReview);
  await expect(page.getByText("Review saved.")).toBeVisible();
  await expect(
    publicReviewsSection.getByText("Owner review body."),
  ).toBeVisible();
  await expect(publicReviewsSection.getByText("Owner headline")).toBeVisible();
  await expect(page.getByText("Your review")).toBeVisible();

  const memberPage = await page.context().newPage();
  await signInAs(memberPage, "member", E2E_ROUTE_PATHS.fixtureBook);
  await memberPage.getByLabel("4 stars").check();
  await memberPage.getByLabel("Title").fill("Member headline");
  await memberPage
    .getByRole("textbox", { name: "Review" })
    .fill("Member review body.");
  await memberPage.getByRole("button", { name: "Publish review" }).click();
  await expect(memberPage).toHaveURL(E2E_URL_PATTERNS.bookReview);
  await expect(memberPage.getByText("Your review")).toBeVisible();

  await expect
    .poll(
      async () => {
        await memberPage.reload();
        return (await memberPage.locator("main").textContent())?.replace(
          /\s+/g,
          " ",
        ) ?? "";
      },
      {
        timeout: 20_000,
      },
    )
    .toContain("4.3 (2)");
  await expect(
    memberPage.getByRole("heading", { name: "Reader reviews", exact: true }),
  ).toBeVisible();
  await expect(memberPage.getByText("4.3 (2)")).toBeVisible();
  await expect(memberPage.getByText(/^2 reviews$/)).toBeVisible();
  await expect(memberPage.getByText("Member review body.")).toBeVisible();
  await expect(memberPage.getByText("Owner review body.")).toBeVisible();
  await expect(memberPage.getByText("Member headline")).toBeVisible();
  await expect(memberPage.getByText("Owner headline")).toBeVisible();
  await expect(memberPage.getByText("Your review")).toBeVisible();

  await memberPage.getByRole("button", { name: "Add Book" }).click();
  const addBookDialog = memberPage.getByRole("dialog");
  await expect(
    addBookDialog.getByRole("tab", { name: /^Clubs/ }),
  ).toBeVisible();
  await expect(
    addBookDialog.getByRole("tab", { name: /^Shelves/ }),
  ).toBeVisible();
});
