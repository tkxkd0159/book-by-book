"use server";

import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/server";
import { ensureBookInDatabase } from "@/lib/books/repository";
import { primePersistedBookDetailCache } from "@/lib/books/volume-details";

export async function importBookAction(formData: FormData) {
  await requireCurrentUser();

  const googleVolumeId = String(formData.get("googleVolumeId") ?? "").trim();
  if (!googleVolumeId) {
    redirect("/books/search?error=missing-volume-id");
  }

  const book = await ensureBookInDatabase(googleVolumeId);
  if (!book) {
    redirect("/books/search?error=book-not-found");
  }

  primePersistedBookDetailCache(book);
  redirect(`/books/${encodeURIComponent(book.googleVolumeId)}`);
}
