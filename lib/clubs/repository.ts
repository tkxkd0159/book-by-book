import { createHash, randomBytes } from "node:crypto";

import sql from "@/lib/db";
import type {
  AuthUser,
  BookRecord,
  ClubBookRecord,
  ClubBookStatus,
  ClubInvitationRecord,
  ClubInvitationStatus,
  ClubMemberRecord,
  ClubMemberRole,
  ClubRecord,
  ClubVisibility,
} from "@/types/db";

import { ClubError } from "@/lib/clubs/errors";
import { isClubAdmin, isClubMember } from "@/lib/clubs/permissions";

type ClubRow = {
  id: string;
  name: string;
  description: string | null;
  visibility: ClubVisibility;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

type ClubMemberRow = {
  id: string;
  clubId: string;
  userId: string;
  role: ClubMemberRole;
  joinedAt: Date;
};

type ClubInvitationRow = {
  id: string;
  clubId: string;
  invitedById: string;
  invitedUserId: string | null;
  invitedEmail: string | null;
  status: ClubInvitationStatus;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt: Date | null;
  updatedAt: Date;
};

type ClubBookRow = {
  id: string;
  clubId: string;
  bookId: string;
  status: ClubBookStatus;
  addedById: string;
  sortOrder: number;
  addedAt: Date;
  removedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ClubSummaryRow = ClubRow & {
  memberCount: number;
  currentUserRole: ClubMemberRole | null;
};

type ClubBookWithBookRow = ClubBookRow & {
  googleVolumeId: string;
  title: string;
  subtitle: string | null;
  authors: string[] | null;
  publisher: string | null;
  publishedDate: string | null;
  thumbnailUrl: string | null;
  infoLink: string | null;
};

type InvitationLookupRow = ClubInvitationRow & {
  clubName: string;
  clubVisibility: ClubVisibility;
  effectiveStatus: ClubInvitationStatus;
};

export type ClubSummary = ClubRecord & {
  memberCount: number;
  currentUserRole: ClubMemberRole | null;
};

export type ClubDetail = ClubSummary;

export type ClubInvitationWithClub = ClubInvitationRecord & {
  clubName: string;
  clubVisibility: ClubVisibility;
  effectiveStatus: ClubInvitationStatus;
};

export type ClubBookWithBook = ClubBookRecord & {
  book: Pick<
    BookRecord,
    | "id"
    | "googleVolumeId"
    | "title"
    | "subtitle"
    | "authors"
    | "publisher"
    | "publishedDate"
    | "thumbnailUrl"
    | "infoLink"
  >;
};

export type ManageableClubSummary = Pick<
  ClubSummary,
  "id" | "name" | "visibility" | "currentUserRole"
>;

const CLUB_INVITATION_TTL_DAYS = 7;
type QueryExecutor = typeof sql;

function mapClub(row: ClubRow): ClubRecord {
  return row;
}

function mapClubMember(row: ClubMemberRow): ClubMemberRecord {
  return row;
}

function mapClubInvitation(row: ClubInvitationRow): ClubInvitationRecord {
  return row;
}

function mapClubBook(row: ClubBookRow): ClubBookRecord {
  return row;
}

function mapClubSummary(row: ClubSummaryRow): ClubSummary {
  return {
    ...mapClub(row),
    memberCount: Number(row.memberCount ?? 0),
    currentUserRole: row.currentUserRole,
  };
}

function mapClubBookWithBook(row: ClubBookWithBookRow): ClubBookWithBook {
  return {
    ...mapClubBook(row),
    book: {
      id: row.bookId,
      googleVolumeId: row.googleVolumeId,
      title: row.title,
      subtitle: row.subtitle,
      authors: row.authors ?? [],
      publisher: row.publisher,
      publishedDate: row.publishedDate,
      thumbnailUrl: row.thumbnailUrl,
      infoLink: row.infoLink,
    },
  };
}

function mapInvitationLookup(row: InvitationLookupRow): ClubInvitationWithClub {
  return {
    ...mapClubInvitation(row),
    clubName: row.clubName,
    clubVisibility: row.clubVisibility,
    effectiveStatus: row.effectiveStatus,
  };
}

function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function asQueryExecutor(tx: unknown) {
  return tx as QueryExecutor;
}

async function getMembershipForUpdate(
  tx: typeof sql,
  clubId: string,
  userId: string,
) {
  const [membership] = await tx<ClubMemberRow[]>`
    select
      id::text as id,
      club_id::text as "clubId",
      user_id::text as "userId",
      role,
      joined_at as "joinedAt"
    from bookapp.club_members
    where club_id = ${clubId}::uuid
      and user_id = ${userId}::uuid
    limit 1
  `;

  return membership ? mapClubMember(membership) : null;
}

async function getClubForUpdate(tx: typeof sql, clubId: string) {
  const [club] = await tx<ClubRow[]>`
    select
      id::text as id,
      name,
      description,
      visibility,
      created_by_id::text as "createdById",
      created_at as "createdAt",
      updated_at as "updatedAt"
    from bookapp.clubs
    where id = ${clubId}::uuid
    limit 1
  `;

  return club ? mapClub(club) : null;
}

async function getNextSortOrder(
  tx: typeof sql,
  clubId: string,
  status: ClubBookStatus,
) {
  const [result] = await tx<{ nextSortOrder: number }[]>`
    select coalesce(max(sort_order) + 1, 0)::int as "nextSortOrder"
    from bookapp.club_books
    where club_id = ${clubId}::uuid
      and status = ${status}
      and removed_at is null
  `;

  return result?.nextSortOrder ?? 0;
}

export async function listUserClubs(userId: string) {
  const rows = await sql<ClubSummaryRow[]>`
    select
      clubs.id::text as id,
      clubs.name,
      clubs.description,
      clubs.visibility,
      clubs.created_by_id::text as "createdById",
      clubs.created_at as "createdAt",
      clubs.updated_at as "updatedAt",
      club_members.role as "currentUserRole",
      (
        select count(*)::int
        from bookapp.club_members member_counts
        where member_counts.club_id = clubs.id
      ) as "memberCount"
    from bookapp.clubs
    join bookapp.club_members
      on club_members.club_id = clubs.id
     and club_members.user_id = ${userId}::uuid
    order by clubs.updated_at desc, clubs.name asc
  `;

  return rows.map(mapClubSummary);
}

export async function listDiscoverablePublicClubs(userId: string) {
  const rows = await sql<ClubSummaryRow[]>`
    select
      clubs.id::text as id,
      clubs.name,
      clubs.description,
      clubs.visibility,
      clubs.created_by_id::text as "createdById",
      clubs.created_at as "createdAt",
      clubs.updated_at as "updatedAt",
      null::text as "currentUserRole",
      (
        select count(*)::int
        from bookapp.club_members member_counts
        where member_counts.club_id = clubs.id
      ) as "memberCount"
    from bookapp.clubs
    where clubs.visibility = 'PUBLIC'
      and not exists (
        select 1
        from bookapp.club_members memberships
        where memberships.club_id = clubs.id
          and memberships.user_id = ${userId}::uuid
      )
    order by clubs.updated_at desc, clubs.name asc
  `;

  return rows.map(mapClubSummary);
}

export async function listManageableClubsForUser(userId: string) {
  const rows = await sql<ClubSummaryRow[]>`
    select
      clubs.id::text as id,
      clubs.name,
      clubs.description,
      clubs.visibility,
      clubs.created_by_id::text as "createdById",
      clubs.created_at as "createdAt",
      clubs.updated_at as "updatedAt",
      club_members.role as "currentUserRole",
      0::int as "memberCount"
    from bookapp.clubs
    join bookapp.club_members
      on club_members.club_id = clubs.id
     and club_members.user_id = ${userId}::uuid
    where club_members.role in ('OWNER', 'ADMIN')
    order by clubs.name asc
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    visibility: row.visibility,
    currentUserRole: row.currentUserRole,
  }));
}

export async function findClubDetail(clubId: string, userId: string) {
  const [club] = await sql<ClubSummaryRow[]>`
    select
      clubs.id::text as id,
      clubs.name,
      clubs.description,
      clubs.visibility,
      clubs.created_by_id::text as "createdById",
      clubs.created_at as "createdAt",
      clubs.updated_at as "updatedAt",
      club_members.role as "currentUserRole",
      (
        select count(*)::int
        from bookapp.club_members member_counts
        where member_counts.club_id = clubs.id
      ) as "memberCount"
    from bookapp.clubs
    left join bookapp.club_members
      on club_members.club_id = clubs.id
     and club_members.user_id = ${userId}::uuid
    where clubs.id = ${clubId}::uuid
    limit 1
  `;

  return club ? mapClubSummary(club) : null;
}

export async function createClub(input: {
  createdById: string;
  name: string;
  description: string | null;
  visibility: ClubVisibility;
}) {
  return sql.begin(async (tx) => {
    const query = asQueryExecutor(tx);
    const [club] = await query<ClubRow[]>`
      insert into bookapp.clubs (
        name,
        description,
        visibility,
        created_by_id
      )
      values (
        ${input.name},
        ${input.description},
        ${input.visibility},
        ${input.createdById}::uuid
      )
      returning
        id::text as id,
        name,
        description,
        visibility,
        created_by_id::text as "createdById",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    await query`
      insert into bookapp.club_members (
        club_id,
        user_id,
        role
      )
      values (
        ${club.id}::uuid,
        ${input.createdById}::uuid,
        'OWNER'
      )
      on conflict (club_id, user_id) do nothing
    `;

    return mapClub(club);
  });
}

