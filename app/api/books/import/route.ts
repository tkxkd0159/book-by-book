import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/server";
import { ensureBookInDatabase } from "@/lib/books/repository";
import { primePersistedBookDetailCache } from "@/lib/books/volume-details";

export const runtime = "nodejs";

type ImportBookRequest = {
  googleVolumeId?: unknown;
};

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: ImportBookRequest;
  try {
    payload = (await request.json()) as ImportBookRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (typeof payload.googleVolumeId !== "string" || !payload.googleVolumeId.trim()) {
    return NextResponse.json(
      { error: "googleVolumeId is required." },
      { status: 400 },
    );
  }

  try {
    const book = await ensureBookInDatabase(payload.googleVolumeId);
    if (!book) {
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    }

    primePersistedBookDetailCache(book);
    return NextResponse.json({ book });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to import book right now." },
      { status: 502 },
    );
  }
}
