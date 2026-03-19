export function createMyReviewedHref() {
  return "/me/reviewed";
}

export function createMyReviewHref(googleVolumeId: string) {
  return `/me/reviews/${encodeURIComponent(googleVolumeId)}`;
}
