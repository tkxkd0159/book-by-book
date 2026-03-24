import Link from "next/link";

import { acceptInvitationAction } from "@/app/(protected)/clubs/actions";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlashToast } from "@/components/ui/flash-toast";
import { requireCurrentUser } from "@/lib/auth/server";
import { getPublicUserIdentityLabel } from "@/lib/auth/users";
import { findInvitationByToken } from "@/lib/clubs/repository";

type InvitationPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function InvitationPage({
  params,
  searchParams,
}: InvitationPageProps) {
  const currentUser = await requireCurrentUser();

  const [{ token }, paramsData] = await Promise.all([params, searchParams]);
  const invitation = await findInvitationByToken(token);
  const error = readMessage(paramsData.error);
  const isTargetMatch =
    !!invitation && invitation.invitedUserId === currentUser.id;
  const currentReaderLabel = getPublicUserIdentityLabel(currentUser);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FlashToast key={`${error ?? ""}`} error={error} />

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold sm:text-4xl">Club Invitation</h1>
        <p className="text-(--muted)">
          Review the invite and accept it with the matching signed-in reader.
        </p>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>
            {invitation && isTargetMatch
              ? `${invitation.invitedNickname}, you're invited to ${invitation.clubName}!`
              : "Invite Unavailable"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invitation ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge>{invitation.effectiveStatus}</Badge>
              </div>
              <p className="text-sm text-(--muted)">
                Signed in as {currentReaderLabel}.
              </p>

              {invitation.effectiveStatus === "PENDING" && isTargetMatch ? (
                <form
                  action={acceptInvitationAction}
                  className="flex flex-wrap gap-2"
                >
                  <input type="hidden" name="token" value={token} />
                  <button type="submit" className={buttonStyles({})}>
                    Accept invitation
                  </button>
                  <Link
                    href="/clubs"
                    className={buttonStyles({ variant: "secondary" })}
                  >
                    Cancel
                  </Link>
                </form>
              ) : (
                <div className="space-y-3">
                  {!isTargetMatch &&
                  invitation.effectiveStatus === "PENDING" ? (
                    <p className="rounded-xl border border-[#e4cf8d] bg-[#fff8df] px-4 py-3 text-sm text-[#7a6110]">
                      This invite was created for a different reader.
                    </p>
                  ) : null}
                  <Link
                    href="/clubs"
                    className={buttonStyles({ variant: "secondary" })}
                  >
                    Back to clubs
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-(--muted)">
                This invite does not exist or is no longer available.
              </p>
              <Link
                href="/clubs"
                className={buttonStyles({ variant: "secondary" })}
              >
                Back to clubs
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
