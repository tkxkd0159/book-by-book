"use client";

import { signOut } from "next-auth/react";

import {
  E2E_AUTH_COOKIE_NAME,
  E2E_TEST_ROUTE_PATHS,
} from "@/lib/test-harness/constants";

function hasE2EBypassSessionCookie() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim().startsWith(`${E2E_AUTH_COOKIE_NAME}=`));
}

function createE2EBypassLogoutHref(callbackUrl: string) {
  return `${E2E_TEST_ROUTE_PATHS.logout}?returnTo=${encodeURIComponent(callbackUrl)}`;
}

export async function signOutClientSession(callbackUrl: string) {
  if (hasE2EBypassSessionCookie()) {
    window.location.assign(createE2EBypassLogoutHref(callbackUrl));
    return;
  }

  await signOut({ callbackUrl });
}
