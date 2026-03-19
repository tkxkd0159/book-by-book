import { ArrowRight } from "lucide-react";
import Link from "next/link";

import type { ShelfSummary } from "@/lib/shelves/repository";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ShelfCardProps = {
  shelf: ShelfSummary;
  href: string;
};

export function ShelfCard({ shelf, href }: ShelfCardProps) {
  return (
    <Card className="group relative overflow-hidden border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(42,32,18,0.12)] focus-within:-translate-y-1 focus-within:shadow-[0_18px_34px_rgba(42,32,18,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-(--accent)/70 via-[#cb8b39]/50 to-(--accent)/70" />
      <Link
        href={href}
        aria-label={`Open ${shelf.name}`}
        className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-soft) focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface-strong)"
      />

      <CardHeader className="relative z-10 space-y-3 pointer-events-none">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={shelf.isPublic ? "success" : "neutral"}>
            {shelf.isPublic ? "Public" : "Private"}
          </Badge>
          <Badge>{`${shelf.itemCount} book${shelf.itemCount === 1 ? "" : "s"}`}</Badge>
        </div>
        <CardTitle className="text-xl">{shelf.name}</CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 space-y-4 pointer-events-none">
        <p className="text-sm leading-6 text-(--muted)">
          {shelf.description ?? "No shelf description yet."}
        </p>
        <p className="inline-flex items-center gap-2 text-sm font-medium text-(--accent)">
          Open shelf
          <ArrowRight
            aria-hidden
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-focus-within:translate-x-0.5"
          />
        </p>
      </CardContent>
    </Card>
  );
}
