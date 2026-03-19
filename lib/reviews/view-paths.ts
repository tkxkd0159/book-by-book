export function createMyReviewedHref() {
  return "/me/reviewed";
}

export function createMyReviewHref(googleVolumeId: string) {
  return `/books/${encodeURIComponent(googleVolumeId)}#review-editor`;
}
