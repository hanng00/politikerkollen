import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Politikerprofil";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

interface PoliticianOG {
  name: string;
  party: string;
  constituency: string;
  status: string;
  imageUrl: string | null;
  stats: {
    totalVotes: number;
    totalSpeeches: number;
    totalAuthored: number;
  };
}

const partyColors: Record<string, string> = {
  S: "#E8112D",
  M: "#52BDEC",
  SD: "#DDDD00",
  C: "#009933",
  V: "#DA291C",
  KD: "#000077",
  L: "#006AB3",
  MP: "#83CF39",
};

const partyFullNames: Record<string, string> = {
  S: "Socialdemokraterna",
  M: "Moderaterna",
  SD: "Sverigedemokraterna",
  C: "Centerpartiet",
  V: "Vänsterpartiet",
  KD: "Kristdemokraterna",
  L: "Liberalerna",
  MP: "Miljöpartiet",
};

async function fetchPolitician(id: string): Promise<PoliticianOG | null> {
  if (!API_ENDPOINT) return null;
  try {
    const res = await fetch(`${API_ENDPOINT}/politicians/${id}`);
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
  const politician = await fetchPolitician(id);

  if (!politician) {
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

  const partyColor = partyColors[politician.party] ?? "#6366f1";
  const partyName =
    partyFullNames[politician.party] ?? politician.party;
  const stats = politician.stats;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#0f0f12",
          color: "#fafafa",
          fontFamily: "sans-serif",
          padding: 60,
        }}
      >
        {/* Left column: info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
          }}
        >
          {/* Top: branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 20,
              color: "#a1a1aa",
            }}
          >
            Politikerkollen
          </div>

          {/* Middle: name + party */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>
              {politician.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: partyColor,
                  color: "#fff",
                  padding: "6px 16px",
                  borderRadius: 6,
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                {partyName}
              </div>
              {politician.constituency && (
                <div style={{ fontSize: 22, color: "#a1a1aa" }}>
                  {politician.constituency}
                </div>
              )}
            </div>
          </div>

          {/* Bottom: stats */}
          <div style={{ display: "flex", gap: 40 }}>
            {stats.totalVotes > 0 && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 36, fontWeight: 700 }}>
                  {stats.totalVotes.toLocaleString("sv-SE")}
                </div>
                <div style={{ fontSize: 16, color: "#a1a1aa" }}>röster</div>
              </div>
            )}
            {stats.totalSpeeches > 0 && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 36, fontWeight: 700 }}>
                  {stats.totalSpeeches.toLocaleString("sv-SE")}
                </div>
                <div style={{ fontSize: 16, color: "#a1a1aa" }}>anföranden</div>
              </div>
            )}
            {stats.totalAuthored > 0 && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 36, fontWeight: 700 }}>
                  {stats.totalAuthored.toLocaleString("sv-SE")}
                </div>
                <div style={{ fontSize: 16, color: "#a1a1aa" }}>dokument</div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: portrait */}
        {politician.imageUrl && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 40,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={politician.imageUrl}
              alt=""
              width={280}
              height={360}
              style={{
                borderRadius: 12,
                objectFit: "cover",
              }}
            />
          </div>
        )}
      </div>
    ),
    { ...size },
  );
}
