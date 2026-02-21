"use client";

import { useEffect } from "react";

import ServiceUnavailable from "@/components/service-unavailable";
import { isDev } from "@/lib/utils";

export default function ErrorPage({ error, reset }: Props.ErrorPage) {
  useEffect(() => {
    if (isDev) {
      console.error(error);
    }
  }, [error]);

  return <ServiceUnavailable onRetry={reset} />;
}
