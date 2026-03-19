# Report Design Guidelines

This document defines how political intelligence reports should be structured and styled. It combines content principles (Pyramid Principle, MECE) with visual design constraints.

## Content Structure: The Pyramid Principle

Reports follow the McKinsey Pyramid Principle: **lead with your answer, then support it with evidence**.

### Three-Level Hierarchy

| Level | Purpose | Example |
|-------|---------|---------|
| **1. Governing Thought** | Main conclusion | "Regeringen vann — men S visade pragmatism" |
| **2. Supporting Arguments** | 3-5 key findings | "Röstmönstret avslöjar dold pragmatism hos S" |
| **3. Evidence** | Data, quotes, votes | Vote results, timeline, politician quotes |

### Report Structure Template

```
Executive Summary (Level 1)
├── Key Finding 1 (Level 2)
│   ├── Evidence A (Level 3)
│   └── Evidence B (Level 3)
├── Key Finding 2 (Level 2)
│   ├── Evidence C (Level 3)
│   └── Evidence D (Level 3)
└── Key Finding 3 (Level 2)
    └── Evidence E (Level 3)
```

### Executive Summary Requirements

The executive summary IS the top of the pyramid:

1. **State the main conclusion first** — not background or methodology
2. **List 3-5 supporting findings** — each one sentence
3. **Be self-contained** — readable without the full report
4. **Use concrete language** — "missade 40% av målen" not "underpresterade"

### Situation-Complication-Resolution (SCR)

Frame the narrative context before the pyramid:

1. **Situation:** Neutral fact — "Regeringen lade fram prop. 2024/25:150 om kärnkraftsfinansiering"
2. **Complication:** The tension — "Oppositionen var splittrad i frågan"
3. **Resolution:** Your answer — "Röstmönstret avslöjar pragmatism som påverkar kommande beslut"

---

## Content Organization: MECE

All categorizations must be **Mutually Exclusive, Collectively Exhaustive**.

### Good (MECE)

- Voting behavior: "Ja" / "Nej" / "Avstår" / "Frånvarande"
- Policy outcomes: "Antaget" / "Avslaget"
- Actor types: "Kärnkraftsbolag" / "Vindkraftsbolag" / "Elnätsbolag" / "Storförbrukare"

### Bad (Not MECE)

- "Energibolag, Kärnkraftsbolag" — overlapping (kärnkraft is a subset)
- "Regeringspartier, Oppositionen" — misses independent actors
- "Positiv, Negativ" — misses neutral outcomes

### Testing for MECE

1. **ME test:** Can any item fit in multiple categories? → Overlap problem
2. **CE test:** Can you think of any item that fits nowhere? → Gap problem

---

## Visual Design: Constraints

### Color Palette (STRICT)

**Only use CSS variables. Never use arbitrary Tailwind colors.**

| Purpose | Variable | Usage |
|---------|----------|-------|
| Primary accent | `--primary` | Links, active states |
| Muted text | `--muted-foreground` | Secondary text, labels |
| Muted background | `--muted` | Section backgrounds |
| Success | `--success` | Positive outcomes |
| Destructive | `--destructive` | Negative outcomes |
| Warning | `--warning` | Cautions, pending states |
| Border | `--border` | Dividers, card borders |

**Forbidden:**
- `bg-emerald-500`, `text-amber-600`, `border-blue-500`, etc.
- Any hardcoded HSL/RGB values
- Party-associated colors (blue for M, red for S, green for MP, yellow for L)

### Party Colors

Party colors are **only** acceptable as:
- Small indicator dots (`size-2` or `size-3`)
- Thin badge borders
- Never as background fills or large colored areas

Use the chart color scale (`--chart-1` through `--chart-5`) for multi-party visualizations.

### Border-Left Pattern (BANNED)

**Do not use colored left borders on cards or sections.**

```tsx
// ❌ BANNED - "AI slop"
<div className="border-l-4 border-l-amber-500">

// ✓ ACCEPTABLE - subtle, uses CSS variable
<div className="border-l-2 border-border">
```

