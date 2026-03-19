import { notFound } from "next/navigation";
import Link from "next/link";

import {
  updateShelfAction,
} from "@/app/(protected)/me/shelves/actions";
import { DeleteShelfButton } from "@/components/shelves/delete-shelf-button";
import { ShelfDetail } from "@/components/shelves/shelf-detail";
import { ShelfForm } from "@/components/shelves/shelf-form";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/server";
import { loadOwnedShelfRouteAccess } from "@/lib/shelves/access";
import {
  createMyShelfHref,
  createMyShelvesHref,
  createPublicShelfHref,
} from "@/lib/shelves/view-paths";

type MyShelfDetailPageProps = {
  params: Promise<{ shelfId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function MyShelfDetailPage({
  params,
  searchParams,
}: MyShelfDetailPageProps) {
  const [currentUser, paramsData, searchData] = await Promise.all([
    requireCurrentUser(),
    params,
    searchParams,
  ]);
  const access = await loadOwnedShelfRouteAccess({
    currentUserId: currentUser.id,
    shelfId: paramsData.shelfId,
  });

  if (access.status === "not_found") {
    notFound();
  }

  const message = readMessage(searchData.message);
  const error = readMessage(searchData.error);
  const returnTo = createMyShelfHref(access.shelf.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold sm:text-4xl">{access.shelf.name}</h1>
          <p className="text-(--muted)">
            Update shelf details or review how this shelf appears to public readers.
          </p>
        </div>

        <Link
          href={createMyShelvesHref()}
          className={buttonStyles({ variant: "secondary" })}
        >
          Back to shelves
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

      <ShelfDetail shelf={access.shelf} mode="owner" />

      <Card className="border-(--border)/90">
        <CardHeader>
          <CardTitle>Edit shelf</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {access.shelf.isPublic ? (
            <Link
              href={createPublicShelfHref({
                userId: currentUser.id,
                shelfId: access.shelf.id,
              })}
              className={buttonStyles({ variant: "secondary" })}
            >
              Open public view
            </Link>
          ) : null}

          <ShelfForm
            action={updateShelfAction}
            submitLabel="Save shelf"
            shelfId={access.shelf.id}
            returnTo={returnTo}
            defaults={{
              name: access.shelf.name,
              description: access.shelf.description,
              isPublic: access.shelf.isPublic,
            }}
          />

          <DeleteShelfButton
            shelfId={access.shelf.id}
            shelfName={access.shelf.name}
            returnTo={returnTo}
          />
        </CardContent>
      </Card>
    </div>
  );
}
