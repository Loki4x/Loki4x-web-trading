import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Loki4x Academy — Trading Journal & Market News",
  description:
    "Log your trades with discipline and stay ahead of high-impact market news, all in one focused dark workspace.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        {/* Set tema sebelum halaman ke-render, biar nggak ada "kedipan" tema salah pas awal buka. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('loki4x-theme');document.documentElement.setAttribute('data-theme', t==='light'?'light':'dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${plusJakarta.variable} ${inter.variable} ${jetbrainsMono.variable} font-body`}
      >
        {children}
      </body>
    </html>
  );
}
