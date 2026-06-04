import { ImageResponse } from "next/og";

// Site-wide Open Graph / Twitter share image, generated at build time.
export const alt = "Bantera — Learn languages by actually speaking";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "90px",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1e1b4b 60%, #0f172a 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 800, color: "#fb923c" }}>
          Bantera
        </div>
        <div
          style={{
            fontSize: 88,
            fontWeight: 900,
            lineHeight: 1.05,
            marginTop: 28,
            maxWidth: 980,
          }}
        >
          Learn languages by actually speaking
        </div>
        <div style={{ fontSize: 34, color: "#a3a3a3", marginTop: 36 }}>
          Audio-first language learning · iOS
        </div>
      </div>
    ),
    { ...size },
  );
}
