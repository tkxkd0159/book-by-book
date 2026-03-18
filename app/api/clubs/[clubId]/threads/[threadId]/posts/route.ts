import { NextRequest, NextResponse } from "next/server";

import { loadThreadMemberRouteAccess } from "@/lib/threads/access";
import {
  toThreadRouteAccessErrorResponse,
  toThreadRouteErrorResponse,
} from "@/lib/threads/errors";
import { findThreadDetailForMember } from "@/lib/threads/repository";
import {
  serializeCursorPaginationResult,
  serializeThreadComment,
} from "@/lib/threads/serialization";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clubId: string; threadId: string }> },
) {
  const { clubId, threadId } = await context.params;
  const access = await loadThreadMemberRouteAccess(clubId);
  if (access.status === "unauthorized") {
    return toThreadRouteAccessErrorResponse({ kind: "unauthorized" });
  }

  if (access.status === "not_found") {
    return toThreadRouteAccessErrorResponse({ kind: "not_found" });
  }

  if (access.status === "forbidden") {
    return toThreadRouteAccessErrorResponse({ kind: "forbidden" });
  }

  try {
    const detail = await findThreadDetailForMember({
      clubId,
      threadId,
      currentUserRole: access.club.currentUserRole,
      afterCursor: request.nextUrl.searchParams.get("after"),
    });

    return NextResponse.json(
      serializeCursorPaginationResult(detail.posts, serializeThreadComment),
    );
  } catch (error) {
    return toThreadRouteErrorResponse(error);
  }
}
