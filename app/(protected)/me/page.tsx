import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthSession, getCurrentUser } from "@/lib/auth/server";

function fallbackText(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

export default async function MePage() {
  const session = await getAuthSession();
  const user = await getCurrentUser();

  const name = user?.name ?? session?.user?.name ?? null;
  const email = user?.email ?? session?.user?.email ?? null;
  const imageUrl = user?.imageUrl ?? session?.user?.image ?? null;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold sm:text-4xl">Profile</h1>
        <p className="text-(--muted)">
          Your account information used for Book by Book.
        </p>
      </section>

      <Card className="border-2">
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-(--border) bg-(--surface) text-2xl font-semibold text-foreground shadow-sm">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Profile avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <span>
                {fallbackText(name, fallbackText(email, "U"))
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">
              {fallbackText(name, "Book by Book Member")}
            </h2>
            <p className="text-(--muted)">
              {fallbackText(email, "No email found")}
            </p>
            <Badge>Google Account</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User ID</CardTitle>
            <CardDescription>Internal identifier</CardDescription>
          </CardHeader>
          <CardContent>
            <code className="break-all rounded-md bg-(--surface) px-2 py-1 text-xs">
              {fallbackText(user?.id, "Unavailable")}
            </code>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
