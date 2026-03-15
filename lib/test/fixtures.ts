import sql from "@/lib/db";
import { E2E_USER_PROVIDER } from "@/lib/auth/e2e";

const TEST_USERS = {
  owner: {
    key: "owner",
    email: "owner@book-by-book.test",
    name: "Owner Reader",
  },
  member: {
    key: "member",
    email: "member@book-by-book.test",
    name: "Member Reader",
  },
  stranger: {
    key: "stranger",
    email: "stranger@book-by-book.test",
    name: "Stranger Reader",
  },
} as const;

export type TestUserKey = keyof typeof TEST_USERS;

export const TEST_BOOK_VOLUME_ID = "club-test-book";

export async function seedTestUsers() {
  await sql.begin(async (tx) => {
    const query = tx as unknown as typeof sql;

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
  });
}

export async function resetTestDatabase() {
  await sql.begin(async (tx) => {
    const query = tx as unknown as typeof sql;

    await query`
      truncate table
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
  });

  await seedTestUsers();

  await sql.begin(async (tx) => {
    const query = tx as unknown as typeof sql;

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
        ${TEST_BOOK_VOLUME_ID},
        'The Test-Driven Book Club',
        'Milestone Fixture',
        ARRAY['Fixture Author'],
        'Book by Book Press',
        '2025',
        'Fixture description for milestone 2 end-to-end coverage.',
        '9780000000002',
        320,
        ARRAY['Fiction'],
        'en',
        'https://books.google.com/books/content?id=fixture&printsec=frontcover&img=1&zoom=1',
        'https://books.google.com/books?id=fixture',
        'https://books.google.com/books?id=fixture',
        '{}'::jsonb
      )
    `;
  });
}

export function getTestUser(key: TestUserKey) {
  return TEST_USERS[key];
}
