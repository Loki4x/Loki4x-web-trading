import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { TrackRecord } from "@/components/landing/TrackRecord";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";
import { CtaBanner } from "@/components/landing/CtaBanner";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// Data terstruktur untuk Google: identitas organisasi dan situs.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "Loki4x Academy",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Loki4x Academy",
      publisher: { "@id": `${SITE_URL}/#org` },
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
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
