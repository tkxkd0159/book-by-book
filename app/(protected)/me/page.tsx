import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { UserAvatar } from "@/components/auth/user-avatar";
import { Badge } from "@/components/ui/badge";
import { requireCurrentUser } from "@/lib/auth/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCountryName } from "@/lib/auth/signup";
import { getPublicUserIdentityLabel } from "@/lib/auth/users";
import { createMyReviewedHref } from "@/lib/reviews/view-paths";
import { createMyShelvesHref } from "@/lib/shelves/view-paths";

function fallbackText(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

function formatGenderLabel(value: string | null) {
  if (!value) {
    return "Unavailable";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function MePage() {
  const user = await requireCurrentUser();
  const displayName = getPublicUserIdentityLabel(user);
  const countryName = getCountryName(user.countryCode);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold sm:text-4xl">Profile</h1>
        <p className="text-(--muted)">
          Your account information used for Book by Book.
        </p>
      </section>

      <Card className="border-2">
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <UserAvatar
            name={displayName}
            email={user.email}
            imageUrl={user.imageUrl}
            alt="Profile avatar"
            className="h-24 w-24 border border-(--border) bg-(--surface) text-2xl font-semibold text-foreground shadow-sm"
          />

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">{displayName}</h2>
            <p className="text-(--muted)">Nickname: {user.nickname}</p>
            {user.email ? (
              <p className="text-sm text-(--muted)">Connected email: {user.email}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gender</CardTitle>
            <CardDescription>Collected during signup</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{formatGenderLabel(user.gender)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Country</CardTitle>
            <CardDescription>Reader location</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm font-medium">
              {countryName ?? fallbackText(user.countryCode, "Unavailable")}
            </p>
            {user.countryCode ? (
              <p className="text-xs text-(--muted)">{user.countryCode}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Favorite genres</CardTitle>
            <CardDescription>Used for onboarding and recommendations later</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {user.favoriteGenres.length > 0 ? (
              user.favoriteGenres.map((genre) => <Badge key={genre}>{genre}</Badge>)
            ) : (
              <p className="text-sm text-(--muted)">No favorite genres saved.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User ID</CardTitle>
            <CardDescription>Internal identifier</CardDescription>
          </CardHeader>
          <CardContent>
            <code className="break-all rounded-md bg-(--surface) px-2 py-1 text-xs">
              {fallbackText(user.id, "Unavailable")}
            </code>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(42,32,18,0.12)] focus-within:-translate-y-1 focus-within:shadow-[0_18px_34px_rgba(42,32,18,0.12)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-(--accent)/70 via-[#cb8b39]/50 to-(--accent)/70" />
          <Link
            href={createMyShelvesHref()}
            aria-label="Open my shelves"
            className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-soft) focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface-strong)"
          />

          <CardHeader className="relative z-10 space-y-1.5 pointer-events-none">
            <CardTitle className="text-lg">Shelves</CardTitle>
            <CardDescription>Personal reading lists</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 space-y-4 pointer-events-none">
            <p className="text-sm leading-6 text-(--muted)">
              Create public or private shelves to organize books outside your
              clubs.
            </p>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-(--accent)">
              Open my shelves
              <ArrowRight
                aria-hidden
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-focus-within:translate-x-0.5"
              />
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(42,32,18,0.12)] focus-within:-translate-y-1 focus-within:shadow-[0_18px_34px_rgba(42,32,18,0.12)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-(--accent)/70 via-[#cb8b39]/50 to-(--accent)/70" />
          <Link
            href={createMyReviewedHref()}
            aria-label="Open reviewed books"
            className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-soft) focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface-strong)"
          />

          <CardHeader className="relative z-10 space-y-1.5 pointer-events-none">
            <CardTitle className="text-lg">Reviewed</CardTitle>
            <CardDescription>Your ratings and written thoughts</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 space-y-4 pointer-events-none">
            <p className="text-sm leading-6 text-(--muted)">
              Keep track of the books you have rated and revisit your reviews.
            </p>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-(--accent)">
              Open reviewed books
              <ArrowRight
                aria-hidden
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-focus-within:translate-x-0.5"
              />
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
