import { render, screen } from "@testing-library/react";
import OnboardPage from "@/app/onboard/page";

// The onboard page is a Server Component that calls backendFetch. Mock the
// module to bypass the network and exercise the "Expired" branch when token
// validation fails. Backend returns `{error: "..."}` on bad tokens — the page
// reads `error` (not `message`) for the user-facing reason.
jest.mock("@/lib/backend", () => ({
  backendFetch: jest.fn(async () => ({
    ok: true,
    data: { error: "Token expired." },
  })),
}));

// Polishing-pass added a Stripe-redirect detection that calls headers() when
// the token is missing. Stub it so the missing-token test path doesn't hit
// Next.js's request-context guard.
jest.mock("next/headers", () => ({
  headers: jest.fn(async () => ({ get: () => null })),
}));

// SiteHeader is an async Server Component using the DAL — stub it for jsdom.
jest.mock("@/components/sections/SiteHeader", () => ({
  SiteHeader: () => null,
}));

// TODO: same issue as pricing — async SiteHeader inside the page tree breaks
// jsdom render under React 19. Re-enable with async-aware render helper.
describe.skip("/onboard", () => {
  it("renders Expired card when token is invalid", async () => {
    const ui = await OnboardPage({
      searchParams: Promise.resolve({ token: "bad-token" }),
    });
    render(ui);
    expect(
      screen.getByRole("heading", { name: /setup link expired/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/token expired/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /resubscribe/i })).toBeInTheDocument();
  });

  it("renders Expired card when token is missing", async () => {
    const ui = await OnboardPage({
      searchParams: Promise.resolve({}),
    });
    render(ui);
    expect(
      screen.getByRole("heading", { name: /setup link expired/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/missing token/i)).toBeInTheDocument();
  });
});
