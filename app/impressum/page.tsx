import { permanentRedirect } from "next/navigation";

// Round-35: /impressum consolidated into /contact. The new page
// carries the company-information block plus the member-support
// inbox so visitors land on one combined surface rather than two
// near-identical pages. Permanent (308) redirect preserves SEO and
// any externally linked deep-links to the old URL.

export default function ImpressumRedirect(): never {
  permanentRedirect("/contact");
}
