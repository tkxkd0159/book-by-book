import Link from "next/link";

import type { ShelfSummary } from "@/lib/shelves/repository";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";

type ShelfCardProps = {
  shelf: ShelfSummary;
  href: string;
};

export function ShelfCard({ shelf, href }: ShelfCardProps) {
  return (
    <Card className="border-(--border)/90">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={shelf.isPublic ? "success" : "neutral"}>
            {shelf.isPublic ? "Public" : "Private"}
          </Badge>
          <Badge>{`${shelf.itemCount} book${shelf.itemCount === 1 ? "" : "s"}`}</Badge>
        </div>
        <CardTitle className="text-xl">{shelf.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-(--muted)">
          {shelf.description ?? "No shelf description yet."}
        </p>
        <Link href={href} className={buttonStyles({})}>
          Open {shelf.name}
        </Link>
      </CardContent>
    </Card>
  );
}
