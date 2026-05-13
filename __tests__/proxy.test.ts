/**
 * @jest-environment node
 */
import { proxy } from "@/proxy";
import { NextResponse } from "next/server";

// Minimal NextRequest stand-in: proxy only reads request.cookies.get and
// request.nextUrl from the input.
function makeRequest(
  pathname: string,
  cookies: Record<string, string> = {},
): import("next/server").NextRequest {
  return {
    nextUrl: new URL(`http://localhost${pathname}`),
    url: `http://localhost${pathname}`,
    cookies: {
      get: (name: string) =>
        cookies[name] !== undefined ? { name, value: cookies[name] } : undefined,
    },
  } as unknown as import("next/server").NextRequest;
}

describe("proxy.ts", () => {
  it("redirects /dashboard to /signin when no access_token cookie", () => {
    const req = makeRequest("/dashboard");
    const res = proxy(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.headers.get("location")).toContain("/signin");
    expect(res.headers.get("location")).toContain("redirect=%2Fdashboard");
  });

  it("redirects /dashboard/settings to /signin without cookie", () => {
    const req = makeRequest("/dashboard/settings");
    const res = proxy(req);
    expect(res.headers.get("location")).toContain("/signin");
  });

  it("passes through /dashboard when access_token cookie present", () => {
    const req = makeRequest("/dashboard", { access_token: "abc.def.ghi" });
    const res = proxy(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.headers.get("location")).toBeNull();
  });
});
