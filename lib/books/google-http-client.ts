import {
  GoogleBooksRequestError,
} from "@/lib/books/errors";
import type {
  GoogleVolume,
  GoogleVolumesResponse,
} from "@/lib/books/google-api";
import { getGoogleBooksEnv } from "@/lib/env";

const GOOGLE_BOOKS_BASE_URL = "https://www.googleapis.com/books/v1/volumes";
const GOOGLE_BOOKS_DATA_REVALIDATE_SECONDS = 300;
const GOOGLE_BOOKS_REQUEST_TIMEOUT_MS = 4_000;

export type GoogleBooksSearchRequest = {
  maxResults: number;
  projection?: "lite";
  printType?: "books";
  query: string;
  startIndex: number;
};

export interface GoogleBooksClient {
  fetchVolume(googleVolumeId: string): Promise<GoogleVolume | null>;
  searchVolumes(
    request: GoogleBooksSearchRequest,
  ): Promise<GoogleVolumesResponse>;
}

export class GoogleBooksHttpClient implements GoogleBooksClient {
  readonly #apiKey: string | null;
  readonly #fetchImpl: typeof fetch;

  constructor(input?: {
    apiKey?: string | null;
    fetchImpl?: typeof fetch;
  }) {
    this.#apiKey = input?.apiKey ?? getGoogleBooksEnv().apiKey;
    this.#fetchImpl = input?.fetchImpl ?? fetch;
  }

  async fetchVolume(googleVolumeId: string): Promise<GoogleVolume | null> {
    return this.#fetchGoogleBooksJson<GoogleVolume>({
      cache: "force-cache",
      params: new URLSearchParams(),
      path: `/${encodeURIComponent(googleVolumeId)}`,
      revalidate: GOOGLE_BOOKS_DATA_REVALIDATE_SECONDS,
    });
  }

  async searchVolumes(
    request: GoogleBooksSearchRequest,
  ): Promise<GoogleVolumesResponse> {
    return (
      (await this.#fetchGoogleBooksJson<GoogleVolumesResponse>({
        cache: "force-cache",
        params: new URLSearchParams({
          maxResults: String(request.maxResults),
          printType: request.printType ?? "books",
          projection: request.projection ?? "lite",
          q: request.query,
          startIndex: String(request.startIndex),
        }),
        path: "",
        revalidate: GOOGLE_BOOKS_DATA_REVALIDATE_SECONDS,
      })) ?? {}
    );
  }

  #buildGoogleBooksUrl(path: string, params: URLSearchParams) {
    if (this.#apiKey) {
      params.set("key", this.#apiKey);
    }

    return `${GOOGLE_BOOKS_BASE_URL}${path}?${params.toString()}`;
  }

  async #fetchGoogleBooksJson<TPayload>({
    path,
    params,
    cache,
    revalidate,
  }: {
    cache: RequestCache;
    params: URLSearchParams;
    path: string;
    revalidate?: number;
  }): Promise<TPayload | null> {
    let response: Response;

    try {
      response = await this.#fetchImpl(this.#buildGoogleBooksUrl(path, params), {
        cache,
        next: revalidate ? { revalidate } : undefined,
        signal: AbortSignal.timeout(GOOGLE_BOOKS_REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError")
      ) {
        throw new GoogleBooksRequestError(
          "Google Books is taking too long to respond. Please try again.",
          { cause: error },
        );
      }

      throw new GoogleBooksRequestError(
        "Google Books is temporarily unavailable. Please try again.",
        { cause: error instanceof Error ? error : undefined },
      );
    }

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new GoogleBooksRequestError(
        `Google Books request failed with status ${response.status}`,
      );
    }

    return (await response.json()) as TPayload;
  }
}
