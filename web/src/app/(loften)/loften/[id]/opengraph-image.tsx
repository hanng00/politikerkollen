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
  source_type: string;
}

const partyColors: Record<string, string> = {
  S: "#E8112D", M: "#52BDEC", SD: "#DDDD00", C: "#009933",
  V: "#DA291C", KD: "#6366f1", L: "#006AB3", MP: "#83CF39",
  s: "#E8112D", m: "#52BDEC", sd: "#DDDD00", c: "#009933",
  v: "#DA291C", kd: "#6366f1", l: "#006AB3", mp: "#83CF39",
};

const partyNames: Record<string, string> = {
  S: "Socialdemokraterna", M: "Moderaterna", SD: "Sverigedemokraterna",
  C: "Centerpartiet", V: "Vänsterpartiet", KD: "Kristdemokraterna",
  L: "Liberalerna", MP: "Miljöpartiet",
  s: "Socialdemokraterna", m: "Moderaterna", sd: "Sverigedemokraterna",
  c: "Centerpartiet", v: "Vänsterpartiet", kd: "Kristdemokraterna",
  l: "Liberalerna", mp: "Miljöpartiet",
};

const directionColors: Record<string, string> = {
  implemented: "#22c55e", partial: "#14b8a6", championed: "#3b82f6",
  supported: "#71717a", contradictory: "#f59e0b", opposed: "#ef4444",
  unclear: "#71717a",
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

function needsDarkText(party: string): boolean {
  const p = party.toLowerCase();
  return p === "sd" || p === "mp";
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
  const supportedCount =
    Number(promise.motion_supported_count || 0) +
    Number(promise.motion_bifall_count || 0) +
    Number(promise.proposition_count || 0);
  const opposedCount = Number(promise.motion_opposed_count || 0);

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
        <div style={{ display: "flex", height: 6, backgroundColor: dirColor, width: "100%" }} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "48px 60px 40px 60px",
          }}
        >
          {/* Top row: party badge + source label */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: partyColor,
                color: needsDarkText(promise.promise_party) ? "#000" : "#fff",
                padding: "8px 20px",
                borderRadius: 8,
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {partyName}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 20,
                color: "#71717a",
              }}
            >
              {promise.source_type === "tidoavtalet"
                ? "Tidöavtalet 2022"
                : `Valmanifest ${promise.promise_year}`}
            </div>
          </div>

          {/* Promise text — the hero */}
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 38,
                fontWeight: 400,
                lineHeight: 1.4,
                color: "#fafafa",
              }}
            >
              &ldquo;{truncate(promise.promise_text, 160)}&rdquo;
            </div>
          </div>

          {/* Bottom: assessment + stats + CTA */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid #27272a",
              paddingTop: 24,
            }}
          >
            {/* Assessment verdict */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: dirColor + "20",
                  border: `1.5px solid ${dirColor}50`,
                  padding: "8px 20px",
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 700, color: dirColor }}>
                  {promise.assessment_label}
                </span>
              </div>

              {/* Vote counts */}
              <div style={{ display: "flex", gap: 16, fontSize: 18 }}>
                {supportedCount > 0 && (
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: "#22c55e" }}>{supportedCount}</span>
                    <span style={{ color: "#71717a" }}>för</span>
                  </div>
                )}
                {opposedCount > 0 && (
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: "#ef4444" }}>{opposedCount}</span>
                    <span style={{ color: "#71717a" }}>emot</span>
                  </div>
                )}
              </div>
            </div>

            {/* CTA / branding */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18, color: "#71717a" }}>
                politikerkollen.org
              </span>
              <span style={{ fontSize: 18, color: "#a1a1aa" }}>
                →
              </span>
              <span style={{ fontSize: 18, color: "#fafafa", fontWeight: 600 }}>
                Se hela analysen
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
