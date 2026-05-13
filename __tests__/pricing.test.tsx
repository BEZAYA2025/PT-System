import { render, screen } from "@testing-library/react";
import PricingPage from "@/app/pricing/page";

// Footer imports server-only metadata helpers — safe to render in jsdom.

describe("/pricing", () => {
  it("renders both Standard and VIP tier cards", () => {
    render(<PricingPage />);
    expect(
      screen.getByRole("heading", { name: /choose your tier/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /pt system standard/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /pt system vip/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/\$99/)).toBeInTheDocument();
    expect(screen.getByText(/\$399/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /subscribe now/i })).toHaveLength(2);
    expect(screen.getByText(/recommended/i)).toBeInTheDocument();
  });
});
