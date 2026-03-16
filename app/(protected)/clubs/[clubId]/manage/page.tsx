import Link from "next/link";
import { headers } from "next/headers";
import { forbidden, notFound } from "next/navigation";

import { ClubInvitationsSection } from "@/components/clubs/club-invitations-section";
import { ClubMembersSection } from "@/components/clubs/club-members-section";
import { DeleteClubButton } from "@/components/clubs/delete-club-button";
import { ClubSectionBoard } from "@/components/clubs/club-section-board";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/server";
import { isClubAdmin, isClubOwner } from "@/lib/clubs/permissions";
import {
  CLUB_MEMBER_COUNT_BADGE_VARIANT,
  CLUB_ROLE_BADGE_VARIANTS,
  CLUB_VISIBILITY_BADGE_VARIANTS,
  CLUB_VISIBILITY_LABELS,
} from "@/lib/clubs/presentation";
import {
  findClubDetail,
  listClubBooks,
  listClubInvitations,
  listClubMembers,
} from "@/lib/clubs/repository";
import type { ClubMemberRole } from "@/types/db";

type ClubManagePageProps = {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ManagePageTab = "members" | "board" | "invite";
type MemberRoleFilter = "ALL" | ClubMemberRole;

function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function readMemberRoleFilter(
  value: string | string[] | undefined,
): MemberRoleFilter {
  const selectedRole = readMessage(value);

  if (
    selectedRole === "OWNER" ||
    selectedRole === "ADMIN" ||
    selectedRole === "MEMBER"
  ) {
    return selectedRole;
  }

  return "ALL";
}

function readManagePageTab(
  value: string | string[] | undefined,
  isPrivateClub: boolean,
): ManagePageTab {
  const selectedTab = readMessage(value);

  if (selectedTab === "board") {
    return "board";
  }

  if (selectedTab === "invite" && isPrivateClub) {
    return "invite";
  }

  return "members";
}

function createManagePageHref(input: {
  clubId: string;
  tab?: ManagePageTab;
  role?: MemberRoleFilter;
}) {
  const params = new URLSearchParams();

  if (input.tab) {
    params.set("tab", input.tab);
  }

  if ((input.tab === undefined || input.tab === "members") && input.role && input.role !== "ALL") {
    params.set("role", input.role);
  }

  const query = params.toString();
  return query
    ? `/clubs/${input.clubId}/manage?${query}`
    : `/clubs/${input.clubId}/manage`;
}

async function getInviteLink(token: string | null) {
  if (!token) {
    return null;
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  if (!host) {
    return `/clubs/invitations/${encodeURIComponent(token)}`;
  }

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}/clubs/invitations/${encodeURIComponent(token)}`;
}

export default async function ClubManagePage({
  params,
  searchParams,
}: ClubManagePageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return null;
  }

  const [{ clubId }, paramsData] = await Promise.all([params, searchParams]);
  const club = await findClubDetail(clubId, currentUser.id);

  if (!club) {
    notFound();
  }

  if (!isClubAdmin(club.currentUserRole)) {
    forbidden();
  }

  const activeTab = readManagePageTab(paramsData.tab, club.visibility === "PRIVATE");
  const activeRoleFilter =
    activeTab === "members" ? readMemberRoleFilter(paramsData.role) : "ALL";
  const returnTo = createManagePageHref({
    clubId,
    tab: activeTab,
    role: activeRoleFilter,
  });
  const message = readMessage(paramsData.message);
  const error = readMessage(paramsData.error);

  const members =
    activeTab === "members"
      ? await listClubMembers(clubId, currentUser.id)
      : null;
  const books = activeTab === "board" ? await listClubBooks(clubId) : null;
  const invitations =
    activeTab === "invite" && club.visibility === "PRIVATE"
      ? await listClubInvitations(clubId, currentUser.id)
      : null;
  const inviteLink =
    activeTab === "invite" && club.visibility === "PRIVATE"
      ? await getInviteLink(readMessage(paramsData.token))
      : null;
  const filteredMembers = members
    ? activeRoleFilter === "ALL"
      ? members
      : members.filter((member) => member.role === activeRoleFilter)
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-2xl border border-(--border) bg-(--surface-strong) p-6 shadow-[0_12px_30px_rgba(42,32,18,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={CLUB_VISIBILITY_BADGE_VARIANTS[club.visibility]}>
                {CLUB_VISIBILITY_LABELS[club.visibility]}
              </Badge>
              <Badge variant={CLUB_MEMBER_COUNT_BADGE_VARIANT}>
                {club.memberCount} member{club.memberCount === 1 ? "" : "s"}
              </Badge>
              {club.currentUserRole ? (
                <Badge variant={CLUB_ROLE_BADGE_VARIANTS[club.currentUserRole]}>
                  {club.currentUserRole}
                </Badge>
              ) : null}
            </div>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Manage {club.name}
            </h1>
            <p className="max-w-3xl text-(--muted)">
              Keep club operations tidy from one place: members, private invites,
              and reading board organization all live here.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/clubs/${club.id}`}
              className={buttonStyles({ variant: "secondary" })}
            >
              Back to club
            </Link>
          </div>
        </div>
      </section>

      {message ? (
        <p className="rounded-xl border border-[#b9d6cf] bg-[#eef9f5] px-4 py-3 text-sm text-[#125547]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-[#d39e95] bg-[#fff2ef] px-4 py-3 text-sm text-[#7e1f14]">
          {error}
        </p>
      ) : null}

      <nav
        aria-label="Manage sections"
        className="rounded-2xl border border-(--border) bg-(--surface) p-2 shadow-[0_10px_24px_rgba(42,32,18,0.04)]"
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href={createManagePageHref({
              clubId,
              tab: "members",
              role: activeRoleFilter,
            })}
            aria-current={activeTab === "members" ? "page" : undefined}
            className={buttonStyles({
              variant: activeTab === "members" ? "default" : "secondary",
              size: "sm",
              className:
                activeTab === "members"
                  ? "shadow-[0_8px_18px_rgba(15,97,82,0.18)]"
                  : "",
            })}
          >
            Members
          </Link>
          <Link
            href={createManagePageHref({
              clubId,
              tab: "board",
            })}
            aria-current={activeTab === "board" ? "page" : undefined}
            className={buttonStyles({
              variant: activeTab === "board" ? "default" : "secondary",
              size: "sm",
              className:
                activeTab === "board"
                  ? "shadow-[0_8px_18px_rgba(15,97,82,0.18)]"
                  : "",
            })}
          >
            Reading board
          </Link>
          {club.visibility === "PRIVATE" ? (
            <Link
              href={createManagePageHref({
                clubId,
                tab: "invite",
              })}
              aria-current={activeTab === "invite" ? "page" : undefined}
              className={buttonStyles({
                variant: activeTab === "invite" ? "default" : "secondary",
                size: "sm",
                className:
                  activeTab === "invite"
                    ? "shadow-[0_8px_18px_rgba(15,97,82,0.18)]"
                    : "",
              })}
            >
              Invite
            </Link>
          ) : null}
        </div>
      </nav>

      {activeTab === "members" && members && filteredMembers ? (
        <ClubMembersSection
          club={club}
          currentUserId={currentUser.id}
          members={members}
          filteredMembers={filteredMembers}
          activeRoleFilter={activeRoleFilter}
          roleFilterHrefs={{
            ALL: createManagePageHref({
              clubId,
              tab: "members",
              role: "ALL",
            }),
            OWNER: createManagePageHref({
              clubId,
              tab: "members",
              role: "OWNER",
            }),
            ADMIN: createManagePageHref({
              clubId,
              tab: "members",
              role: "ADMIN",
            }),
            MEMBER: createManagePageHref({
              clubId,
              tab: "members",
              role: "MEMBER",
            }),
          }}
          mode="manage"
          returnTo={returnTo}
        />
      ) : null}

      {activeTab === "board" && books ? (
        <section className="space-y-4 rounded-2xl border border-(--border) bg-(--surface-strong) p-5 shadow-[0_12px_28px_rgba(42,32,18,0.05)] sm:p-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Reading board management</h2>
            <p className="max-w-2xl text-sm text-(--muted)">
              Reorder the club&apos;s reading flow here without cluttering the
              main reading board for everyone else.
            </p>
          </div>

          <ClubSectionBoard
            clubId={club.id}
            books={books}
            mode="manage"
            returnTo={returnTo}
          />
        </section>
      ) : null}

      {activeTab === "invite" && club.visibility === "PRIVATE" && invitations ? (
        <ClubInvitationsSection
          clubId={club.id}
          invitations={invitations}
          inviteLink={inviteLink}
          returnTo={returnTo}
        />
      ) : null}

      {isClubOwner(club.currentUserRole) ? (
        <section className="space-y-4 rounded-2xl border border-[#d39e95] bg-[#fff7f5] p-5 shadow-[0_12px_28px_rgba(42,32,18,0.05)] sm:p-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-[#7e1f14]">
              Danger zone
            </h2>
            <p className="max-w-2xl text-sm text-[#7e1f14]">
              Hand over the owner role before you leave if the club should stay
              active. Delete the club only when you want to close the chapter
              for everyone.
            </p>
          </div>

          <Card className="border-[#d39e95] bg-white/70">
            <CardContent className="flex flex-col gap-4 p-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-[#7e1f14]">
                  Delete club
                </h3>
                <p className="max-w-2xl text-sm text-[#7e1f14]">
                  Permanently delete the club, including invites, reading board
                  updates, and discussions.
                </p>
              </div>

              <DeleteClubButton
                clubId={club.id}
                clubName={club.name}
                returnTo={returnTo}
              />
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
