import { redirect } from "next/navigation";

import { createMyReviewHref } from "@/lib/reviews/view-paths";

type ReviewPageProps = {
  params: Promise<{ googleVolumeId: string }>;
};

export default async function MyReviewPage({ params }: ReviewPageProps) {
  const { googleVolumeId } = await params;
  redirect(createMyReviewHref(googleVolumeId));
}
