import { NextRequest, NextResponse } from "next/server";

import { getAuthSessionSafe } from "@/lib/auth/session";
import { searchGoogleBooks } from "@/lib/books/google";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getAuthSessionSafe();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters." },
      { status: 400 },
    );
  }

  try {
    const items = await searchGoogleBooks(query);
    return NextResponse.json({ items });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to fetch books from Google right now." },
      { status: 502 },
    );
  }
}
