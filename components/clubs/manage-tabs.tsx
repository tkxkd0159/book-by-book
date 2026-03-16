"use client";

import Link from "next/link";
import { useSearchParams, useSelectedLayoutSegment } from "next/navigation";

import {
  createManageSectionHref,
  type ManageSection,
} from "@/lib/clubs/manage-paths";
import { buttonStyles } from "@/components/ui/button";

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
  const activeSection = (segment ?? "members") as ManageSection;
  const activeRole =
    activeSection === "members" ? readRole(searchParams.get("role")) : "ALL";

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={createManageSectionHref({
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
      <Link
        href={createManageSectionHref({
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
      {showInvite ? (
        <Link
          href={createManageSectionHref({
            clubId,
            section: "invite",
          })}
          aria-current={activeSection === "invite" ? "page" : undefined}
          className={buttonStyles({
            variant: activeSection === "invite" ? "default" : "secondary",
            size: "sm",
            className:
              activeSection === "invite"
                ? "shadow-[0_8px_18px_rgba(15,97,82,0.18)]"
                : "",
          })}
        >
          Invite
        </Link>
      ) : null}
    </div>
  );
}
