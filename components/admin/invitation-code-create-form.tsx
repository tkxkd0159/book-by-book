"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  INITIAL_INVITATION_CODE_CREATE_STATE,
} from "@/app/admin/(protected)/invitation-codes/action-state";
import {
  createInvitationCodeAction,
} from "@/app/admin/(protected)/invitation-codes/actions";

const SELECT_CLASS_NAME =
  "h-11 w-full rounded-md border border-(--border) bg-(--surface-strong) px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-(--accent) focus:ring-2 focus:ring-(--accent-soft)";

export function InvitationCodeCreateForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction, isPending] = useActionState(
    createInvitationCodeAction,
    INITIAL_INVITATION_CODE_CREATE_STATE,
  );

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }, [router, state.status]);

  return (
    <div className="space-y-4 rounded-2xl border border-(--border) bg-(--surface) p-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Create beta code</h2>
        <p className="mt-1 text-sm text-(--muted)">
          New codes are generated server-side and only the hash is stored.
        </p>
      </div>

      {state.status === "error" && state.error ? (
        <p className="rounded-md border border-[#d39e95] bg-[#fff2ef] p-3 text-sm text-[#7e1f14]">
          {state.error}
        </p>
      ) : null}

      {state.status === "success" && state.rawCode ? (
        <div className="rounded-xl border border-[#b9d6cf] bg-[#eef9f5] p-4 text-sm text-[#125547]">
          <p className="font-semibold">Copy this code now</p>
          <p className="mt-2 font-mono text-base tracking-[0.16em]">
            {state.formattedCode}
          </p>
          <p className="mt-2 text-xs text-[#125547]/80">
            Label: {state.label}. The raw value is only shown in this success panel.
          </p>
        </div>
      ) : null}

      <form ref={formRef} action={formAction} className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-foreground md:col-span-2">
          <span>Label</span>
          <Input name="label" placeholder="Beta cohort A" required />
        </label>

        <label className="space-y-2 text-sm font-medium text-foreground">
          <span>Purpose</span>
          <select
            name="purpose"
            defaultValue="BETA_SIGNUP"
            className={SELECT_CLASS_NAME}
          >
            <option value="BETA_SIGNUP">BETA_SIGNUP</option>
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-foreground">
          <span>Max uses</span>
          <Input
            name="maxUses"
            type="number"
            min="1"
            step="1"
            placeholder="Leave blank for unlimited"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-foreground md:col-span-2">
          <span>Expires at</span>
          <Input name="expiresAt" type="datetime-local" />
        </label>

        <div className="md:col-span-2">
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Generating..." : "Create invitation code"}
          </Button>
        </div>
      </form>
    </div>
  );
}
