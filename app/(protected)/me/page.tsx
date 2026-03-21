import Link from "next/link";
import { ArrowRight, BookOpen, Mail, MapPin, User } from "lucide-react";

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
import { getCountryName, getFavoriteGenreLabel } from "@/lib/auth/signup";
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
      <Card className="border-2">
        <div className="h-24 bg-[radial-gradient(circle_at_top_left,rgba(15,97,82,0.18),transparent_48%),linear-gradient(135deg,rgba(255,246,222,0.85),rgba(214,236,230,0.7))]" />
        <CardContent className="relative flex flex-col gap-6 p-6 pt-0 sm:p-8 sm:pt-0">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <UserAvatar
                name={displayName}
                email={user.email}
                imageUrl={user.imageUrl}
                alt="Profile avatar"
                fallbackVariant="person"
                className="h-24 w-24 border-4 border-(--surface-strong) bg-(--surface) text-2xl font-semibold text-foreground shadow-sm"
              />

              <div className="space-y-2 pb-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--muted)">
                  Reader profile
                </p>
                <h2 className="text-2xl font-semibold sm:text-3xl">
                  {displayName}
                </h2>
              </div>
            </div>
          </div>

          <div className="divide-y divide-(--border)/60">
            <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:gap-6">
              <div className="flex items-center gap-3 sm:w-44 sm:shrink-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-(--surface) text-(--accent) shadow-sm">
                  <Mail aria-hidden className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--muted)">
                  Email
                </p>
              </div>
              <p className="min-w-0 flex-1 break-all pt-1 text-sm font-medium text-foreground">
                {fallbackText(user.email, "Unavailable")}
              </p>
            </div>

            <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:gap-6">
              <div className="flex items-center gap-3 sm:w-44 sm:shrink-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-(--surface) text-(--accent) shadow-sm">
                  <User aria-hidden className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--muted)">
                  Gender
                </p>
              </div>
              <p className="min-w-0 flex-1 pt-1 text-sm font-medium text-foreground">
                {formatGenderLabel(user.gender)}
              </p>
            </div>

            <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:gap-6">
              <div className="flex items-center gap-3 sm:w-44 sm:shrink-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-(--surface) text-(--accent) shadow-sm">
                  <MapPin aria-hidden className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--muted)">
                  Country
                </p>
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-sm font-medium text-foreground">
                  {countryName ?? fallbackText(user.countryCode, "Unavailable")}
                </p>
                {user.countryCode ? (
                  <p className="mt-1 text-xs text-(--muted)">
                    {user.countryCode}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:gap-6">
              <div className="flex items-center gap-3 sm:w-44 sm:shrink-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-(--surface) text-(--accent) shadow-sm">
                  <BookOpen aria-hidden className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--muted)">
                  Favorite genres
                </p>
              </div>
              <div className="min-w-0 flex-1 pt-1">
                {user.favoriteGenres.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.favoriteGenres.map((genre) => (
                      <Badge key={genre}>{getFavoriteGenreLabel(genre)}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-(--muted)">
                    No favorite genres saved.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
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
