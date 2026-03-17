import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/server";
import { isClubMember } from "@/lib/clubs/permissions";
import { findClubDetail } from "@/lib/clubs/repository";
import { ThreadError } from "@/lib/threads/errors";
import { listThreadsForClubBook } from "@/lib/threads/repository";
import {
  serializeCursorPaginationResult,
  serializeThreadSummary,
} from "@/lib/threads/serialization";

export const runtime = "nodejs";

function toThreadRouteErrorResponse(error: unknown) {
  if (!(error instanceof ThreadError)) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  if (error.code === "VALIDATION") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error.code === "FORBIDDEN") {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error.code === "NOT_FOUND") {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ error: error.message }, { status: 409 });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clubId: string; clubBookId: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { clubId, clubBookId } = await context.params;
  const club = await findClubDetail(clubId, currentUser.id);
  if (!club) {
    return NextResponse.json({ error: "Club not found." }, { status: 404 });
  }

  if (!isClubMember(club.currentUserRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const threads = await listThreadsForClubBook({
      clubId,
      clubBookId,
      userId: currentUser.id,
      afterCursor: request.nextUrl.searchParams.get("after"),
    });

    return NextResponse.json(
      serializeCursorPaginationResult(threads, serializeThreadSummary),
    );
  } catch (error) {
    return toThreadRouteErrorResponse(error);
  }
}
