import {
  createInvitationAction,
  revokeInvitationAction,
} from "@/app/(protected)/clubs/actions";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ClubInvitationWithClub } from "@/lib/clubs/repository";

type ClubInvitationsSectionProps = {
  clubId: string;
  invitations: ClubInvitationWithClub[];
  inviteLink: string | null;
  returnTo: string;
};

export function ClubInvitationsSection({
  clubId,
  invitations,
  inviteLink,
  returnTo,
}: ClubInvitationsSectionProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-(--border) bg-(--surface-strong) p-5 shadow-[0_12px_28px_rgba(42,32,18,0.05)] sm:p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Private invites</h2>
        <p className="max-w-2xl text-sm text-(--muted)">
          Create shareable links for private access and keep an eye on which
          invitations are still active.
        </p>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Create invite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={createInvitationAction}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input type="hidden" name="clubId" value={clubId} />
            <input type="hidden" name="returnTo" value={returnTo} />
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

      <div className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold">Invite history</h3>
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
                <CardContent className="flex flex-col gap-4 p-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{invitation.effectiveStatus}</Badge>
                      <Badge className="bg-(--surface)/85">
                        Expires{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          dateStyle: "medium",
                        }).format(invitation.expiresAt)}
                      </Badge>
                    </div>
                    <p className="font-medium">
                      {invitation.invitedEmail ?? "No email target"}
                    </p>
                  </div>

                  {invitation.effectiveStatus === "PENDING" ? (
                    <form action={revokeInvitationAction}>
                      <input type="hidden" name="clubId" value={clubId} />
                      <input type="hidden" name="returnTo" value={returnTo} />
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
      </div>
    </section>
  );
}
