import {
  changeClubMemberRoleAction,
  deleteClubAction,
  removeClubMemberAction,
  transferClubOwnershipAction,
} from "@/app/(protected)/clubs/actions";
import { UserAvatar } from "@/components/auth/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  canChangeClubMemberRole,
  canDeleteClub,
  canLeaveClub,
  canRemoveClubMember,
  canTransferClubOwnership,
} from "@/lib/clubs/permissions";
import { CLUB_ROLE_BADGE_VARIANTS } from "@/lib/clubs/presentation";
import type { ClubDetail, ClubMemberSummary } from "@/lib/clubs/repository";
import type { ClubMemberRole } from "@/types/db";
import Link from "next/link";

type ClubMembersSectionProps = {
  club: ClubDetail;
  currentUserId: string;
  members: ClubMemberSummary[];
  filteredMembers: ClubMemberSummary[];
  activeRoleFilter: MemberRoleFilter;
  roleFilterHrefs: Record<MemberRoleFilter, string>;
  returnTo: string;
};

type MemberRoleFilter = "ALL" | ClubMemberRole;

const MEMBER_ROLE_FILTER_OPTIONS: Array<{
  value: MemberRoleFilter;
  label: string;
}> = [
  { value: "ALL", label: "All roles" },
  { value: "OWNER", label: "Owners" },
  { value: "ADMIN", label: "Admins" },
  { value: "MEMBER", label: "Members" },
];

function formatJoinedDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(value);
}

function getMemberDisplayName(member: ClubMemberSummary) {
  return member.name?.trim() || member.email?.trim() || "Unknown reader";
}

