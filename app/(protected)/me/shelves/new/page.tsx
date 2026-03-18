import { createShelfAction } from "@/app/(protected)/me/shelves/actions";
import { ShelfForm } from "@/components/shelves/shelf-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createMyShelvesHref,
} from "@/lib/shelves/view-paths";

function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function NewShelfPage({ searchParams }: Props.Page) {
  const params = await searchParams;
  const error = readMessage(params.error);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold sm:text-4xl">Create a shelf</h1>
        <p className="text-(--muted)">
          Build a personal reading list for themes, moods, or anything else you
          want to track.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-[#d39e95] bg-[#fff2ef] px-4 py-3 text-sm text-[#7e1f14]">
          {error}
        </p>
      ) : null}

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Shelf details</CardTitle>
        </CardHeader>
        <CardContent>
          <ShelfForm
            action={createShelfAction}
            submitLabel="Create shelf"
            cancelHref={createMyShelvesHref()}
            defaults={{ isPublic: false }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
