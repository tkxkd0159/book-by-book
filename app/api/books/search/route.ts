import { NextRequest, NextResponse } from "next/server";

import {
  GoogleBooksQueryValidationError,
  searchGoogleBooks,
} from "@/lib/books/google";
import type { BookSearchMode } from "@/lib/books/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const pageParam = request.nextUrl.searchParams.get("page");
  const modeParam = request.nextUrl.searchParams.get("mode");
  const titleOnlyParam = request.nextUrl.searchParams.get("titleOnly");
  const parsedPage = Number.parseInt(pageParam ?? "1", 10);
  const page =
    Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const mode: BookSearchMode = modeParam === "advanced" ? "advanced" : "basic";
  const titleOnly =
    titleOnlyParam === "1" || titleOnlyParam?.toLowerCase() === "true";

  if (query.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters." },
      { status: 400 },
    );
  }

  try {
    const result = await searchGoogleBooks(query, { page, mode, titleOnly });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof GoogleBooksQueryValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Unable to fetch books from Google right now." },
      { status: 502 },
    );
  }
}
