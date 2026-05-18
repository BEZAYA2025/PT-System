import { SiteHeader } from "@/components/sections/SiteHeader";
import { Hero } from "@/components/sections/Hero";
import { WhatIs } from "@/components/sections/WhatIs";
import { DashboardShowcase } from "@/components/sections/DashboardShowcase";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { WaveRidingMethod } from "@/components/sections/WaveRidingMethod";
import { Founder } from "@/components/sections/Founder";
import { Footer } from "@/components/sections/Footer";
import { getCurrentUser } from "@/lib/dal";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const isAuthed = user !== null;

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Hero isAuthed={isAuthed} />
        <WhatIs />
        <DashboardShowcase />
        <HowItWorks />
        <WaveRidingMethod />
        <Founder />
      </main>
      <Footer />
    </>
  );
}
