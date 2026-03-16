import Link from "next/link";
import { headers } from "next/headers";
import { forbidden, notFound } from "next/navigation";

import {
  createInvitationAction,
  revokeInvitationAction,
} from "@/app/(protected)/clubs/actions";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isClubAdmin } from "@/lib/clubs/permissions";
import {
  findClubDetail,
  listClubInvitations,
} from "@/lib/clubs/repository";
import { getCurrentUser } from "@/lib/auth/server";

type ClubInvitePageProps = {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
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

export default async function ClubInvitePage({
  params,
  searchParams,
}: ClubInvitePageProps) {
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

  const invitations = await listClubInvitations(clubId, currentUser.id);
  const message = readMessage(paramsData.message);
  const error = readMessage(paramsData.error);
  const token = readMessage(paramsData.token);
  const inviteLink = await getInviteLink(token);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold sm:text-4xl">
            Invite members to {club.name}
          </h1>
          <p className="text-(--muted)">
            Create shareable links for private access and manage pending invites.
          </p>
        </div>

        <Link
          href={`/clubs/${club.id}`}
          className={buttonStyles({ variant: "secondary" })}
        >
          Back to club
        </Link>
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

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Create invite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={createInvitationAction} className="flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="clubId" value={club.id} />
            <label className="flex-1 space-y-2 text-sm font-medium">
              <span>Email</span>
              <Input
                name="invitedEmail"
                type="email"
                placeholder="friend@example.com"
                required
              />
            </label>
            <div className="flex items-end">
              <button type="submit" className={buttonStyles({})}>
                Create invite
              </button>
            </div>
          </form>

          {inviteLink ? (
            <label className="block space-y-2 text-sm font-medium">
              <span>Most recent invite link</span>
              <Input readOnly value={inviteLink} />
            </label>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Invite history</h2>
          <p className="text-sm text-(--muted)">
            Pending invites remain usable until they expire or you revoke them.
          </p>
        </div>

        {invitations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-(--border) bg-(--surface) p-6 text-sm text-(--muted)">
            No invites yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {invitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{invitation.effectiveStatus}</Badge>
                      <Badge className="bg-(--surface)/85">
                        Expires {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(invitation.expiresAt)}
                      </Badge>
                    </div>
                    <p className="font-medium">
                      {invitation.invitedEmail ?? "No email target"}
                    </p>
                  </div>

                  {invitation.effectiveStatus === "PENDING" ? (
                    <form action={revokeInvitationAction}>
                      <input type="hidden" name="clubId" value={club.id} />
                      <input
                        type="hidden"
                        name="invitationId"
                        value={invitation.id}
                      />
                      <button
                        type="submit"
                        className={buttonStyles({ variant: "destructive" })}
                      >
                        Revoke
                      </button>
                    </form>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
