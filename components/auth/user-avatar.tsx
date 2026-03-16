"use client";

import { useState } from "react";

type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

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

export function UserAvatar({
  name,
  email,
  imageUrl,
  alt,
  className,
  imageClassName,
  fallbackClassName,
}: UserAvatarProps) {
  const normalizedImageUrl = normalizeAvatarUrl(imageUrl);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const initials = getAvatarInitials(name, email);
  const shouldShowImage =
    !!normalizedImageUrl && failedImageUrl !== normalizedImageUrl;

  return (
    <span
      className={joinClasses(
        "relative flex items-center justify-center overflow-hidden rounded-full",
        className,
      )}
    >
      {shouldShowImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={normalizedImageUrl}
          src={normalizedImageUrl}
          alt={alt ?? `${name ?? email ?? "User"} avatar`}
          className={joinClasses("h-full w-full object-cover", imageClassName)}
          onError={() => setFailedImageUrl(normalizedImageUrl)}
        />
      ) : (
        <span className={fallbackClassName}>{initials}</span>
      )}
    </span>
  );
}
