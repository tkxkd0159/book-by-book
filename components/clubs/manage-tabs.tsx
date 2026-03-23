"use client";

import { useSearchParams, useSelectedLayoutSegment } from "next/navigation";

import {
  createManageSectionHref,
  type ManageSection,
} from "@/lib/clubs/manage-paths";

import { ClubTabLink } from "@/components/clubs/club-tab-link";

type ManageTabsProps = {
  clubId: string;
  showInvite: boolean;
};

function readRole(value: string | null) {
  if (value === "OWNER" || value === "ADMIN" || value === "MEMBER") {
    return value;
  }

  return "ALL";
}

export function ManageTabs({ clubId, showInvite }: ManageTabsProps) {
  const segment = useSelectedLayoutSegment();
  const searchParams = useSearchParams();
  const activeSection = (segment ?? "board") as ManageSection;
  const activeRole =
    activeSection === "members" ? readRole(searchParams.get("role")) : "ALL";

  return (
    <div className="flex flex-wrap gap-2">
      <ClubTabLink
        href={createManageSectionHref({
          clubId,
          section: "board",
        })}
        isActive={activeSection === "board"}
      >
        Reading board
      </ClubTabLink>
      <ClubTabLink
        href={createManageSectionHref({
          clubId,
          section: "members",
          role: activeRole,
        })}
        isActive={activeSection === "members"}
      >
        Members
      </ClubTabLink>

      {showInvite ? (
        <ClubTabLink
          href={createManageSectionHref({
            clubId,
            section: "invite",
          })}
          isActive={activeSection === "invite"}
        >
          Invite
        </ClubTabLink>
      ) : null}
    </div>
  );
}
