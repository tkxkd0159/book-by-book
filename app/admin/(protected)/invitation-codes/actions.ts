"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  INITIAL_INVITATION_CODE_CREATE_STATE,
  type InvitationCodeCreateActionState,
} from "@/app/admin/(protected)/invitation-codes/action-state";
import { AuthFlowError, isAuthFlowError } from "@/lib/auth/errors";
import { formatInvitationCodeForDisplay } from "@/lib/invitation-codes/core";
import {
  createInvitationCode,
  updateInvitationCodeActiveState,
} from "@/lib/invitation-codes/repository";
import { requireInternalAdminUser } from "@/lib/auth/server";

function appendMessage(pathname: string, key: string, value: string) {
  const url = new URL(pathname, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

export async function createInvitationCodeAction(
  _previousState: InvitationCodeCreateActionState,
  formData: FormData,
): Promise<InvitationCodeCreateActionState> {
  const currentUser = await requireInternalAdminUser();
  const labelValue = formData.get("label");
  const purposeValue = formData.get("purpose");
  const maxUsesValue = formData.get("maxUses");
  const expiresAtValue = formData.get("expiresAt");

  try {
    const result = await createInvitationCode({
      createdById: currentUser.id,
      label: typeof labelValue === "string" ? labelValue : "",
      purpose: typeof purposeValue === "string" ? purposeValue : "BETA_SIGNUP",
      maxUses: typeof maxUsesValue === "string" ? maxUsesValue : null,
      expiresAt: typeof expiresAtValue === "string" ? expiresAtValue : null,
    });

    revalidatePath("/admin/invitation-codes");
    return {
      status: "success",
      error: null,
      rawCode: result.rawCode,
      formattedCode: formatInvitationCodeForDisplay(result.rawCode),
      label: result.invitationCode.label,
    };
  } catch (error) {
    if (isAuthFlowError(error)) {
      return {
        ...INITIAL_INVITATION_CODE_CREATE_STATE,
        status: "error",
        error: error.message,
      };
    }

    console.error(error);
    return {
      ...INITIAL_INVITATION_CODE_CREATE_STATE,
      status: "error",
      error: "Something went wrong. Please try again.",
    };
  }
}

export async function updateInvitationCodeStatusAction(formData: FormData) {
  await requireInternalAdminUser();

  const codeIdValue = formData.get("codeId");
  const isActiveValue = formData.get("isActive");
  const codeId = typeof codeIdValue === "string" ? codeIdValue : "";
  const nextIsActive =
    typeof isActiveValue === "string"
      ? isActiveValue === "true"
      : false;

  if (!codeId) {
    redirect(
      appendMessage(
        "/admin/invitation-codes",
        "error",
        "Invitation code is required.",
      ),
    );
  }

  try {
    await updateInvitationCodeActiveState({
      codeId,
      isActive: nextIsActive,
    });
    revalidatePath("/admin/invitation-codes");
    redirect(
      appendMessage(
        "/admin/invitation-codes",
        "message",
        nextIsActive ? "Invitation code activated." : "Invitation code deactivated.",
      ),
    );
  } catch (error) {
    if (error instanceof AuthFlowError) {
      redirect(appendMessage("/admin/invitation-codes", "error", error.message));
    }

    console.error(error);
    redirect(
      appendMessage(
        "/admin/invitation-codes",
        "error",
        "Something went wrong. Please try again.",
      ),
    );
  }
}
