import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import { getLocale } from "@/lib/i18n/server";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { TrackRecord } from "@/components/landing/TrackRecord";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";
import { CtaBanner } from "@/components/landing/CtaBanner";
import { Footer } from "@/components/landing/Footer";

// Judul dan deskripsi untuk Google mengikuti bahasa halaman (bawaan: Indonesia, tanpa cookie = yang dilihat Googlebot).
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title =
    locale === "id" ? "Loki4x Academy — Jurnal Trading, Sinyal & Berita Pasar" : "Loki4x Academy — Trading Journal & Market News";
  const description =
    locale === "id"
      ? "Catat setiap trade dengan disiplin, ikuti sinyal, kalender ekonomi, dan data posisi COT dalam satu ruang kerja yang fokus. Mulai gratis."
      : "Log your trades with discipline and stay ahead of high-impact market news, all in one focused dark workspace.";
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: { title, description, siteName: "Loki4x Academy", type: "website", url: "/", locale: locale === "id" ? "id_ID" : "en_US" },
    twitter: { card: "summary_large_image", title, description },
  };
}

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
