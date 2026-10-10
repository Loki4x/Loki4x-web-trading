import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { TrackRecord } from "@/components/landing/TrackRecord";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";
import { CtaBanner } from "@/components/landing/CtaBanner";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <TrackRecord />
        <Pricing />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
