import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { completeSignupAction } from "@/app/signup/actions";
import {
  DEFAULT_PUBLIC_APP_PATH,
  getAuthenticatedUserDestination,
  normalizeSafeCallbackUrl,
} from "@/lib/auth/redirects";
import { requireCurrentUser } from "@/lib/auth/server";
import {
  FAVORITE_GENRE_GROUPS,
  getFavoriteGenreLabel,
  listSupportedCountryOptions,
  USER_GENDERS,
} from "@/lib/auth/signup";

const SELECT_CLASS_NAME =
  "h-11 w-full rounded-md border border-(--border) bg-(--surface-strong) px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-(--accent) focus:ring-2 focus:ring-(--accent-soft)";

function extractSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function SignupPage({ searchParams }: Props.Page) {
  const params = await searchParams;
  const callbackUrl = normalizeSafeCallbackUrl(
    extractSearchParam(params.callbackUrl) || DEFAULT_PUBLIC_APP_PATH,
    DEFAULT_PUBLIC_APP_PATH,
  );
  const currentUser = await requireCurrentUser({
    allowIncompletePublicUser: true,
    callbackUrl,
  });

  if (currentUser.isSignupComplete) {
    redirect(getAuthenticatedUserDestination(currentUser, callbackUrl));
  }

  const errorMessage = extractSearchParam(params.error);
  const countryOptions = listSupportedCountryOptions();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-14 sm:px-6 lg:px-8">
      <Card className="w-full border-2 bg-(--surface-strong)">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-3xl">Finish your Book by Book signup</CardTitle>
            <CardDescription className="max-w-2xl">
              Your Google account is connected. Before beta access opens, set the
              nickname and profile details Book by Book will use across shelves,
              clubs, reviews, and invites.
            </CardDescription>
          </div>
          <SignOutButton variant="secondary">Use a different account</SignOutButton>
        </CardHeader>
        <CardContent className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]">
          <form action={completeSignupAction} className="space-y-6">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />

            {errorMessage ? (
              <p className="rounded-md border border-[#d39e95] bg-[#fff2ef] p-3 text-sm text-[#7e1f14]">
                {errorMessage}
              </p>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-foreground">
                <span>Nickname</span>
                <Input
                  name="nickname"
                  placeholder="reader-handle"
                  autoComplete="nickname"
                  required
                />
                <span className="block text-xs font-normal text-(--muted)">
                  Lowercase only, 3-20 characters, and used in share links and invites.
                </span>
              </label>

              <label className="space-y-2 text-sm font-medium text-foreground">
                <span>Gender</span>
                <select name="gender" className={SELECT_CLASS_NAME} defaultValue="" required>
                  <option value="" disabled>
                    Select your gender
                  </option>
                  {USER_GENDERS.map((gender) => (
                    <option key={gender} value={gender}>
                      {gender
                        .toLowerCase()
                        .split("_")
                        .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
                        .join(" ")}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium text-foreground">
              <span>Country</span>
              <select
                name="countryCode"
                className={SELECT_CLASS_NAME}
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Select your country
                </option>
                {countryOptions.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">
                Favorite genres
              </legend>
              <p className="text-sm text-(--muted)">
                Pick at least one. These shape your beta profile from day one.
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                {FAVORITE_GENRE_GROUPS.map((group) => (
                  <div
                    key={group.label}
                    className="rounded-xl border border-(--border) bg-(--surface) p-4"
                  >
                    <h2 className="text-sm font-semibold text-foreground">
                      {group.label}
                    </h2>
                    <div className="mt-3 grid gap-2">
                      {group.genres.map((genre) => (
                        <label
                          key={genre.key}
                          className="flex items-start gap-3 rounded-lg border border-transparent px-2 py-1.5 text-sm text-foreground transition hover:border-(--border)"
                        >
                          <input
                            type="checkbox"
                            name="favoriteGenres"
                            value={genre.key}
                            className="mt-0.5 h-4 w-4 rounded border-(--border)"
                          />
                          <span>{getFavoriteGenreLabel(genre.key)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>

            <label className="space-y-2 text-sm font-medium text-foreground">
              <span>Invitation code</span>
              <Input
                name="invitationCode"
                placeholder="ABCDE-12345-FGHIJ-67890"
                autoCapitalize="characters"
                autoCorrect="off"
                required
              />
              <span className="block text-xs font-normal text-(--muted)">
                Beta access is limited to invited readers.
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className={buttonStyles({ size: "lg" })}>
                Complete signup
              </button>
              <p className="text-sm text-(--muted)">
                You can sign out if this is the wrong account.
              </p>
            </div>
          </form>

          <aside className="space-y-4 rounded-2xl border border-(--border) bg-(--surface) p-5">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Connected account
              </p>
              <p className="mt-2 text-sm text-(--muted)">
                {currentUser.email ?? "No provider email returned"}
              </p>
              {currentUser.name ? (
                <p className="mt-1 text-sm text-(--muted)">
                  Provider name: {currentUser.name}
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-(--border) bg-(--surface-strong) p-4">
              <p className="text-sm font-semibold text-foreground">
                What changes after this step
              </p>
              <ul className="mt-3 space-y-2 text-sm text-(--muted)">
                <li>Your nickname becomes your Book by Book identity.</li>
                <li>Reader routes unlock after the beta code is redeemed.</li>
                <li>Future shelf sharing and club invites will use the nickname, not your email.</li>
              </ul>
            </div>
          </aside>
        </CardContent>
      </Card>
    </main>
  );
}
