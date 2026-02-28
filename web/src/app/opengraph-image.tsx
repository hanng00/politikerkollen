import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Politikerkollen — Vad gör dina politiker?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#0f0f12",
          color: "#fafafa",
          fontFamily: "sans-serif",
          padding: 60,
          gap: 24,
        }}
      >
        <div style={{ fontSize: 24, color: "#a1a1aa", letterSpacing: 2 }}>
          POLITIKERKOLLEN
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: 800,
          }}
        >
          Vad gör dina politiker?
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#a1a1aa",
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          Röstningar, anföranden och dokument från riksdagen. Strukturerat och
          sökbart.
        </div>
      </div>
    ),
    { ...size },
  );
}
