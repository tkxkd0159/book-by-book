export function isShelfOwner(
  ownerUserId: string | null | undefined,
  currentUserId: string | null | undefined,
) {
  return Boolean(ownerUserId && currentUserId && ownerUserId === currentUserId);
}

export function canViewShelf(input: {
  ownerUserId: string | null | undefined;
  currentUserId: string | null | undefined;
  isPublic: boolean;
}) {
  return input.isPublic || isShelfOwner(input.ownerUserId, input.currentUserId);
}

export function canManageShelf(
  ownerUserId: string | null | undefined,
  currentUserId: string | null | undefined,
) {
  return isShelfOwner(ownerUserId, currentUserId);
}

export function canManageShelfItems(
  ownerUserId: string | null | undefined,
  currentUserId: string | null | undefined,
) {
  return canManageShelf(ownerUserId, currentUserId);
}
