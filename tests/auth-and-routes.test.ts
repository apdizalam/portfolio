import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bearerToken, checkAdmin } from "@/lib/auth";

describe("bearerToken", () => {
  it("reads a Bearer token", () => {
    expect(bearerToken("Bearer abc.def")).toBe("abc.def");
    expect(bearerToken("bearer xyz")).toBe("xyz");
  });
  it("ignores anything else", () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken("Basic abc")).toBeNull();
    expect(bearerToken("Bearer")).toBeNull();
  });
});

describe("checkAdmin", () => {
  const deps = (over: Partial<Parameters<typeof checkAdmin>[1]> = {}) => ({
    userFromToken: vi.fn(async (t: string) => (t === "good" || t === "user" ? "uid" : null)),
    isAdminWithToken: vi.fn(async (t: string) => t === "good"),
    isAdminFromCookies: vi.fn(async () => false),
    ...over,
  });

  it("allows an admin token", async () => {
    expect(await checkAdmin("Bearer good", deps())).toBe(true);
  });
  it("refuses a signed-in non-admin", async () => {
    expect(await checkAdmin("Bearer user", deps())).toBe(false);
  });
  it("refuses an invalid token without asking the database", async () => {
    const d = deps();
    expect(await checkAdmin("Bearer forged", d)).toBe(false);
    expect(d.isAdminWithToken).not.toHaveBeenCalled();
  });
  it("falls back to the login cookie when no token is sent", async () => {
    expect(await checkAdmin(null, deps({ isAdminFromCookies: async () => true }))).toBe(true);
    expect(await checkAdmin(null, deps())).toBe(false);
  });
  it("treats errors as not allowed", async () => {
    expect(await checkAdmin("Bearer good", deps({ isAdminWithToken: async () => { throw new Error("db down"); } }))).toBe(false);
  });
});

// ---- API routes with the server pieces mocked
const isAdminRequest = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ isAdminRequest: (...a: unknown[]) => isAdminRequest(...a) }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));

describe("POST /api/revalidate", () => {
  beforeEach(() => { isAdminRequest.mockReset(); revalidatePath.mockReset(); });

  it("rejects non-admins and does not refresh", async () => {
    isAdminRequest.mockResolvedValue(false);
    const { POST } = await import("@/app/api/revalidate/route");
    const res = await POST(new Request("http://x/api/revalidate", { method: "POST" }));
    expect(res.status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refreshes the whole site for admins (homepage, /projects, project pages)", async () => {
    isAdminRequest.mockResolvedValue(true);
    const { POST } = await import("@/app/api/revalidate/route");
    const res = await POST(new Request("http://x/api/revalidate", { method: "POST", headers: { Authorization: "Bearer t" } }));
    expect(res.status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    // the request (with its Bearer token) is what gets checked
    expect(isAdminRequest.mock.calls[0][0]).toBeInstanceOf(Request);
  });
});

describe("GET /api/github", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => { isAdminRequest.mockReset(); });
  afterEach(() => { globalThis.fetch = realFetch; vi.unstubAllEnvs(); });

  const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

  it("is admin-only", async () => {
    isAdminRequest.mockResolvedValue(false);
    const { GET } = await import("@/app/api/github/route");
    const res = await GET(new Request("http://x/api/github?repo=Tayonx"));
    expect(res.status).toBe(401);
  });

  it("returns normalised repository details and sends the token only to GitHub", async () => {
    isAdminRequest.mockResolvedValue(true);
    vi.stubEnv("GITHUB_TOKEN", "server-secret");
    const calls: { url: string; auth: string | null }[] = [];
    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      calls.push({ url: u, auth: new Headers(init?.headers).get("authorization") });
      if (u.endsWith("/languages")) return respond(200, { JavaScript: 10 });
      return respond(200, { name: "Tayonx", full_name: "apdizalam/Tayonx", owner: { login: "apdizalam" }, html_url: "https://github.com/apdizalam/Tayonx", description: "Cargo", topics: [] });
    }) as typeof fetch;
    const { GET } = await import("@/app/api/github/route");
    const res = await GET(new Request("http://x/api/github?repo=Tayonx"));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.repo).toMatchObject({ fullName: "apdizalam/Tayonx", languages: ["JavaScript"] });
    expect(JSON.stringify(json)).not.toContain("server-secret");
    expect(calls.every((c) => c.url.startsWith("https://api.github.com/") && c.auth === "Bearer server-secret")).toBe(true);
  });

  it("explains a missing repository", async () => {
    isAdminRequest.mockResolvedValue(true);
    globalThis.fetch = vi.fn(async () => respond(404, { message: "Not Found" })) as typeof fetch;
    const { GET } = await import("@/app/api/github/route");
    const res = await GET(new Request("http://x/api/github?repo=nope"));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  it("explains a rate limit", async () => {
    isAdminRequest.mockResolvedValue(true);
    globalThis.fetch = vi.fn(async () => respond(403, {}, { "x-ratelimit-remaining": "0" })) as typeof fetch;
    const { GET } = await import("@/app/api/github/route");
    const res = await GET(new Request("http://x/api/github?repo=Tayonx"));
    expect((await res.json()).error.code).toBe("rate_limited");
  });

  it("handles GitHub being unreachable", async () => {
    isAdminRequest.mockResolvedValue(true);
    globalThis.fetch = vi.fn(async () => { throw new Error("offline"); }) as typeof fetch;
    const { GET } = await import("@/app/api/github/route");
    const res = await GET(new Request("http://x/api/github?repo=Tayonx"));
    expect((await res.json()).error.code).toBe("api_error");
  });

  it("rejects an invalid repository name", async () => {
    isAdminRequest.mockResolvedValue(true);
    const { GET } = await import("@/app/api/github/route");
    const res = await GET(new Request("http://x/api/github?repo=bad%20name!"));
    expect(res.status).toBe(400);
  });

  it("lists your repositories for the picker (forks left out)", async () => {
    isAdminRequest.mockResolvedValue(true);
    globalThis.fetch = vi.fn(async () => respond(200, [{ name: "Tayonx", description: "x" }, { name: "fork", fork: true }])) as typeof fetch;
    const { GET } = await import("@/app/api/github/route");
    const res = await GET(new Request("http://x/api/github?list=1"));
    expect((await res.json()).repos.map((r: { name: string }) => r.name)).toEqual(["Tayonx"]);
  });
});
