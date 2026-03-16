import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getTokenMock = vi.fn();

vi.mock("next-auth/jwt", () => ({
  getToken: getTokenMock,
}));

describe("proxy auth gating", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-secret";
    delete process.env.E2E_BYPASS_AUTH;
  });

  it("keeps the sign-in page reachable when a stale token cookie exists", async () => {
    getTokenMock.mockResolvedValue({
      email: "stale@example.com",
      userId: "missing-user-id",
    });

    const { proxy } = await import("../../proxy");
    const response = await proxy(
      new NextRequest("http://localhost:3000/signin?callbackUrl=%2Fbooks%2Fsearch"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps public routes reachable without any auth state", async () => {
    getTokenMock.mockResolvedValue(null);

    const { proxy } = await import("../../proxy");
    const response = await proxy(new NextRequest("http://localhost:3000/"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("still redirects signed-out users away from protected pages", async () => {
    getTokenMock.mockResolvedValue(null);

    const { proxy } = await import("../../proxy");
    const response = await proxy(
      new NextRequest("http://localhost:3000/books/search?q=dune"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/signin?callbackUrl=%2Fbooks%2Fsearch%3Fq%3Ddune",
    );
  });

  it("still allows token-backed access to protected pages", async () => {
    getTokenMock.mockResolvedValue({
      email: "reader@example.com",
      userId: "user-123",
    });

    const { proxy } = await import("../../proxy");
    const response = await proxy(
      new NextRequest("http://localhost:3000/books/search"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not auth-gate non-public api paths in proxy", async () => {
    getTokenMock.mockResolvedValue(null);

    const { proxy } = await import("../../proxy");
    const response = await proxy(
      new NextRequest("http://localhost:3000/api/books/import"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("accepts the E2E auth cookie as an optimistic protected-route session", async () => {
    process.env.E2E_BYPASS_AUTH = "1";
    getTokenMock.mockResolvedValue(null);

    const { proxy } = await import("../../proxy");
    const response = await proxy(
      new NextRequest("http://localhost:3000/clubs", {
        headers: {
          cookie: "bbb_e2e_user=owner",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(getTokenMock).not.toHaveBeenCalled();
  });
});
