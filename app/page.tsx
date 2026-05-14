import { SiteHeader } from "@/components/sections/SiteHeader";
import { Hero } from "@/components/sections/Hero";
import { WhatIs } from "@/components/sections/WhatIs";
import { MeetAven } from "@/components/sections/MeetAven";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { WaveRidingMethod } from "@/components/sections/WaveRidingMethod";
import { Status } from "@/components/sections/Status";
import { Founder } from "@/components/sections/Founder";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Hero />
        <WhatIs />
        <MeetAven />
        <HowItWorks />
        <WaveRidingMethod />
        <Status />
        <Founder />
      </main>
      <Footer />
    </>
  );
}
