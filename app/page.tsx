import { Hero } from "@/components/sections/Hero";
import { WhatIs } from "@/components/sections/WhatIs";
import { MeetAven } from "@/components/sections/MeetAven";
import { DataFlow } from "@/components/sections/DataFlow";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { WaveRidingMethod } from "@/components/sections/WaveRidingMethod";
import { Founder } from "@/components/sections/Founder";
import { Different } from "@/components/sections/Different";
import { Status } from "@/components/sections/Status";
import { FoundersNote } from "@/components/sections/FoundersNote";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <>
      <main id="main" className="flex-1">
        <Hero />
        <WhatIs />
        <MeetAven />
        <DataFlow />
        <HowItWorks />
        <WaveRidingMethod />
        <Founder />
        <Different />
        <Status />
        <FoundersNote />
      </main>
      <Footer />
    </>
  );
}
