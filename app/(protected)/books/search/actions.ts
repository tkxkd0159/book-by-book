"use server";

import { redirect } from "next/navigation";

import { ensureBookInDatabase } from "@/lib/books/repository";

export async function importBookAction(formData: FormData) {
  const googleVolumeId = String(formData.get("googleVolumeId") ?? "").trim();
  if (!googleVolumeId) {
    redirect("/books/search?error=missing-volume-id");
  }

  const book = await ensureBookInDatabase(googleVolumeId);
  if (!book) {
    redirect("/books/search?error=book-not-found");
  }

  redirect(`/books/${encodeURIComponent(book.googleVolumeId)}`);
}
