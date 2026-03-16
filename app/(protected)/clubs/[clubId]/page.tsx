import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";

import {
  joinClubAction,
  leaveClubAction,
} from "@/app/(protected)/clubs/actions";
import { ClubMembersSection } from "@/components/clubs/club-members-section";
import { ClubSectionBoard } from "@/components/clubs/club-section-board";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  canLeaveClub,
  canJoinClub,
  canViewClub,
  isClubAdmin,
  isClubMember,
} from "@/lib/clubs/permissions";
import {
  CLUB_MEMBER_COUNT_BADGE_VARIANT,
  CLUB_ROLE_BADGE_VARIANTS,
  CLUB_VISIBILITY_BADGE_VARIANTS,
  CLUB_VISIBILITY_LABELS,
} from "@/lib/clubs/presentation";
import { getCurrentUser } from "@/lib/auth/server";
import {
  findClubDetail,
  listClubBooks,
  listClubMembers,
} from "@/lib/clubs/repository";
import type { ClubMemberRole } from "@/types/db";

type ClubPageProps = {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ClubPageTab = "board" | "members";
type MemberRoleFilter = "ALL" | ClubMemberRole;

function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function readClubPageTab(
  value: string | string[] | undefined,
  canSeeMembersTab: boolean,
): ClubPageTab {
  const selectedTab = readMessage(value);

  if (selectedTab === "members" && canSeeMembersTab) {
    return "members";
  }

  return "board";
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

function createClubPageHref(input: {
  clubId: string;
  tab: ClubPageTab;
  role?: MemberRoleFilter;
}) {
  const params = new URLSearchParams();

  if (input.tab === "members") {
    params.set("tab", "members");
    if (input.role && input.role !== "ALL") {
      params.set("role", input.role);
    }
  }

  const query = params.toString();
  return query ? `/clubs/${input.clubId}?${query}` : `/clubs/${input.clubId}`;
}

export default async function ClubDetailPage({
  params,
  searchParams,
}: ClubPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return null;
  }

  const [{ clubId }, paramsData] = await Promise.all([params, searchParams]);
  const club = await findClubDetail(clubId, currentUser.id);

  if (!club) {
    notFound();
  }

  if (!canViewClub(club.visibility, club.currentUserRole)) {
    forbidden();
  }

  const [books, members] = await Promise.all([
    listClubBooks(clubId),
    isClubMember(club.currentUserRole)
      ? listClubMembers(clubId, currentUser.id)
      : Promise.resolve(null),
  ]);

  const canManage = isClubAdmin(club.currentUserRole);
  const canSeeMembersTab = Boolean(members);
  const activeTab = readClubPageTab(paramsData.tab, canSeeMembersTab);
  const activeRoleFilter = readMemberRoleFilter(paramsData.role);
  const filteredMembers = members
    ? activeRoleFilter === "ALL"
      ? members
      : members.filter((member) => member.role === activeRoleFilter)
    : null;
  const message = readMessage(paramsData.message);
  const error = readMessage(paramsData.error);
  const boardHref = createClubPageHref({
    clubId,
    tab: "board",
  });
  const currentPageHref = createClubPageHref({
    clubId,
    tab: activeTab,
    role: activeRoleFilter,
  });
  const membersHref = canSeeMembersTab
    ? createClubPageHref({
        clubId,
        tab: "members",
        role: activeRoleFilter,
      })
    : null;

  return (
    <div className="space-y-6">
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
            <h1 className="text-3xl font-semibold sm:text-4xl">{club.name}</h1>
            <p className="max-w-3xl text-(--muted)">
              {club.description ?? "No club description yet."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/clubs" className={buttonStyles({ variant: "secondary" })}>
              <ArrowLeft aria-hidden className="h-4 w-4 shrink-0" />
              Back to clubs
            </Link>
            {canLeaveClub(club.currentUserRole) ? (
              <form action={leaveClubAction}>
                <input type="hidden" name="clubId" value={club.id} />
                <input type="hidden" name="returnTo" value={currentPageHref} />
                <button
                  type="submit"
                  className={buttonStyles({ variant: "destructive" })}
                >
                  Leave club
                </button>
              </form>
            ) : null}
            {canManage ? (
              <Link href={`/clubs/${club.id}/invite`} className={buttonStyles({})}>
                Manage invites
              </Link>
            ) : null}
            {canJoinClub(club.visibility, club.currentUserRole) ? (
              <form action={joinClubAction}>
                <input type="hidden" name="clubId" value={club.id} />
                <input type="hidden" name="returnTo" value={`/clubs/${club.id}`} />
                <button type="submit" className={buttonStyles({})}>
                  <UserPlus aria-hidden className="h-4 w-4 shrink-0" />
                  Join club
                </button>
              </form>
            ) : null}
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
        aria-label="Club sections"
        className="rounded-2xl border border-(--border) bg-(--surface) p-2 shadow-[0_10px_24px_rgba(42,32,18,0.04)]"
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href={boardHref}
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
          {membersHref ? (
            <Link
              href={membersHref}
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
          ) : null}
        </div>
      </nav>

      {activeTab === "board" ? (
        <section className="space-y-4 rounded-2xl border border-(--border) bg-(--surface-strong) p-5 shadow-[0_12px_28px_rgba(42,32,18,0.05)] sm:p-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Reading board</h2>
            <p className="text-sm text-(--muted)">
              Shared books move through the club&apos;s reading pipeline.
            </p>
          </div>

          <ClubSectionBoard clubId={club.id} books={books} canManage={canManage} />
        </section>
      ) : filteredMembers && members ? (
        <ClubMembersSection
          club={club}
          currentUserId={currentUser.id}
          members={members}
          filteredMembers={filteredMembers}
          activeRoleFilter={activeRoleFilter}
          roleFilterHrefs={{
            ALL: createClubPageHref({
              clubId,
              tab: "members",
              role: "ALL",
            }),
            OWNER: createClubPageHref({
              clubId,
              tab: "members",
              role: "OWNER",
            }),
            ADMIN: createClubPageHref({
              clubId,
              tab: "members",
              role: "ADMIN",
            }),
            MEMBER: createClubPageHref({
              clubId,
              tab: "members",
              role: "MEMBER",
            }),
          }}
          returnTo={currentPageHref}
        />
      ) : null}
    </div>
  );
}
