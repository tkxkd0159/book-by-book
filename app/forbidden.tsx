import { ArrowLeft, BookOpen, LockKeyhole, Search, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <div className="forbidden-scene relative overflow-hidden rounded-4xl border border-(--border) bg-(--surface-strong) px-6 py-12 shadow-[0_20px_50px_rgba(42,32,18,0.08)] sm:px-8">
      <div className="forbidden-glow absolute -left-16 top-10 h-40 w-40 rounded-full bg-[#fff0c9]/70 blur-3xl" />
      <div className="forbidden-glow absolute right-0 top-0 h-48 w-48 rounded-full bg-[#d8eee7]/70 blur-3xl" />
      <div className="forbidden-glow absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-[#f2dfbf]/60 blur-3xl" />

      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        <div className="forbidden-book forbidden-book-1 absolute left-8 top-12 rounded-2xl border border-(--border)/70 bg-white/75 p-4 shadow-[0_16px_30px_rgba(42,32,18,0.08)]">
          <BookOpen aria-hidden className="h-8 w-8 text-(--accent)" />
        </div>
        <div className="forbidden-book forbidden-book-2 absolute right-10 top-24 rounded-2xl border border-(--border)/70 bg-white/80 p-4 shadow-[0_16px_30px_rgba(42,32,18,0.08)]">
          <Users aria-hidden className="h-8 w-8 text-[#7b5d2c]" />
        </div>
        <div className="forbidden-book forbidden-book-3 absolute bottom-16 left-14 rounded-2xl border border-(--border)/70 bg-white/80 p-4 shadow-[0_16px_30px_rgba(42,32,18,0.08)]">
          <LockKeyhole aria-hidden className="h-8 w-8 text-[#7e1f14]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-3xl space-y-8 text-center">
        <div className="space-y-4">
          <Badge className="bg-(--surface)/90">Book Club Access</Badge>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-(--border) bg-white/80 shadow-[0_10px_24px_rgba(42,32,18,0.08)]">
            <LockKeyhole
              aria-hidden
              className="h-9 w-9 text-(--accent-strong)"
            />
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold sm:text-5xl">Forbidden</h1>
            <p className="mx-auto max-w-2xl text-base leading-7 text-(--muted) sm:text-lg">
              This reading room is reserved for club members or managers. Find a
              club you can join, or head back to book discovery and pick your
              next read.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-(--border)/80 bg-white/70 text-left">
            <CardContent className="space-y-3 p-5 pt-5">
              <p className="text-lg font-semibold">Members-only shelves</p>
              <p className="text-sm leading-6 text-(--muted)">
                Private clubs, discussion boards, and invite management stay
                tucked behind membership so each club can keep its conversations
                cozy.
              </p>
            </CardContent>
          </Card>

          <Card className="border-(--border)/80 bg-white/70 text-left">
            <CardContent className="space-y-3 p-5 pt-5">
              <p className="text-lg font-semibold">Keep the story going</p>
              <p className="text-sm leading-6 text-(--muted)">
                You can still browse clubs, join public ones, and search for the
                next book to bring into your reading circle.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/clubs" className={buttonStyles({ size: "lg" })}>
            <ArrowLeft aria-hidden className="h-4 w-4 shrink-0" />
            Go to clubs
          </Link>
          <Link
            href="/books/search"
            className={buttonStyles({ variant: "secondary", size: "lg" })}
          >
            <Search aria-hidden className="h-4 w-4 shrink-0" />
            Search books
          </Link>
        </div>
      </div>
    </div>
  );
}
