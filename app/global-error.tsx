"use client";

// Dipakai hanya kalau layout utama sendiri gagal dirender, jadi tidak bisa mengandalkan CSS aplikasi.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050A18",
          color: "#E6ECFA",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 24px", color: "#8FA0C8" }}>An unexpected error occurred. Please try again.</p>
          <button
            type="button"
            onClick={reset}
            style={{ background: "#5F85DB", color: "#fff", border: 0, borderRadius: 9999, padding: "12px 24px", fontSize: 16, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
