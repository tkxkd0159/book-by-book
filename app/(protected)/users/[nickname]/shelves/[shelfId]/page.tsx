import Link from "next/link";
import { forbidden, notFound } from "next/navigation";

import { ShelfDetail } from "@/components/shelves/shelf-detail";
import { buttonStyles } from "@/components/ui/button";
import { requireCurrentUser } from "@/lib/auth/server";
import { findPublicUserByNickname } from "@/lib/auth/users";
import { loadPublicShelfRouteAccess } from "@/lib/shelves/access";
import { createMyShelvesHref } from "@/lib/shelves/view-paths";

type PublicShelfPageProps = {
  params: Promise<{ nickname: string; shelfId: string }>;
};

export default async function PublicShelfPage({ params }: PublicShelfPageProps) {
  const [currentUser, paramsData] = await Promise.all([requireCurrentUser(), params]);
  const owner = await findPublicUserByNickname(paramsData.nickname);

  if (!owner) {
    notFound();
  }

  const access = await loadPublicShelfRouteAccess({
    viewerUserId: currentUser.id,
    ownerUserId: owner.id,
    shelfId: paramsData.shelfId,
  });

  if (access.status === "not_found") {
    notFound();
  }

  if (access.status === "forbidden") {
    forbidden();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold sm:text-4xl">
            {access.shelf.name}
          </h1>
          <p className="text-(--muted)">
            Public shelf view for signed-in readers.
          </p>
        </div>

        <Link
          href={createMyShelvesHref()}
          className={buttonStyles({ variant: "secondary" })}
        >
          Back to your shelves
        </Link>
      </div>

      <ShelfDetail shelf={access.shelf} mode="public" />
    </div>
  );
}
