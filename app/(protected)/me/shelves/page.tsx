import Link from "next/link";

import { ShelfCard } from "@/components/shelves/shelf-card";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/server";
import { listUserShelves } from "@/lib/shelves/repository";
import {
  createMyShelfHref,
  createNewShelfHref,
} from "@/lib/shelves/view-paths";

function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function MyShelvesPage({ searchParams }: Props.Page) {
  const [currentUser, params] = await Promise.all([
    requireCurrentUser(),
    searchParams,
  ]);
  const [shelves] = await Promise.all([listUserShelves(currentUser.id)]);
  const message = readMessage(params.message);
  const error = readMessage(params.error);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold sm:text-4xl">My shelves</h1>
          <p className="text-(--muted)">
            Organize personal reading lists that stay separate from your clubs.
          </p>
        </div>

        <Link href={createNewShelfHref()} className={buttonStyles({})}>
          Create shelf
        </Link>
      </div>

      {message ? (
        <p className="rounded-xl border border-[#b9d6cf] bg-[#eef9f5] px-4 py-3 text-sm text-[#125547]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-[#d39e95] bg-[#fff2ef] px-4 py-3 text-sm text-[#7e1f14]">
          {error}
        </p>
      ) : null}

      {shelves.length === 0 ? (
        <Card className="border-2">
          <CardContent className="space-y-4 p-6 sm:p-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">No shelves yet</h2>
              <p className="text-sm leading-6 text-(--muted)">
                Create your first shelf to start organizing books into personal
                reading lists.
              </p>
            </div>
            <Link href={createNewShelfHref()} className={buttonStyles({})}>
              Create your first shelf
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shelves.map((shelf) => (
            <ShelfCard
              key={shelf.id}
              shelf={shelf}
              href={createMyShelfHref(shelf.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
