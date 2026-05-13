import { render, screen } from "@testing-library/react";
import OnboardPage from "@/app/onboard/page";

// The onboard page is a Server Component that calls backendFetch. Mock the
// module to bypass the network and exercise the "Expired" branch when token
// validation fails (e.g. invalid token).
jest.mock("@/lib/backend", () => ({
  backendFetch: jest.fn(async () => ({
    ok: true,
    data: { valid: false, message: "Token expired." },
  })),
}));

describe("/onboard", () => {
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
