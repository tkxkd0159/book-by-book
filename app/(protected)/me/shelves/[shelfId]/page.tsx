import { notFound } from "next/navigation";

import { OwnerShelfPageHeader } from "@/components/shelves/owner-shelf-page-header";
import { ShelfDetail } from "@/components/shelves/shelf-detail";
import { requireCurrentUser } from "@/lib/auth/server";
import { loadOwnedShelfRouteAccess } from "@/lib/shelves/access";
import {
  createMyShelfHref,
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
      <OwnerShelfPageHeader
        currentUserNickname={currentUser.nickname}
        shelf={access.shelf}
        returnTo={returnTo}
        message={message}
        error={error}
      />

      <ShelfDetail shelf={access.shelf} mode="owner" returnTo={returnTo} />
    </div>
  );
}