export function ClubMembersSection({
  club,
  currentUserId,
  members,
  filteredMembers,
  activeRoleFilter,
  roleFilterHrefs,
  returnTo,
}: ClubMembersSectionProps) {
  const currentUserRole = club.currentUserRole;

  if (!currentUserRole) {
    return null;
  }

  const roleCounts: Record<MemberRoleFilter, number> = {
    ALL: members.length,
    OWNER: members.filter((member) => member.role === "OWNER").length,
    ADMIN: members.filter((member) => member.role === "ADMIN").length,
    MEMBER: members.filter((member) => member.role === "MEMBER").length,
  };
  const showOwnerNote = !canLeaveClub(currentUserRole);
  const showBottomActions = showOwnerNote || canDeleteClub(currentUserRole);

  return (
    <section className="space-y-5 rounded-2xl border border-(--border) bg-(--surface-strong) p-5 shadow-[0_12px_28px_rgba(42,32,18,0.05)] sm:p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Members</h2>
        <p className="max-w-2xl text-sm text-(--muted)">
          See who is reading in this club, filter by role, and manage
          membership when your role allows it.
        </p>
      </div>

      <div className="flex flex-col gap-3 border-t border-(--border)/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {MEMBER_ROLE_FILTER_OPTIONS.map((filter) => {
            const isActive = filter.value === activeRoleFilter;

            return (
              <Link
                key={filter.value}
                href={roleFilterHrefs[filter.value]}
                aria-current={isActive ? "page" : undefined}
                className={buttonStyles({
                  variant: isActive ? "default" : "secondary",
                  size: "sm",
                  className: isActive
                    ? "shadow-[0_8px_18px_rgba(15,97,82,0.18)]"
                    : "",
                })}
              >
                {filter.label}
                <span className="text-xs opacity-80">{roleCounts[filter.value]}</span>
              </Link>
            );
          })}
        </div>
        <p className="text-sm text-(--muted)">
          Showing {filteredMembers.length} of {members.length} member
          {members.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-4">
        {filteredMembers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-(--border) bg-(--surface) p-5 text-sm text-(--muted)">
            No members match this role filter yet.
          </div>
        ) : (
          filteredMembers.map((member) => {
            const displayName = getMemberDisplayName(member);
            const isCurrentUser = member.userId === currentUserId;
            const canPromoteToAdmin =
              canChangeClubMemberRole(currentUserRole, member.role) &&
              member.role === "MEMBER" &&
              !isCurrentUser;
            const canDemoteToMember =
              canChangeClubMemberRole(currentUserRole, member.role) &&
              member.role === "ADMIN" &&
              !isCurrentUser;
            const canRemoveMember =
              canRemoveClubMember(currentUserRole, member.role) && !isCurrentUser;
            const canTransferOwnershipToMember =
              canTransferClubOwnership(currentUserRole) &&
              member.role === "ADMIN" &&
              !isCurrentUser;

            return (
              <Card
                key={member.userId}
                className="border-(--border)/80 bg-(--surface)"
              >
                <CardContent className="flex flex-col gap-4 p-5 pt-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <UserAvatar
                      name={member.name}
                      email={member.email}
                      imageUrl={member.imageUrl}
                      className="h-12 w-12 border border-(--border) bg-(--surface)"
                      fallbackClassName="flex h-full w-full items-center justify-center bg-[#e6ddd0] text-sm font-semibold text-(--foreground)"
                    />

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{displayName}</p>
                        {isCurrentUser ? (
                          <Badge variant="neutral">You</Badge>
                        ) : null}
                        <Badge variant={CLUB_ROLE_BADGE_VARIANTS[member.role]}>
                          {member.role}
                        </Badge>
                      </div>
                      {member.email ? (
                        <p className="text-sm text-(--muted)">{member.email}</p>
                      ) : null}
                      <p className="text-sm text-(--muted)">
                        Joined {formatJoinedDate(member.joinedAt)}
                      </p>
                    </div>
                  </div>

                  {canPromoteToAdmin ||
                  canDemoteToMember ||
                  canRemoveMember ||
                  canTransferOwnershipToMember ? (
                    <div className="flex flex-wrap gap-2 sm:max-w-sm sm:justify-end">
                      {canPromoteToAdmin ? (
                        <form action={changeClubMemberRoleAction}>
                          <input type="hidden" name="clubId" value={club.id} />
                          <input
                            type="hidden"
                            name="targetUserId"
                            value={member.userId}
                          />
                          <input type="hidden" name="nextRole" value="ADMIN" />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="secondary"
                            aria-label={`Make ${displayName} an admin`}
                          >
                            Make admin
                          </Button>
                        </form>
                      ) : null}

                      {canDemoteToMember ? (
                        <form action={changeClubMemberRoleAction}>
                          <input type="hidden" name="clubId" value={club.id} />
                          <input
                            type="hidden"
                            name="targetUserId"
                            value={member.userId}
                          />
                          <input type="hidden" name="nextRole" value="MEMBER" />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="secondary"
                            aria-label={`Make ${displayName} a member`}
                          >
                            Make member
                          </Button>
                        </form>
                      ) : null}

                      {canTransferOwnershipToMember ? (
                        <form action={transferClubOwnershipAction}>
                          <input type="hidden" name="clubId" value={club.id} />
                          <input
                            type="hidden"
                            name="nextOwnerUserId"
                            value={member.userId}
                          />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <Button
                            type="submit"
                            size="sm"
                            aria-label={`Transfer ownership to ${displayName}`}
                          >
                            Transfer ownership
                          </Button>
                        </form>
                      ) : null}

                      {canRemoveMember ? (
                        <form action={removeClubMemberAction}>
                          <input type="hidden" name="clubId" value={club.id} />
                          <input
                            type="hidden"
                            name="targetUserId"
                            value={member.userId}
                          />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="destructive"
                            aria-label={`Remove ${displayName} from the club`}
                          >
                            Remove
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {showBottomActions ? (
        <div className="grid gap-4 border-t border-(--border)/70 pt-5 lg:grid-cols-2">
          {showOwnerNote ? (
            <Card className="border-(--border)/80 bg-(--surface)">
              <CardContent className="space-y-2 p-5 pt-5">
                <h3 className="text-lg font-semibold">Owner note</h3>
                <p className="text-sm text-(--muted)">
                  Owners cannot leave directly. Promote someone to admin,
                  transfer ownership, and then leave if you want the club to
                  continue.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {canDeleteClub(currentUserRole) ? (
            <Card className="border-[#d39e95] bg-[#fff7f5]">
              <CardContent className="space-y-3 p-5 pt-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-[#7e1f14]">
                    Delete club
                  </h3>
                  <p className="text-sm text-[#7e1f14]">
                    Permanently delete this club, including members, invites,
                    books, and discussion history.
                  </p>
                </div>
                <form action={deleteClubAction}>
                  <input type="hidden" name="clubId" value={club.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <Button type="submit" variant="destructive">
                    Delete club
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