export async function joinPublicClub(input: { clubId: string; userId: string }) {
  return sql.begin(async (tx) => {
    const query = asQueryExecutor(tx);
    const club = await getClubForUpdate(query, input.clubId);
    if (!club) {
      throw new ClubError("NOT_FOUND", "Club not found.");
    }

    if (club.visibility !== "PUBLIC") {
      throw new ClubError("FORBIDDEN", "Private clubs require an invitation.");
    }

    await query`
      insert into bookapp.club_members (
        club_id,
        user_id,
        role
      )
      values (
        ${input.clubId}::uuid,
        ${input.userId}::uuid,
        'MEMBER'
      )
      on conflict (club_id, user_id) do nothing
    `;

    const membership = await getMembershipForUpdate(
      query,
      input.clubId,
      input.userId,
    );
    if (!membership) {
      throw new ClubError("CONFLICT", "Unable to join club right now.");
    }

    return membership;
  });
}

export async function listClubBooks(clubId: string) {
  const rows = await sql<ClubBookWithBookRow[]>`
    select
      club_books.id::text as id,
      club_books.club_id::text as "clubId",
      club_books.book_id::text as "bookId",
      club_books.status,
      club_books.added_by_id::text as "addedById",
      club_books.sort_order as "sortOrder",
      club_books.added_at as "addedAt",
      club_books.removed_at as "removedAt",
      club_books.created_at as "createdAt",
      club_books.updated_at as "updatedAt",
      books.google_volume_id as "googleVolumeId",
      books.title,
      books.subtitle,
      books.authors,
      books.publisher,
      books.published_date as "publishedDate",
      books.thumbnail_url as "thumbnailUrl",
      books.info_link as "infoLink"
    from bookapp.club_books
    join bookapp.books on books.id = club_books.book_id
    where club_books.club_id = ${clubId}::uuid
      and club_books.removed_at is null
    order by
      case club_books.status
        when 'WANT_TO_READ' then 0
        when 'READING' then 1
        else 2
      end,
      club_books.sort_order asc,
      club_books.added_at asc
  `;

  return rows.map(mapClubBookWithBook);
}

