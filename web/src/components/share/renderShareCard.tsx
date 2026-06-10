import type { ReactElement } from "react";

import type { ShareCardData, ShareCardLine } from "./shareCardData";

/**
 * Pure renderer for the 9:16 share card. Returns a satori-compatible element
 * tree for `next/og`'s ImageResponse. No hooks, no client APIs — safe to call
 * from an edge route handler.
 *
 * Every code path renders the "Källa:" attribution line at the bottom.
 */

export const SHARE_CARD_SIZE = { width: 1080, height: 1920 } as const;

const C = {
  bg: "#0e0e11",
  surface: "#17171c",
  surfaceAlt: "#1f1f26",
  text: "#fafafa",
  muted: "#9a9aa3",
  faint: "#6c6c75",
  border: "#2a2a31",
  positive: "#22c55e",
  negative: "#ef4444",
  warning: "#f59e0b",
  neutral: "#8a8a93",
} as const;

function toneColor(tone: "positive" | "negative" | "warning" | "neutral") {
  return tone === "positive"
    ? C.positive
    : tone === "negative"
      ? C.negative
      : tone === "warning"
        ? C.warning
        : C.neutral;
}

function statusColor(status: ShareCardLine["status"]) {
  return status === "kept"
    ? C.positive
    : status === "broke"
      ? C.negative
      : status === "mixed"
        ? C.warning
        : C.neutral;
}

function statusGlyph(status: ShareCardLine["status"]) {
  return status === "kept"
    ? "✓"
    : status === "broke"
      ? "✕"
      : status === "mixed"
        ? "≈"
        : "–";
}

function statusWord(status: ShareCardLine["status"]) {
  return status === "kept"
    ? "HÖLL"
    : status === "broke"
      ? "BRÖT"
      : status === "mixed"
        ? "BLANDAT"
        : "OKLART";
}

export function renderShareCard(data: ShareCardData): ReactElement {
  const accent = data.accent;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: C.bg,
        color: C.text,
        fontFamily: "sans-serif",
        // Faint civic grid + accent glow for depth.
        backgroundImage: `radial-gradient(circle at 78% 8%, ${accent}22 0%, transparent 45%), linear-gradient(${C.border}33 1px, transparent 1px), linear-gradient(90deg, ${C.border}33 1px, transparent 1px)`,
        backgroundSize: "100% 100%, 60px 60px, 60px 60px",
      }}
    >
      {/* Accent bar */}
      <div style={{ display: "flex", height: 16, backgroundColor: accent, width: "100%" }} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "88px 80px 72px 80px",
        }}
      >
        {/* Eyebrow + verdict */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {data.eyebrow ? (
            <div
              style={{
                display: "flex",
                fontSize: 30,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: accent,
                fontWeight: 700,
              }}
            >
              {data.eyebrow}
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
          {data.verdict ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                backgroundColor: `${toneColor(data.verdict.tone)}22`,
                border: `2px solid ${toneColor(data.verdict.tone)}66`,
                color: toneColor(data.verdict.tone),
                padding: "12px 28px",
                borderRadius: 999,
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              {data.verdict.label}
            </div>
          ) : null}
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            marginTop: 36,
            fontSize: data.title.length > 80 ? 64 : 84,
            lineHeight: 1.08,
            fontWeight: 800,
            letterSpacing: -1.5,
            color: C.text,
          }}
        >
          {data.title}
        </div>

        {data.subtitle ? (
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 38,
              lineHeight: 1.35,
              color: C.muted,
            }}
          >
            {data.subtitle}
          </div>
        ) : null}

        {/* Grade letter */}
        {data.grade ? (
          <div
            style={{
              display: "flex",
              marginTop: 56,
              alignItems: "center",
              gap: 36,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 280,
                height: 280,
                borderRadius: 48,
                backgroundColor: `${accent}1a`,
                border: `4px solid ${accent}`,
                color: accent,
                fontSize: 200,
                fontWeight: 800,
              }}
            >
              {data.grade}
            </div>
          </div>
        ) : null}

        {/* Big stat */}
        {data.stat ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 56 }}>
            <div
              style={{
                display: "flex",
                fontSize: 220,
                fontWeight: 800,
                letterSpacing: -6,
                color: accent,
                lineHeight: 1,
              }}
            >
              {data.stat.value}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 12,
                fontSize: 40,
                color: C.muted,
              }}
            >
              {data.stat.caption}
            </div>
          </div>
        ) : null}

        {/* Receipt / itemised lines */}
        {data.lines && data.lines.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 56,
              borderTop: `2px dashed ${C.border}`,
            }}
          >
            {data.lines.map((line, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  padding: "30px 0",
                  borderBottom: `2px dashed ${C.border}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    flexShrink: 0,
                    backgroundColor: `${statusColor(line.status)}22`,
                    color: statusColor(line.status),
                    fontSize: 40,
                    fontWeight: 800,
                  }}
                >
                  {statusGlyph(line.status)}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                  }}
                >
                  <div style={{ display: "flex", fontSize: 34, color: C.text, lineHeight: 1.25 }}>
                    {line.label}
                  </div>
                  {line.detail ? (
                    <div style={{ display: "flex", fontSize: 26, color: C.faint, marginTop: 6 }}>
                      {line.detail}
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    fontWeight: 700,
                    letterSpacing: 2,
                    color: statusColor(line.status),
                  }}
                >
                  {statusWord(line.status)}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Spacer pushes footer down */}
        <div style={{ display: "flex", flex: 1 }} />

        {/* Footnote */}
        {data.footnote ? (
          <div style={{ display: "flex", fontSize: 28, color: C.muted, marginBottom: 16 }}>
            {data.footnote}
          </div>
        ) : null}

        {/* Source attribution — ALWAYS rendered */}
        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: C.faint,
            marginBottom: 28,
          }}
        >
          Källa: {data.source}
        </div>

        {/* Brand line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `2px solid ${C.border}`,
            paddingTop: 32,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                display: "flex",
                width: 44,
                height: 44,
                borderRadius: 999,
                border: `3px solid ${C.text}`,
              }}
            />
            <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: C.text }}>
              Politikerkollen
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 32, color: accent, fontWeight: 600 }}>
            politikerkollen.org
          </div>
        </div>
      </div>
    </div>
  );
}
