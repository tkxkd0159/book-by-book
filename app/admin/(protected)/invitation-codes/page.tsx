import { FlashToast } from "@/components/ui/flash-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvitationCodeCreateForm } from "@/components/admin/invitation-code-create-form";
import { updateInvitationCodeStatusAction } from "@/app/admin/(protected)/invitation-codes/actions";
import { listInvitationCodes } from "@/lib/invitation-codes/repository";

function extractSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function formatDateTime(value: Date | null) {
  if (!value) {
    return "No expiry";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminInvitationCodesPage({
  searchParams,
}: Props.Page) {
  const params = await searchParams;
  const invitationCodes = await listInvitationCodes();
  const message = extractSearchParam(params.message);
  const error = extractSearchParam(params.error);

  return (
    <div className="space-y-6">
      <FlashToast key={`${message}:${error}`} message={message} error={error} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <InvitationCodeCreateForm />

        <div className="rounded-2xl border border-(--border) bg-(--surface-strong) p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Invitation codes
              </h2>
              <p className="mt-1 text-sm text-(--muted)">
                Status is derived from activation, expiry, and successful redemption count.
              </p>
            </div>
            <Badge className="bg-(--surface)">
              {invitationCodes.length} total
            </Badge>
          </div>

          <div className="mt-5 space-y-4">
            {invitationCodes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-(--border) bg-(--surface) p-6 text-sm text-(--muted)">
                No invitation codes yet. Create one to grant beta signup access.
              </div>
            ) : (
              invitationCodes.map((invitationCode) => (
                <article
                  key={invitationCode.id}
                  className="flex h-full flex-col rounded-2xl border border-(--border) bg-(--surface) p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {invitationCode.label}
                        </h3>
                        <Badge>{invitationCode.status}</Badge>
                        <Badge className="bg-(--surface-strong)">
                          {invitationCode.purpose}
                        </Badge>
                      </div>
                      <p className="text-sm text-(--muted)">
                        Created by {invitationCode.createdBy.displayName}
                        {invitationCode.createdBy.email
                          ? ` (${invitationCode.createdBy.email})`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-4 text-sm text-(--muted) md:grid-cols-4">
                    <div>
                      <dt className="font-medium text-foreground">Uses</dt>
                      <dd className="mt-1">
                        {invitationCode.redemptionCount}
                        {invitationCode.maxUses !== null
                          ? ` / ${invitationCode.maxUses}`
                          : " / unlimited"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Remaining</dt>
                      <dd className="mt-1">
                        {invitationCode.remainingUses ?? "Unlimited"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Expires</dt>
                      <dd className="mt-1">{formatDateTime(invitationCode.expiresAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Created</dt>
                      <dd className="mt-1">{formatDateTime(invitationCode.createdAt)}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 rounded-xl border border-(--border) bg-(--surface-strong) p-4">
                    <p className="text-sm font-medium text-foreground">
                      Usage details
                    </p>
                    {invitationCode.redemptions.length === 0 ? (
                      <p className="mt-2 text-sm text-(--muted)">
                        No successful redemptions yet.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2 text-sm text-(--muted)">
                        {invitationCode.redemptions.map((redemption) => (
                          <li key={redemption.id} className="flex flex-wrap gap-2">
                            <span className="font-medium text-foreground">
                              {redemption.displayName}
                            </span>
                            {redemption.email ? <span>({redemption.email})</span> : null}
                            <span>redeemed on {formatDateTime(redemption.createdAt)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-auto flex justify-end border-t border-(--border) pt-4">
                    <form action={updateInvitationCodeStatusAction}>
                      <input type="hidden" name="codeId" value={invitationCode.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={invitationCode.isActive ? "false" : "true"}
                      />
                      <Button type="submit" variant="secondary">
                        {invitationCode.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </form>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