export async function addBookToClub(input: {
  clubId: string;
  bookId: string;
  addedById: string;
  status: ClubBookStatus;
}) {
  return sql.begin(async (tx) => {
    const query = asQueryExecutor(tx);
    const membership = await getMembershipForUpdate(
      query,
      input.clubId,
      input.addedById,
    );
    if (!membership || !isClubAdmin(membership.role)) {
      throw new ClubError(
        membership ? "FORBIDDEN" : "NOT_FOUND",
        "Only club admins can manage books.",
      );
    }

    const nextSortOrder = await getNextSortOrder(
      query,
      input.clubId,
      input.status,
    );
    const [clubBook] = await query<ClubBookRow[]>`
      insert into bookapp.club_books (
        club_id,
        book_id,
        status,
        added_by_id,
        sort_order,
        removed_at
      )
      values (
        ${input.clubId}::uuid,
        ${input.bookId}::uuid,
        ${input.status},
        ${input.addedById}::uuid,
        ${nextSortOrder},
        null
      )
      on conflict (club_id, book_id)
      do update set
        status = excluded.status,
        added_by_id = excluded.added_by_id,
        sort_order = excluded.sort_order,
        removed_at = null,
        updated_at = now()
      returning
        id::text as id,
        club_id::text as "clubId",
        book_id::text as "bookId",
        status,
        added_by_id::text as "addedById",
        sort_order as "sortOrder",
        added_at as "addedAt",
        removed_at as "removedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    return mapClubBook(clubBook);
  });
}

export async function moveClubBook(input: {
  clubId: string;
  clubBookId: string;
  movedById: string;
  status: ClubBookStatus;
}) {
  return sql.begin(async (tx) => {
    const query = asQueryExecutor(tx);
    const membership = await getMembershipForUpdate(
      query,
      input.clubId,
      input.movedById,
    );
    if (!membership || !isClubAdmin(membership.role)) {
      throw new ClubError(
        membership ? "FORBIDDEN" : "NOT_FOUND",
        "Only club admins can manage books.",
      );
    }

    const [existing] = await query<ClubBookRow[]>`
      select
        id::text as id,
        club_id::text as "clubId",
        book_id::text as "bookId",
        status,
        added_by_id::text as "addedById",
        sort_order as "sortOrder",
        added_at as "addedAt",
        removed_at as "removedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from bookapp.club_books
      where id = ${input.clubBookId}::uuid
        and club_id = ${input.clubId}::uuid
      limit 1
    `;

    if (!existing || existing.removedAt) {
      throw new ClubError("NOT_FOUND", "Club book not found.");
    }

    const nextSortOrder = await getNextSortOrder(
      query,
      input.clubId,
      input.status,
    );
    const [updated] = await query<ClubBookRow[]>`
      update bookapp.club_books
      set
        status = ${input.status},
        sort_order = ${nextSortOrder},
        updated_at = now()
      where id = ${input.clubBookId}::uuid
        and club_id = ${input.clubId}::uuid
      returning
        id::text as id,
        club_id::text as "clubId",
        book_id::text as "bookId",
        status,
        added_by_id::text as "addedById",
        sort_order as "sortOrder",
        added_at as "addedAt",
        removed_at as "removedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    return mapClubBook(updated);
  });
}

