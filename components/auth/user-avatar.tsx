"use client";

import { useState } from "react";
import { User } from "lucide-react";

type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  fallbackVariant?: AvatarFallbackVariant;
};

type AvatarPresentation = "image" | AvatarFallbackVariant;
type AvatarFallbackVariant = "initials" | "person";

function joinClasses(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function getAvatarInitials(
  name: string | null | undefined,
  email: string | null | undefined,
) {
  const source = name?.trim() || email?.trim() || "U";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function normalizeAvatarUrl(imageUrl: string | null | undefined) {
  const normalized = imageUrl?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function getAvatarPresentation(input: {
  imageUrl: string | null | undefined;
  failedImageUrl: string | null;
  fallbackVariant?: AvatarFallbackVariant;
}): AvatarPresentation {
  const normalizedImageUrl = normalizeAvatarUrl(input.imageUrl);
  if (normalizedImageUrl && input.failedImageUrl !== normalizedImageUrl) {
    return "image";
  }

  return input.fallbackVariant ?? "initials";
}

export function UserAvatar({
  name,
  email,
  imageUrl,
  alt,
  className,
  imageClassName,
  fallbackClassName,
  fallbackVariant,
}: UserAvatarProps) {
  const normalizedImageUrl = normalizeAvatarUrl(imageUrl);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const initials = getAvatarInitials(name, email);
  const presentation = getAvatarPresentation({
    imageUrl,
    failedImageUrl,
    fallbackVariant,
  });
  const resolvedImageUrl =
    presentation === "image" ? (normalizedImageUrl ?? undefined) : undefined;

  return (
    <span
      className={joinClasses(
        "relative flex items-center justify-center overflow-hidden rounded-full",
        className,
      )}
    >
      {presentation === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={resolvedImageUrl}
          src={resolvedImageUrl}
          alt={alt ?? `${name ?? email ?? "User"} avatar`}
          className={joinClasses("h-full w-full object-cover", imageClassName)}
          onError={() => setFailedImageUrl(normalizedImageUrl)}
        />
      ) : presentation === "person" ? (
        <span
          className={joinClasses(
            "flex h-full w-full items-center justify-center",
            fallbackClassName,
          )}
          aria-hidden
        >
          <User className="h-[60%] w-[60%]" strokeWidth={1.75} />
        </span>
      ) : (
        <span className={fallbackClassName}>{initials}</span>
      )}
    </span>
  );
}
