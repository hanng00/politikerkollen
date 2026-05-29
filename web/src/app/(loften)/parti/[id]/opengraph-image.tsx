import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Partiscorekort";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

interface PartyScorecardOG {
  party: string;
  party_name: string;
  total_promises: number;
  fulfillment_rate: number;
  implemented_count: number;
  partial_count: number;
  championed_count: number;
  supported_count: number;
  contradictory_count: number;
  opposed_count: number;
  unclear_count: number;
}

const partyColors: Record<string, string> = {
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
  s: "Socialdemokraterna",
  m: "Moderaterna",
  sd: "Sverigedemokraterna",
  c: "Centerpartiet",
  v: "Vänsterpartiet",
  kd: "Kristdemokraterna",
  l: "Liberalerna",
  mp: "Miljöpartiet",
};

function needsDarkText(party: string): boolean {
  const p = party.toLowerCase();
  return p === "sd" || p === "mp";
}

async function fetchPartyScorecard(partyId: string): Promise<PartyScorecardOG | null> {
  if (!API_ENDPOINT) return null;
  try {
    const res = await fetch(`${API_ENDPOINT}/parties/scorecard/${partyId}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partyId = id.toLowerCase();
  const scorecard = await fetchPartyScorecard(partyId);

  if (!scorecard) {
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

  const partyColor = partyColors[partyId] ?? "#6366f1";
  const partyName = partyNames[partyId] ?? scorecard.party_name;
  const darkText = needsDarkText(partyId);

  const total = scorecard.total_promises;
  const segments = [
    { count: scorecard.implemented_count, color: "#22c55e" },
    { count: scorecard.partial_count, color: "#14b8a6" },
    { count: scorecard.championed_count, color: "#3b82f6" },
    { count: scorecard.supported_count, color: "#71717a" },
    { count: scorecard.contradictory_count, color: "#f59e0b" },
    { count: scorecard.opposed_count, color: "#ef4444" },
    { count: scorecard.unclear_count, color: "#52525b" },
  ].filter((s) => s.count > 0);

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
          padding: 0,
        }}
      >
        {/* Colored accent bar at top */}
        <div style={{ display: "flex", height: 8, backgroundColor: partyColor, width: "100%" }} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "48px 60px 40px 60px",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Party badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: partyColor,
              color: darkText ? "#000" : "#fff",
              padding: "12px 32px",
              borderRadius: 12,
              fontSize: 32,
              fontWeight: 700,
              marginBottom: 32,
            }}
          >
            {partyName}
          </div>

          {/* Big percentage */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 140,
                fontWeight: 700,
                lineHeight: 1,
                color: "#fafafa",
              }}
            >
              {scorecard.fulfillment_rate}%
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 28,
                color: "#a1a1aa",
                marginTop: 8,
              }}
            >
              genomfört
            </div>
          </div>

          {/* Progress bar */}
          <div
            style={{
              display: "flex",
              width: "100%",
              maxWidth: 800,
              height: 24,
              borderRadius: 12,
              overflow: "hidden",
              backgroundColor: "#27272a",
            }}
          >
            {segments.map((segment, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  width: `${(segment.count / total) * 100}%`,
                  height: "100%",
                  backgroundColor: segment.color,
                }}
              />
            ))}
          </div>

          {/* Stats summary */}
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 20,
              color: "#a1a1aa",
            }}
          >
            {scorecard.implemented_count + scorecard.partial_count} av {total} löften genomförda
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 60px",
            borderTop: "1px solid #27272a",
          }}
        >
          <div style={{ display: "flex", fontSize: 20, color: "#71717a" }}>
            politikerkollen.org
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, color: "#a1a1aa" }}>→</span>
            <span style={{ fontSize: 18, color: "#fafafa", fontWeight: 600 }}>
              Se hela analysen
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
