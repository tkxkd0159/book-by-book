"use client";

import Link from "next/link";
import { useSearchParams, useSelectedLayoutSegment } from "next/navigation";

import {
  createClubSectionHref,
  type ClubViewSection,
} from "@/lib/clubs/view-paths";
import { buttonStyles } from "@/components/ui/button";

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
      <Link
        href={createClubSectionHref({
          clubId,
          section: "board",
        })}
        aria-current={activeSection === "board" ? "page" : undefined}
        className={buttonStyles({
          variant: activeSection === "board" ? "default" : "secondary",
          size: "sm",
          className:
            activeSection === "board"
              ? "shadow-[0_8px_18px_rgba(15,97,82,0.18)]"
              : "",
        })}
      >
        Reading board
      </Link>
      {showMembers ? (
        <Link
          href={createClubSectionHref({
            clubId,
            section: "members",
            role: activeRole,
          })}
          aria-current={activeSection === "members" ? "page" : undefined}
          className={buttonStyles({
            variant: activeSection === "members" ? "default" : "secondary",
            size: "sm",
            className:
              activeSection === "members"
                ? "shadow-[0_8px_18px_rgba(15,97,82,0.18)]"
                : "",
          })}
        >
          Members
        </Link>
      ) : null}
    </div>
  );
}
