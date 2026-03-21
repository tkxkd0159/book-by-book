import { E2E_USER_PROVIDER } from "@/lib/test-harness/auth";
import sql from "@/lib/db";
import {
  TEST_BOOK_FIXTURE,
  TEST_BOOK_VOLUME_ID,
} from "@/lib/test-harness/google-books-fixtures";
import {
  TEST_FIXTURE_LOCK_ID,
  TEST_USERS,
  type TestUserKey,
} from "@/lib/test-harness/constants";

export { TEST_BOOK_VOLUME_ID, type TestUserKey };

async function insertTestUsers(query: typeof sql) {
  for (const user of Object.values(TEST_USERS)) {
    await query`
      insert into bookapp.users (
        provider,
        provider_user_id,
        email,
        name
      )
      values (
        ${E2E_USER_PROVIDER},
        ${user.key},
        ${user.email},
        ${user.name}
      )
      on conflict (provider, provider_user_id)
      do update set
        email = excluded.email,
        name = excluded.name
    `;
  }
}

export async function seedTestUsers() {
  await sql.begin(async (tx) => {
    const query = tx as unknown as typeof sql;
    await query`select pg_advisory_xact_lock(${TEST_FIXTURE_LOCK_ID})`;
    await insertTestUsers(query);
  });
}

export async function resetTestDatabase() {
  await sql.begin(async (tx) => {
    const query = tx as unknown as typeof sql;
    await query`select pg_advisory_xact_lock(${TEST_FIXTURE_LOCK_ID})`;

    await query`
      truncate table
        bookapp.reviews,
        bookapp.shelf_items,
        bookapp.shelves,
        bookapp.thread_posts,
        bookapp.threads,
        bookapp.club_invitations,
        bookapp.club_members,
        bookapp.club_books,
        bookapp.clubs,
        bookapp.auth_accounts,
        bookapp.books,
        bookapp.users
      restart identity cascade
    `;
    await insertTestUsers(query);

    await query`
      insert into bookapp.books (
        google_volume_id,
        title,
        subtitle,
        authors,
        publisher,
        published_date,
        description,
        isbn13,
        page_count,
        categories,
        language,
        thumbnail_url,
        info_link,
        canonical_link,
        raw_google_json
      )
      values (
        ${TEST_BOOK_FIXTURE.googleVolumeId},
        ${TEST_BOOK_FIXTURE.title},
        ${TEST_BOOK_FIXTURE.subtitle},
        ${sql.array([...TEST_BOOK_FIXTURE.authors])},
        ${TEST_BOOK_FIXTURE.publisher},
        ${TEST_BOOK_FIXTURE.publishedDate},
        ${TEST_BOOK_FIXTURE.description},
        ${TEST_BOOK_FIXTURE.isbn13},
        ${TEST_BOOK_FIXTURE.pageCount},
        ${sql.array([...TEST_BOOK_FIXTURE.categories])},
        ${TEST_BOOK_FIXTURE.language},
        ${TEST_BOOK_FIXTURE.thumbnailUrl},
        ${TEST_BOOK_FIXTURE.infoLink},
        ${TEST_BOOK_FIXTURE.canonicalLink},
        ${JSON.stringify(TEST_BOOK_FIXTURE.rawGoogleJson)}::jsonb
      )
    `;
  });
}

export function getTestUser(key: TestUserKey) {
  return TEST_USERS[key];
}
