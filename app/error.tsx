"use client";

import { useEffect } from "react";

import ServiceUnavailable from "@/components/service-unavailable";
import { isDev } from "@/lib/utils";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (isDev) {
      console.error(error);
    }
  }, [error]);

  return <ServiceUnavailable onRetry={reset} />;
}
