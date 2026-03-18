# Politikerkollen – Design Aesthetics

This document defines the visual design principles for Politikerkollen. It serves as guidance for AI assistants and human designers working on the frontend.

## Core Principles

### 1. Design serves data

**Design that calls attention to itself fails; design that makes political accountability feel accessible and trustworthy succeeds.**

Politikerkollen is democratic infrastructure. Every visual choice must build trust and serve clarity. We are not a consumer app seeking engagement—we are a civic tool enabling informed participation.

### 2. Show, don't tell

**Never describe what you can demonstrate. Let data speak for itself.**

Instead of marketing copy explaining what we do, show actual data. Instead of feature descriptions, show the feature working. This principle applies everywhere:

- Landing pages show live data, not product descriptions
- Feature sections display real examples, not abstract explanations  
- Credibility comes from transparency, not claims

This differentiates us from competitors who describe their products. We demonstrate ours.

**Examples:**
- ✓ A mini scorecard showing actual promise-keeping percentages
- ✓ A real timeline from an actual legislative process
- ✓ A recent vote with actual politician names
- ✗ "Track politician promises with our advanced platform"
- ✗ "AI-powered legislative intelligence"
- ✗ Stock imagery or decorative illustrations

---

## The Anti-Pattern: What We Avoid

Generic AI-generated aesthetics undermine credibility. Avoid:

- **Sensationalism**: Flashy colors, dramatic animations, attention-grabbing effects
- **Bias perception**: Colors or styles associated with any Swedish political party
- **Complexity that obscures**: Decorative elements competing with information
- **Startup aesthetics**: Marketing-first design that prioritizes style over substance
- **Trendy choices**: Design decisions that will date quickly

---

## Typography

### Established Fonts

- **Sans-serif (body)**: Inter – clean, highly readable, excellent for data-dense interfaces
- **Serif (headings)**: Source Serif 4 – authoritative, warm, editorial quality
- **Monospace**: Geist Mono – for code and technical data

### Principles

1. **Readability over personality**: Body text must be effortlessly readable at all sizes
2. **Authority in headings**: Serif headings signal editorial quality and trustworthiness
3. **Excellent numerals**: Data-heavy interfaces require fonts with well-designed figures
4. **Consistent hierarchy**: Follow the established type scale in `globals.css`

### Type Scale (from globals.css)

```
Display: 32px / 40px line-height / -0.4px tracking
H1: 26px / 32px / -0.2px
H2: 22px / 28px
H3: 17px / 24px
Body: 15px / 24px / -0.1px
Small: 13px / 20px
```

### Usage

- Headings use `font-serif` (Source Serif 4)
- Body text uses `font-sans` (Inter)
- Never introduce new fonts without explicit approval
- Never use arbitrary font sizes—use the established scale

---

## Color

### Established Palette

The color system uses OKLCH for perceptual uniformity. Key tokens:

**Primary**: `oklch(0.51 0.23 277)` – A deep violet, politically neutral
**Semantic colors**:

- Success: Green (`oklch(0.65 0.19 145)`)
- Warning: Amber (`oklch(0.75 0.15 85)`)
- Destructive: Red (`oklch(0.577 0.245 27.325)`)

**Contrast pair** (for said vs. done comparisons):

- `--contrast-said`: Amber (what was promised)
- `--contrast-done`: Red (what was done differently)

### Principles

1. **Political neutrality is non-negotiable**: Never use colors associated with Swedish parties (blue for M, red for S, green for MP, yellow for L, etc.)
2. **Restrained palettes signal trustworthiness**: Flashy palettes signal sensationalism
3. **Neutral foundation**: Build from grays and off-whites, use accent sparingly
4. **Semantic consistency**: Success/warning/error colors must be used consistently
5. **Dark mode parity**: Both themes must feel equally considered

### Usage

- Use only established CSS variables (`--primary`, `--muted`, etc.)
- Never use arbitrary Tailwind colors like `bg-blue-500`
- Any new color tokens require explicit approval

---

## Motion & Animation

### Established Patterns

From `globals.css`:

- `animate-fade-in-stagger`: 0.4s linear fade with staggered delays (0.05s increments)

