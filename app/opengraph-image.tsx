import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Loki4x Academy — Trading Journal & Market News";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Gambar pratinjau saat link dibagikan (Telegram, TikTok, WhatsApp, X). Warna mengikuti tema web.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #050A18 0%, #0B1530 60%, #14234F 100%)",
          color: "#E6ECFA",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: "#90B8F8", textTransform: "uppercase" }}>
          Loki4x Academy
        </div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.05, marginTop: 28 }}>Log every trade.</div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.05, color: "#5F85DB" }}>
          Read every market move.
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#8FA0C8", marginTop: 40 }}>
          Trading journal, signals with a transparent track record, and market news.
        </div>
      </div>
    ),
    { ...size }
  );
}
