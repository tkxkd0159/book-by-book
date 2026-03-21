const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Google sign-in was denied.",
  Callback: "Authentication callback failed. Try again.",
  Configuration: "Authentication is misconfigured. Contact support.",
  EmailReserved:
    "This email is already reserved for another Book by Book account.",
  OAuthAccountNotLinked:
    "This account is linked to a different sign-in method.",
  OAuthCallback: "Google callback failed. Try again.",
  OAuthCreateAccount: "Could not create your account. Try again.",
  OAuthSignin: "Failed to start Google sign-in. Try again.",
  Verification:
    "This verification link is invalid or expired. Request a new one.",
  Default: "Sign-in failed. Try again.",
};

export function resolveAuthErrorMessage(errorCode: string) {
  if (!errorCode) {
    return null;
  }

  return AUTH_ERROR_MESSAGES[errorCode] ?? AUTH_ERROR_MESSAGES.Default;
}
