import Link from "next/link";

import { UserAvatar } from "@/components/auth/user-avatar";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { requireCurrentUser } from "@/lib/auth/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createMyReviewedHref } from "@/lib/reviews/view-paths";
import { createMyShelvesHref } from "@/lib/shelves/view-paths";

function fallbackText(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

export default async function MePage() {
  const user = await requireCurrentUser();

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
            name={user.name}
            email={user.email}
            imageUrl={user.imageUrl}
            alt="Profile avatar"
            className="h-24 w-24 border border-(--border) bg-(--surface) text-2xl font-semibold text-foreground shadow-sm"
          />

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">
              {fallbackText(user.name, "Book by Book Member")}
            </h2>
            <p className="text-(--muted)">
              {fallbackText(user.email, "No email found")}
            </p>
            <Badge>Google Account</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shelves</CardTitle>
            <CardDescription>Personal reading lists</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-(--muted)">
              Create public or private shelves to organize books outside your clubs.
            </p>
            <Link
              href={createMyShelvesHref()}
              className={buttonStyles({ variant: "secondary" })}
            >
              Open my shelves
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reviewed</CardTitle>
            <CardDescription>Your ratings and written thoughts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-(--muted)">
              Keep track of the books you have rated and revisit your reviews.
            </p>
            <Link
              href={createMyReviewedHref()}
              className={buttonStyles({ variant: "secondary" })}
            >
              Open reviewed books
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
