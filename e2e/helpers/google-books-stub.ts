import {
  createServer,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";

import {
  GOOGLE_BOOKS_VOLUMES_PATH,
  createGoogleBooksSearchResponse,
  findFixtureGoogleVolume,
} from "@/lib/test-harness/google-books-responses";

type RunningGoogleBooksStubServer = {
  baseUrl: string;
  close(): Promise<void>;
};

export async function startGoogleBooksStubServer(): Promise<RunningGoogleBooksStubServer> {
  const server = createServer((request, response) => {
    const url = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? "127.0.0.1"}`,
    );

    if (request.method !== "GET") {
      respondJson(response, 405, { error: "Method not allowed." });
      return;
    }

    if (url.pathname === GOOGLE_BOOKS_VOLUMES_PATH) {
      respondJson(response, 200, createGoogleBooksSearchResponse(url.searchParams));
      return;
    }

    const pathnamePrefix = `${GOOGLE_BOOKS_VOLUMES_PATH}/`;
    if (!url.pathname.startsWith(pathnamePrefix)) {
      respondJson(response, 404, null);
      return;
    }

    const volumeId = decodeURIComponent(url.pathname.slice(pathnamePrefix.length));
    const volume = findFixtureGoogleVolume(volumeId);

    if (!volume) {
      respondJson(response, 404, null);
      return;
    }

    respondJson(response, 200, volume);
  });

  await listen(server);

  const address = server.address() as AddressInfo | null;
  if (!address) {
    throw new Error("Google Books stub server did not expose an address.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}${GOOGLE_BOOKS_VOLUMES_PATH}`,
    async close() {
      await close(server);
    },
  };
}

function respondJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
) {
  const payload = body === null ? "" : JSON.stringify(body);

  response.statusCode = statusCode;
  if (body !== null) {
    response.setHeader("content-type", "application/json");
  }
  response.end(payload);
}

function listen(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function close(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
