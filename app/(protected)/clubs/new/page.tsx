import Link from "next/link";

import { createClubAction } from "@/app/(protected)/clubs/actions";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlashToast } from "@/components/ui/flash-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function NewClubPage({ searchParams }: Props.Page) {
  const params = await searchParams;
  const error = readMessage(params.error);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <FlashToast key={`${error ?? ""}`} error={error} />

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold sm:text-4xl">Create a club</h1>
        <p className="text-(--muted)">
          Start a public or private reading space with shared book sections.
        </p>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Club details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createClubAction} className="space-y-5">
            <label className="block space-y-2 text-sm font-medium">
              <span>Name</span>
              <Input
                name="name"
                required
                maxLength={80}
                placeholder="Weekend readers"
              />
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Description</span>
              <Textarea
                name="description"
                maxLength={400}
                placeholder="What kind of books you read, how often you meet, and who should join."
              />
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Visibility</span>
              <select
                name="visibility"
                defaultValue="PUBLIC"
                className="h-11 w-full rounded-md border border-(--border) bg-(--surface-strong) px-3 text-sm shadow-sm outline-none transition focus:border-(--accent) focus:ring-2 focus:ring-(--accent-soft)"
              >
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private</option>
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="submit">Create club</Button>
              <Link href="/clubs" className={buttonStyles({ variant: "secondary" })}>
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