### Principles

1. **Every animation must serve comprehension**: Motion should help users track data changes, not decorate
2. **Purposeful transitions**: Smooth state changes that provide feedback
3. **Journalism, not marketing**: The motion vocabulary of The Economist, not a startup landing page
4. **Restraint over spectacle**: One well-timed transition beats five flashy effects

### Appropriate Uses

- Smooth transitions on hover states
- Fade-in for content loading
- Chart/data transitions that help users track changes
- Subtle feedback on interactions

### Inappropriate Uses

- Attention-grabbing entrance animations
- Decorative particle effects
- Bouncing or playful motion
- Anything that feels like it's trying to impress

---

## Layout & Spacing

### Established Containers

```css
.page-container: max-w-5xl, px-4/sm:px-6
.page-container-narrow: max-w-3xl
.page-container-wide: max-w-6xl
```

### Principles

1. **Generous whitespace lets data breathe**: Dense information requires careful visual organization
2. **Clear hierarchy guides attention**: Users should immediately understand what matters
3. **Mobile-first, always**: Every layout must work on small screens
4. **Consistency over creativity**: Use established grid patterns

### Grid Patterns

```css
.card-grid-2: 2 columns on sm+
.card-grid-3: 2 columns on sm+, 3 on lg+
```

---

## Backgrounds & Atmosphere

### Established Pattern

The body uses subtle radial gradients for depth:

```css
background-image:
  radial-gradient(
    circle at 20% 50%,
    var(--gradient-accent-1) 0%,
    transparent 50%
  ),
  radial-gradient(
    circle at 80% 80%,
    var(--gradient-accent-2) 0%,
    transparent 50%
  );
```

Utility patterns available:

- `.pattern-grid` / `.pattern-grid-subtle`: Subtle grid overlay
- `.pattern-dots`: Dot pattern

### Principles

1. **Clean canvas for data**: Backgrounds should never compete with content
2. **Subtle depth over flat**: Light atmospheric effects are acceptable
3. **No decorative noise**: Patterns should be barely perceptible

---

## Component Patterns

### Cards

- Use `--card` background with `--card-foreground` text
- Consistent border radius via `--radius` tokens
- Subtle borders using `--border`

### Interactive Elements

- Clear hover states that provide feedback
- Focus states for accessibility
- Disabled states that are obviously disabled

### Data Visualization

- Use the chart color scale (`--chart-1` through `--chart-5`)
- Ensure sufficient contrast for accessibility
- Prefer clarity over visual interest

---

## Reference Points

When making design decisions, reference:

**Quality data journalism** (primary inspiration):

- The Economist – data-driven storytelling with editorial authority
- FiveThirtyEight – making complex data accessible
- Reuters Graphics – clarity and precision in visualization

These publications show data, they don't describe it. They earn trust through transparency.

**Scandinavian civic design**:

- GOV.UK (British, but gold standard for civic UX)
- Skatteverket
- 1177 Vårdguiden

**What we are NOT**:

- A SaaS marketing site with feature grids and testimonials
- A social media platform
- A news entertainment site
- A political campaign
- A startup seeking engagement metrics

---

## Decision Framework

Before implementing any visual change, verify:

1. **Does this build trust?** Civic infrastructure must feel reliable
2. **Does this serve clarity?** Information must be easy to parse
3. **Is this politically neutral?** No party associations
4. **Does this follow the system?** Use established tokens and patterns
5. **Will this age well?** Avoid trendy choices that date quickly

---

## AI Assistant Guidelines

When generating frontend code for Politikerkollen:

1. **Read `globals.css` first**: Understand the established system
2. **Use only existing tokens**: No arbitrary colors, sizes, or fonts
3. **Prefer restraint**: When in doubt, do less
4. **Match the tone**: Serious, trustworthy, Scandinavian-modern
5. **Test both themes**: Light and dark mode must both work
6. **Mobile-first**: Every component must work on small screens

**Never**:

- Introduce new fonts
- Use arbitrary Tailwind colors
- Add decorative animations
- Create "impressive" visual effects
- Prioritize aesthetics over information clarity
