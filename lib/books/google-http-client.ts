import { GoogleBooksRequestError } from "@/lib/books/errors";
import { env } from "@/lib/env";
import type {
  GoogleVolume,
  GoogleVolumesResponse,
} from "@/lib/books/google-api";

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
  readonly #apiBaseUrl: string;
  readonly #apiKey: string;
  readonly #fetchImpl: typeof fetch;

  constructor(input?: {
    apiBaseUrl?: string;
    apiKey?: string;
    fetchImpl?: typeof fetch;
  }) {
    this.#apiBaseUrl = normalizeApiBaseUrl(
      input?.apiBaseUrl ?? env.googleBooks.apiBaseUrl,
    );
    this.#apiKey = input?.apiKey ?? env.googleBooks.apiKey;
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
    params.set("key", this.#apiKey);

    return `${this.#apiBaseUrl}${path}?${params.toString()}`;
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

function normalizeApiBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
