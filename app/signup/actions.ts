"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAuthFlowError } from "@/lib/auth/errors";
import { completeSignup } from "@/lib/auth/onboarding";
import {
  DEFAULT_PUBLIC_APP_PATH,
  normalizeSafeCallbackUrl,
} from "@/lib/auth/redirects";
import { requireCurrentUser } from "@/lib/auth/server";

function appendSignupError(callbackUrl: string, message: string) {
  const url = new URL("/signup", "http://localhost");
  url.searchParams.set("callbackUrl", callbackUrl);
  url.searchParams.set("error", message);
  return `${url.pathname}${url.search}`;
}

export async function completeSignupAction(formData: FormData) {
  const callbackUrlValue = formData.get("callbackUrl");
  const nicknameValue = formData.get("nickname");
  const genderValue = formData.get("gender");
  const countryCodeValue = formData.get("countryCode");
  const invitationCodeValue = formData.get("invitationCode");
  const callbackUrl = normalizeSafeCallbackUrl(
    typeof callbackUrlValue === "string"
      ? callbackUrlValue
      : DEFAULT_PUBLIC_APP_PATH,
    DEFAULT_PUBLIC_APP_PATH,
  );

  const currentUser = await requireCurrentUser({
    allowIncompletePublicUser: true,
    callbackUrl,
  });

  try {
    await completeSignup({
      userId: currentUser.id,
      nickname: typeof nicknameValue === "string" ? nicknameValue : "",
      gender: typeof genderValue === "string" ? genderValue : "",
      countryCode:
        typeof countryCodeValue === "string" ? countryCodeValue : "",
      favoriteGenres: formData
        .getAll("favoriteGenres")
        .filter((value): value is string => typeof value === "string"),
      invitationCode:
        typeof invitationCodeValue === "string" ? invitationCodeValue : "",
    });

    revalidatePath("/");
    revalidatePath("/books/search");
    revalidatePath("/clubs");
    revalidatePath("/me");
    redirect(callbackUrl);
  } catch (error) {
    if (isAuthFlowError(error)) {
      redirect(appendSignupError(callbackUrl, error.message));
    }

    console.error(error);
    redirect(
      appendSignupError(callbackUrl, "Something went wrong. Please try again."),
    );
  }
}
