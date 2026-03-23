"use client";

import { useSearchParams, useSelectedLayoutSegment } from "next/navigation";

import {
  createClubSectionHref,
  type ClubViewSection,
} from "@/lib/clubs/view-paths";

import { ClubTabLink } from "@/components/clubs/club-tab-link";

type ClubOverviewTabsProps = {
  clubId: string;
  showMembers: boolean;
};

function readRole(value: string | null) {
  if (value === "OWNER" || value === "ADMIN" || value === "MEMBER") {
    return value;
  }

  return "ALL";
}

export function ClubOverviewTabs({
  clubId,
  showMembers,
}: ClubOverviewTabsProps) {
  const segment = useSelectedLayoutSegment();
  const searchParams = useSearchParams();
  const activeSection = (segment ?? "board") as ClubViewSection;
  const activeRole =
    activeSection === "members" ? readRole(searchParams.get("role")) : "ALL";

  return (
    <div className="flex flex-wrap gap-2">
      <ClubTabLink
        href={createClubSectionHref({
          clubId,
          section: "board",
        })}
        isActive={activeSection === "board"}
      >
        Reading board
      </ClubTabLink>
      {showMembers ? (
        <ClubTabLink
          href={createClubSectionHref({
            clubId,
            section: "members",
            role: activeRole,
          })}
          isActive={activeSection === "members"}
        >
          Members
        </ClubTabLink>
      ) : null}
    </div>
  );
}