If you need to highlight a section, use:
- A subtle background tint (`bg-muted/30`)
- An icon with muted color
- A thin top border (`border-t`)

### Spacing Scale

Use only these values:

| Token | Pixels | Usage |
|-------|--------|-------|
| `space-y-2` | 8px | Between related elements |
| `space-y-3` | 12px | Between cards/items |
| `space-y-4` | 16px | Between section header and content |
| `space-y-6` | 24px | Within sections |
| `space-y-8` | 32px | Between major sections |
| `space-y-12` | 48px | Between report parts |

### Typography Scale

| Element | Classes | HTML |
|---------|---------|------|
| Level 1 heading | `text-2xl font-semibold` | `<h2>` |
| Level 2 heading | `text-xl font-semibold` | `<h2>` |
| Section label (Level 3) | `text-xs font-semibold uppercase tracking-wider text-muted-foreground` | `<figcaption>` or `<span>` |
| Body text | `text-sm text-muted-foreground` | `<p>` |
| Large body | `text-base leading-relaxed` or `text-lg leading-relaxed` | `<p>` |
| Emphasis | `<strong>` or `font-medium` | |

**Never use arbitrary font sizes like `text-[12px]`.**

**Heading hierarchy must match ToC hierarchy:**
- If a section appears as Level 2 in ToC, it must render as a prominent `<h2>` in the report
- Level 3 items (evidence) use small uppercase labels, not headings

---

## Component Patterns

### Section Dividers

Use a label with a horizontal line:

```tsx
<div className="flex items-center gap-3">
  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
    Röstningsresultat
  </span>
  <div className="flex-1 h-px bg-border" />
</div>
```

### Cards

Minimal styling:

```tsx
<div className="p-4 rounded-lg border bg-card">
  {/* content */}
</div>
```

No shadows. No gradients. No colored borders.

### Callouts / Highlights

Use subtle background, not colored borders:

```tsx
<aside className="p-4 rounded-lg bg-muted/30">
  <p className="text-sm">{content}</p>
</aside>
```

### Data Tables

```tsx
<figure>
  <figcaption className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
    Historiska röstmönster
  </figcaption>
  <div className="overflow-x-auto rounded-lg border">
    <table className="w-full text-sm">
      {/* ... */}
    </table>
  </div>
</figure>
```

### Quotes

```tsx
<blockquote className="pl-4 border-l-2 border-border">
  <p className="text-base italic">{quote}</p>
  <footer className="mt-2 text-sm text-muted-foreground">
    — {name}, {party}
  </footer>
</blockquote>
```

### Timeline

Use a simple vertical line with dots:

```tsx
<div className="relative pl-6 border-l border-border">
  {events.map((event) => (
    <div className="relative mb-4">
      <div className="absolute -left-[9px] top-1 size-2 rounded-full bg-muted-foreground" />
      <time className="text-xs text-muted-foreground">{event.date}</time>
      <p className="font-medium">{event.description}</p>
    </div>
  ))}
</div>
```

No colored dots. No event-type colors.

---

## Table of Contents

The ToC should reflect the pyramid structure:

1. **Level 1** (Executive Summary): No indentation, `font-medium`
2. **Level 2** (Key Findings): `pl-3`, `font-normal`
3. **Level 3** (Evidence): `pl-6`, `text-xs`

A reader should understand the main conclusions from the ToC alone.

---

## Checklist

Before publishing a report:

### Content
- [ ] Main conclusion stated in first paragraph
- [ ] 3-5 supporting arguments, each with evidence
- [ ] All categorizations are MECE
- [ ] Executive summary is self-contained

### Design
- [ ] No arbitrary Tailwind colors
- [ ] No colored left borders
- [ ] Spacing uses only the defined scale
- [ ] Party colors only as small indicators
- [ ] No shadows or gradients on cards

### Tone
- [ ] Concrete language with specific numbers
- [ ] No marketing copy or superlatives
- [ ] Sources cited for all claims