export async function removeClubBook(input: {
  clubId: string;
  clubBookId: string;
  removedById: string;
}) {
  return sql.begin(async (tx) => {
    const query = asQueryExecutor(tx);
    const membership = await getMembershipForUpdate(
      query,
      input.clubId,
      input.removedById,
    );
    if (!membership || !isClubAdmin(membership.role)) {
      throw new ClubError(
        membership ? "FORBIDDEN" : "NOT_FOUND",
        "Only club admins can manage books.",
      );
    }

    const [updated] = await query<ClubBookRow[]>`
      update bookapp.club_books
      set
        removed_at = now(),
        updated_at = now()
      where id = ${input.clubBookId}::uuid
        and club_id = ${input.clubId}::uuid
        and removed_at is null
      returning
        id::text as id,
        club_id::text as "clubId",
        book_id::text as "bookId",
        status,
        added_by_id::text as "addedById",
        sort_order as "sortOrder",
        added_at as "addedAt",
        removed_at as "removedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    if (!updated) {
      throw new ClubError("NOT_FOUND", "Club book not found.");
    }

    return mapClubBook(updated);
  });
}

export async function listClubInvitations(clubId: string, userId: string) {
  const membership = await getMembershipForUpdate(sql, clubId, userId);
  if (!membership || !isClubAdmin(membership.role)) {
    throw new ClubError(
      membership ? "FORBIDDEN" : "NOT_FOUND",
      "Only club admins can manage invitations.",
    );
  }

  const rows = await sql<InvitationLookupRow[]>`
    select
      club_invitations.id::text as id,
      club_invitations.club_id::text as "clubId",
      club_invitations.invited_by_id::text as "invitedById",
      club_invitations.invited_user_id::text as "invitedUserId",
      club_invitations.invited_email::text as "invitedEmail",
      club_invitations.status,
      club_invitations.token_hash as "tokenHash",
      club_invitations.expires_at as "expiresAt",
      club_invitations.created_at as "createdAt",
      club_invitations.accepted_at as "acceptedAt",
      club_invitations.updated_at as "updatedAt",
      clubs.name as "clubName",
      clubs.visibility as "clubVisibility",
      case
        when club_invitations.status = 'PENDING'
          and club_invitations.expires_at < now()
        then 'EXPIRED'
        else club_invitations.status
      end as "effectiveStatus"
    from bookapp.club_invitations
    join bookapp.clubs on clubs.id = club_invitations.club_id
    where club_invitations.club_id = ${clubId}::uuid
    order by club_invitations.created_at desc
  `;

  return rows.map(mapInvitationLookup);
}

export async function createClubInvitation(input: {
  clubId: string;
  invitedById: string;
  invitedEmail: string;
}) {
  return sql.begin(async (tx) => {
    const query = asQueryExecutor(tx);
    const membership = await getMembershipForUpdate(
      query,
      input.clubId,
      input.invitedById,
    );
    if (!membership || !isClubAdmin(membership.role)) {
      throw new ClubError(
        membership ? "FORBIDDEN" : "NOT_FOUND",
        "Only club admins can invite members.",
      );
    }

    const club = await getClubForUpdate(query, input.clubId);
    if (!club) {
      throw new ClubError("NOT_FOUND", "Club not found.");
    }

    const [existingMember] = await query<{ id: string }[]>`
      select id::text as id
      from bookapp.users
      where email = ${input.invitedEmail}
      limit 1
    `;

    if (existingMember) {
      const [memberRow] = await query<ClubMemberRow[]>`
        select
          id::text as id,
          club_id::text as "clubId",
          user_id::text as "userId",
          role,
          joined_at as "joinedAt"
        from bookapp.club_members
        where club_id = ${input.clubId}::uuid
          and user_id = ${existingMember.id}::uuid
        limit 1
      `;

      if (memberRow && isClubMember(memberRow.role)) {
        throw new ClubError("CONFLICT", "That user is already a club member.");
      }
    }

    const rawToken = createInvitationToken();
    const tokenHash = hashInvitationToken(rawToken);
    const expiresAt = new Date(
      Date.now() + CLUB_INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    try {
      const [invitation] = await query<ClubInvitationRow[]>`
        insert into bookapp.club_invitations (
          club_id,
          invited_by_id,
          invited_email,
          token_hash,
          expires_at
        )
        values (
          ${input.clubId}::uuid,
          ${input.invitedById}::uuid,
          ${input.invitedEmail},
          ${tokenHash},
          ${expiresAt}
        )
        returning
          id::text as id,
          club_id::text as "clubId",
          invited_by_id::text as "invitedById",
          invited_user_id::text as "invitedUserId",
          invited_email::text as "invitedEmail",
          status,
          token_hash as "tokenHash",
          expires_at as "expiresAt",
          created_at as "createdAt",
          accepted_at as "acceptedAt",
          updated_at as "updatedAt"
      `;

      return {
        invitation: mapClubInvitation(invitation),
        club,
        rawToken,
      };
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new ClubError(
          "CONFLICT",
          "A pending invitation already exists for that email.",
        );
      }

      throw error;
    }
  });
}

export async function revokeClubInvitation(input: {
  clubId: string;
  invitationId: string;
  revokedById: string;
}) {
  return sql.begin(async (tx) => {
    const query = asQueryExecutor(tx);
    const membership = await getMembershipForUpdate(
      query,
      input.clubId,
      input.revokedById,
    );
    if (!membership || !isClubAdmin(membership.role)) {
      throw new ClubError(
        membership ? "FORBIDDEN" : "NOT_FOUND",
        "Only club admins can revoke invitations.",
      );
    }

    const [invitation] = await query<ClubInvitationRow[]>`
      update bookapp.club_invitations
      set
        status = 'REVOKED',
        updated_at = now()
      where id = ${input.invitationId}::uuid
        and club_id = ${input.clubId}::uuid
        and status = 'PENDING'
      returning
        id::text as id,
        club_id::text as "clubId",
        invited_by_id::text as "invitedById",
        invited_user_id::text as "invitedUserId",
        invited_email::text as "invitedEmail",
        status,
        token_hash as "tokenHash",
        expires_at as "expiresAt",
        created_at as "createdAt",
        accepted_at as "acceptedAt",
        updated_at as "updatedAt"
    `;

    if (!invitation) {
      throw new ClubError("NOT_FOUND", "Pending invitation not found.");
    }

    return mapClubInvitation(invitation);
  });
}

export async function findInvitationByToken(token: string) {
  const rows = await sql<InvitationLookupRow[]>`
    select
      club_invitations.id::text as id,
      club_invitations.club_id::text as "clubId",
      club_invitations.invited_by_id::text as "invitedById",
      club_invitations.invited_user_id::text as "invitedUserId",
      club_invitations.invited_email::text as "invitedEmail",
      club_invitations.status,
      club_invitations.token_hash as "tokenHash",
      club_invitations.expires_at as "expiresAt",
      club_invitations.created_at as "createdAt",
      club_invitations.accepted_at as "acceptedAt",
      club_invitations.updated_at as "updatedAt",
      clubs.name as "clubName",
      clubs.visibility as "clubVisibility",
      case
        when club_invitations.status = 'PENDING'
          and club_invitations.expires_at < now()
        then 'EXPIRED'
        else club_invitations.status
      end as "effectiveStatus"
    from bookapp.club_invitations
    join bookapp.clubs on clubs.id = club_invitations.club_id
    where club_invitations.token_hash = ${hashInvitationToken(token)}
    limit 1
  `;

  const invitation = rows[0];
  return invitation ? mapInvitationLookup(invitation) : null;
}

export async function acceptClubInvitation(input: {
  token: string;
  user: AuthUser;
}) {
  return sql.begin(async (tx) => {
    const query = asQueryExecutor(tx);
    const [invitation] = await query<InvitationLookupRow[]>`
      select
        club_invitations.id::text as id,
        club_invitations.club_id::text as "clubId",
        club_invitations.invited_by_id::text as "invitedById",
        club_invitations.invited_user_id::text as "invitedUserId",
        club_invitations.invited_email::text as "invitedEmail",
        club_invitations.status,
        club_invitations.token_hash as "tokenHash",
        club_invitations.expires_at as "expiresAt",
        club_invitations.created_at as "createdAt",
        club_invitations.accepted_at as "acceptedAt",
        club_invitations.updated_at as "updatedAt",
        clubs.name as "clubName",
        clubs.visibility as "clubVisibility",
        case
          when club_invitations.status = 'PENDING'
            and club_invitations.expires_at < now()
          then 'EXPIRED'
          else club_invitations.status
        end as "effectiveStatus"
      from bookapp.club_invitations
      join bookapp.clubs on clubs.id = club_invitations.club_id
      where club_invitations.token_hash = ${hashInvitationToken(input.token)}
      limit 1
      for update
    `;

    if (!invitation) {
      throw new ClubError("NOT_FOUND", "Invitation not found.");
    }

    if (invitation.effectiveStatus === "EXPIRED") {
      await query`
        update bookapp.club_invitations
        set
          status = 'EXPIRED',
          updated_at = now()
        where id = ${invitation.id}::uuid
      `;
      throw new ClubError("EXPIRED", "This invitation has expired.");
    }

    if (invitation.effectiveStatus === "REVOKED") {
      throw new ClubError("FORBIDDEN", "This invitation has been revoked.");
    }

    if (invitation.effectiveStatus === "ACCEPTED") {
      return { clubId: invitation.clubId };
    }

    const matchesUser =
      invitation.invitedUserId === input.user.id ||
      (invitation.invitedEmail &&
        input.user.email &&
        invitation.invitedEmail.toLowerCase() === input.user.email.toLowerCase());

    if (!matchesUser) {
      throw new ClubError(
        "FORBIDDEN",
        "This invitation is for a different account.",
      );
    }

    await query`
      insert into bookapp.club_members (
        club_id,
        user_id,
        role
      )
      values (
        ${invitation.clubId}::uuid,
        ${input.user.id}::uuid,
        'MEMBER'
      )
      on conflict (club_id, user_id) do nothing
    `;

    await query`
      update bookapp.club_invitations
      set
        status = 'ACCEPTED',
        invited_user_id = ${input.user.id}::uuid,
        accepted_at = coalesce(accepted_at, now()),
        updated_at = now()
      where id = ${invitation.id}::uuid
    `;

    return { clubId: invitation.clubId };
  });
}
