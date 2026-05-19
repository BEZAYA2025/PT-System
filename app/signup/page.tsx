import { permanentRedirect } from "next/navigation";

// Round-37: /signup was the legacy "Join the waitlist" landing page
// before the platform shipped. All marketing CTAs now point to
// /pricing, where visitors pick a tier and start the 14-day free
// trial. Existing inbound links to /signup (bookmarks, old email,
// pricing-page tier CTAs that still carry `?plan=…` query strings
// for the eventual checkout flow) get 308'd to /pricing. When the
// real trial-signup / Stripe-checkout flow is built, this redirect
// comes off and the page is rebuilt at /signup.

export default function SignupRedirect(): never {
  permanentRedirect("/pricing");
}
