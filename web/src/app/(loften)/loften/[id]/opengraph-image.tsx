import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Löfte vs. agerande";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

interface PromiseOG {
  promise_id: string;
  promise_party: string;
  promise_year: number;
  promise_text: string;
  category: string;
  evidence_direction: string;
  assessment_label: string;
  has_contradiction: boolean;
  composite_score: number;
  motion_supported_count: number;
  motion_bifall_count: number;
  motion_opposed_count: number;
  proposition_count: number;
}

const partyColors: Record<string, string> = {
  S: "#E8112D",
  M: "#52BDEC",
  SD: "#DDDD00",
  C: "#009933",
  V: "#DA291C",
  KD: "#6366f1",
  L: "#006AB3",
  MP: "#83CF39",
  s: "#E8112D",
  m: "#52BDEC",
  sd: "#DDDD00",
  c: "#009933",
  v: "#DA291C",
  kd: "#6366f1",
  l: "#006AB3",
  mp: "#83CF39",
};

const partyNames: Record<string, string> = {
  S: "Socialdemokraterna",
  M: "Moderaterna",
  SD: "Sverigedemokraterna",
  C: "Centerpartiet",
  V: "Vänsterpartiet",
  KD: "Kristdemokraterna",
  L: "Liberalerna",
  MP: "Miljöpartiet",
  s: "Socialdemokraterna",
  m: "Moderaterna",
  sd: "Sverigedemokraterna",
  c: "Centerpartiet",
  v: "Vänsterpartiet",
  kd: "Kristdemokraterna",
  l: "Liberalerna",
  mp: "Miljöpartiet",
};

const directionColors: Record<string, string> = {
  implemented: "#22c55e",
  partial: "#14b8a6",
  championed: "#3b82f6",
  supported: "#71717a",
  contradictory: "#f59e0b",
  opposed: "#ef4444",
  unclear: "#71717a",
};

const directionEmoji: Record<string, string> = {
  implemented: "✓",
  partial: "~",
  championed: "↑",
  supported: "·",
  contradictory: "⚡",
  opposed: "✗",
  unclear: "?",
};

async function fetchPromise(id: string): Promise<PromiseOG | null> {
  if (!API_ENDPOINT) return null;
  try {
    const res = await fetch(`${API_ENDPOINT}/promises/scores/${id}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const promise = await fetchPromise(id);

  if (!promise) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#0f0f12",
            color: "#fafafa",
            fontSize: 40,
            fontFamily: "sans-serif",
          }}
        >
          Politikerkollen
        </div>
      ),
      { ...size },
    );
  }

  const partyColor = partyColors[promise.promise_party] ?? "#6366f1";
  const partyName = partyNames[promise.promise_party] ?? promise.promise_party;
  const dirColor = directionColors[promise.evidence_direction] ?? "#71717a";
  const dirSymbol = directionEmoji[promise.evidence_direction] ?? "?";
  const supportedCount =
    promise.motion_supported_count +
    promise.motion_bifall_count +
    promise.proposition_count;
  const opposedCount = promise.motion_opposed_count;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#0f0f12",
          color: "#fafafa",
          fontFamily: "sans-serif",
          padding: 60,
        }}
      >
        {/* Top: branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 20, color: "#71717a" }}>
            Politikerkollen
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: partyColor,
              color:
                promise.promise_party === "SD" ||
                promise.promise_party === "sd" ||
                promise.promise_party === "MP" ||
                promise.promise_party === "mp"
                  ? "#000"
                  : "#fff",
              padding: "6px 16px",
              borderRadius: 6,
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            {partyName} {promise.promise_year}
          </div>
        </div>

        {/* Middle: Promise text */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            gap: 32,
          }}
        >
          {/* "Lovade" label */}
          <div
            style={{
              display: "flex",
              fontSize: 14,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: "#a1a1aa",
            }}
          >
            Lovade
          </div>

          {/* Promise text */}
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 400,
              lineHeight: 1.35,
              color: "#fafafa",
            }}
          >
            &ldquo;{truncate(promise.promise_text, 180)}&rdquo;
          </div>
        </div>

        {/* Bottom: Assessment bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `3px solid ${dirColor}`,
            paddingTop: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                fontSize: 14,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 2,
                color: "#a1a1aa",
              }}
            >
              Agerade
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 24,
                fontWeight: 700,
                color: dirColor,
              }}
            >
              <span>{dirSymbol}</span>
              <span>{promise.assessment_label}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 24, fontSize: 18 }}>
            {supportedCount > 0 && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontWeight: 700 }}>{supportedCount}</span>
                <span style={{ color: "#71717a" }}>stödda</span>
              </div>
            )}
            {opposedCount > 0 && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontWeight: 700 }}>{opposedCount}</span>
                <span style={{ color: "#71717a" }}>emot</span>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
