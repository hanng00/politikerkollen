# Assessment: Post-Outreach Learnings & US Market Analysis

_2026-03-29_

---

## What Happened

Cold-called two PR agencies in Stockholm (LennoxPR, GK Nordic) with an open pitch: "I built this data platform, here's promise tracking as an example product, tell me about your world."

**Results:**

- Neither saw direct use for promise tracking. Finding the right politician to influence is "easy" and handled through existing channels.
- André Frisk (GK Nordic) runs archon.se — a niche political data platform for wind power in municipalities. 3.8M documents, 84k people, 427k meetings across Sweden's 290 municipalities. Sales-led, closed product.
- Both thought the site looked great. PostHog showed return traffic in the days following the calls.
- André later revealed as the builder of archon.se — validates that niche political data platforms have paying customers.

**Key insight from the calls:**

> People don't understand the power of a data platform. They need a finished product directly tied to their problem.

This is a distribution insight, not a product failure. The platform is the right foundation. The mistake would be to keep pitching the platform instead of shipping opinionated products on top of it.

---

## US Market Landscape

The US political intelligence market is mature and stratified. Here's what exists, what they charge, and what transfers (or doesn't) to Sweden.

### Tier 1: Enterprise Political Intelligence ($5k–$14k+/year)

| Company | Model | Revenue Source | Key Feature |
|---|---|---|---|
| **FiscalNote/CQ** | Public company, acquisition-driven | $7k–14k/yr subscriptions | Policy monitoring, predictive scoring, advocacy CRM. Recently pivoting to prediction market content. |
| **Bloomberg Government (BGOV)** | Premium subscription | $7.5k–14k/yr | Legislative tracking, budget analysis, federal contracting intel. Sales-led, no self-serve. |
| **Quorum** | Venture-backed, PLG + sales | ~$5k+/yr professional tier | All-in-one: bill tracking, stakeholder CRM, grassroots advocacy, PAC management. 50%+ of Fortune 100 as customers. |

### Tier 2: Mid-Market / Self-Serve ($30–$5k/year)

| Company | Model | Revenue Source | Key Feature |
|---|---|---|---|
| **Plural Policy** | Freemium SaaS | Free → $29/mo → $59/mo → $5k/yr | AI bill summarization, 50-state tracking, momentum indicators. Clearest PLG model in the space. |
| **LegiScan** | Freemium API | Free tier → paid API access | Raw legislative data API. Developer-focused. |

### Tier 3: Civic / Nonprofit (Free, donation/ad-supported)

| Company | Model | Revenue Source | Key Feature |
|---|---|---|---|
| **GovTrack** | For-profit (barely) | Ads + $5–100/yr voluntary memberships | Bill tracking, vote records since 2004. One-person operation. |
| **OpenSecrets** | Nonprofit | Donations | Campaign finance tracking, lobbying disclosure. Gold standard for money-in-politics. |
| **PolitiFact** | Nonprofit/media | Media revenue (Poynter) | Promise tracking ("Obameter"), fact-checking. High brand, zero B2B revenue. |

### The Pattern

The US market tells a clear story of evolution:

```
Civic transparency tool (free)
    → Journalist resource (traffic, no revenue)
    → Professional monitoring tool (subscription)
    → Workflow automation + CRM (enterprise)
    → Predictive intelligence (premium)
```

Every successful commercial player climbed this ladder. The ones that stayed at "transparency tool" remain nonprofits or one-person projects.

---

## Critical Differences: US vs. Swedish Politics

Blindly copying US models would be a mistake. The political systems are fundamentally different, and those differences reshape the product opportunity.

### 1. Party Discipline (Major Implication)

**US:** Weak party discipline. Individual congresspeople vote independently, switch positions, and build personal brands. Tracking individual behavior is high-signal because individuals matter.

**Sweden:** Extreme party discipline. Riksdag MPs vote with their party "to a person, on most issues." Individual tracking has lower signal — an MP voting "against" a promise usually means the *party* decided to, not the individual.

**Implication:** The US "politician scorecard" model (PolitiFact's Obameter, GovTrack's voting records) loses power in Sweden. Party-level analysis and *rhetorical* divergence from party line matters more than vote-level divergence. Our promise tracker should emphasize party scores over individual scores — which it already does on the landing page.

### 2. Market Size (Major Constraint)

**US:** 535 federal legislators, 50 state legislatures, 7,383 state legislators. Massive corporate lobbying industry ($4B+/year). Hundreds of thousands of PA professionals.

**Sweden:** 349 riksdagsledamöter, 290 municipalities, ~21 regions. Lobbying industry is 700–800 people total. PA industry is 400–500 professionals. The entire addressable B2B market for political intelligence in Sweden might be 2,000–3,000 seats.

**Implication:** Enterprise pricing ($7k–14k/year) is viable for maybe 50–100 organizations in Sweden. The Quorum/FiscalNote playbook of "land and expand across a 100k-person market" doesn't work. Either the product needs to be cheaper and broader, or it needs to be so high-value that a small customer base supports it. Archon.se appears to be proving the latter path.

### 3. Transparency Culture (Advantage)

**US:** FOIA requests, campaign finance disclosure, and lobbying registration create structured data sources. But the system is adversarial — transparency is forced.

**Sweden:** Offentlighetsprincipen (principle of public access) makes virtually all government documents public by default. Riksdagen APIs are open and well-structured. Municipal protocols are public. The data is *easier* to get in Sweden.

**Implication:** The data engineering moat in Sweden isn't about *access* (anyone can get it) — it's about *sense-making*. The LLM cognition layer that interprets, classifies, and generates signals from open data is the real competitive advantage. This is where we're strong.

### 4. Lobbying Culture (Shapes the Buyer)

**US:** Lobbying is formal, regulated, and massive. Lobbyists register, file disclosures, and operate in a well-defined ecosystem. They're the primary buyers of political intelligence tools.

**Sweden:** Lobbying is informal and unregulated. No registration, no mandatory disclosure. 37% of lobbyists are former politicians relying on personal networks. The "buyer" isn't a registered lobbyist with a software budget — it's a PA consultant, an industry association, or an in-house GR person at a large company.

**Implication:** The sales motion is different. In the US, you can target "registered lobbyists" as a segment. In Sweden, you need to find the person at Vattenfall or Fastighetsägarna whose job includes "keeping track of what's happening in politics" but who doesn't call themselves a lobbyist. The outreach we did to PR agencies missed — they're intermediaries, not the end users.

### 5. Municipal Politics (Unique Opportunity)

**US:** State and local politics are tracked by separate tools (Plural covers all 50 states). The market is fragmented.

**Sweden:** The 290 municipalities is where real estate, energy, and infrastructure decisions happen. This is what Archon.se indexes. There's no equivalent in the US model because US municipal politics is structurally different (strong mayors vs. Swedish kommunfullmäktige).

**Implication:** Municipal protocol analysis is a genuinely unique Swedish opportunity. It's also where the data is messiest and where LLM-based sense-making adds the most value. This could be an expansion path, but not the starting point (too much data engineering for a POC).

---

## What Transfers, What Doesn't

| US Pattern | Transfers to Sweden? | Why / Why Not |
|---|---|---|
| Freemium → Enterprise tiering (Plural) | **Yes** | Good PLG model. Free promise tracker drives traffic, paid intelligence reports capture B2B value. |
| CRM + workflow automation (Quorum) | **Partially** | Sweden's PA market is too small for a full CRM play. But "automated briefings delivered to inbox" transfers well. |
| Prediction scoring (FiscalNote) | **Yes, with caveats** | Predicting Swedish outcomes is *easier* (fewer veto points, stronger party discipline) but the audience that would pay for predictions is smaller. |
| Individual politician tracking (GovTrack) | **No** | Party discipline makes individual tracking a civic engagement feature, not a B2B feature. |
| Promise tracking (PolitiFact) | **No for B2B, Yes for growth** | As the PR agencies confirmed: "we know they're inconsistent." Promise tracking is a top-of-funnel growth tool, not a product people pay for. |
| Legislative staff data / contact database (Quorum, BGOV) | **No** | Sweden is too small. Everyone in PA already knows who to call. LennoxPR confirmed this explicitly. |
| Industry-vertical intelligence (BGOV, Archon) | **Yes** | This is the clearest revenue path. Archon.se validates it domestically. BGOV validates it at scale. |

---

## Synthesis: Where We Stand

**What we've built well:**
- Data infrastructure (Riksdag APIs → DuckDB → dbt → LLM cognition)
- Promise tracking with composite scoring methodology
- A visually compelling, open product (PLG advantage over Archon's closed model)
- Conversational AI over parliamentary data
- Two initial intelligence reports (Energi, Strandskydd)

**What the market is telling us:**
- Promise tracking is a civic good and a traffic driver, not a B2B product
- The data platform's value is invisible until it produces a finished answer to a specific problem
- The buyer is not the PR agency — it's their client (in-house PA/GR at corporates and industry associations)
- Archon.se validates that niche Swedish political data has paying customers

**What the US market teaches us:**
- The money moves up the value chain: data → monitoring → analysis → prediction → workflow
- Freemium works as an acquisition channel (Plural's model)
- Industry-vertical packaging is how you make political data feel urgent
- Automated delivery (briefings, alerts) beats dashboards for busy professionals

---

## Recommended Next Moves

### 1. Ship a vertical intelligence report as an interactive web product

Pick one vertical (Energy or Real Estate — both have active policy churn right now). Use the existing cognition pipeline to generate a structured, MECE-driven analysis. Deliver it as an interactive report page (not PDF) where every claim links back to source documents.

This is the "finished answer to a specific problem" that the cold calls revealed is missing. It's also what Plural Policy does at $29/mo and BGOV does at $14k/yr — we'd be finding our price point somewhere in between.

### 2. Automated weekly "Signals" digest

Turn the vertical report from a one-off into a recurring product. A weekly email or web page — "Veckans politiska signaler: Energi" — covering new votes, motions, and rhetorical shifts in a given policy area. This is the delivery format that US market leaders converged on: BGOV's daily alerts, Quorum's tracking notifications, Plural's momentum indicators. Busy PA professionals don't log into dashboards — they read briefings.

Why this matters strategically:
- **Proves recurring value.** A one-time report is a consulting deliverable. A weekly digest is a subscription product.
- **Tests willingness to pay.** Gate it behind email signup first, then a paywall. Even 5 beta subscribers who open it every Monday tells you something.
- **Leverages existing infra.** The cognition pipeline already classifies documents and detects alignment. Scheduling a weekly aggregation + LLM summary is incremental, not architectural.
- **Validated by the US market.** Every commercial player in the space delivers alerts/digests. The ones that only offer dashboards (GovTrack) stayed small.

### 3. Valguide 2026 MVP

The 2026 election is the highest-leverage moment for the promise tracker. A constituency-level "Hur röstade din riksdagsledamot?" voter guide:

- **SEO:** 349 politician pages x multiple issues = long-tail search traffic. GovTrack built its entire audience this way — 15M+ visits during US election years.
- **Virality:** "Kolla vad din politiker EGENTLIGEN röstat för" is inherently shareable. PolitiFact's Obameter gets 10x traffic spikes around elections.
- **Press:** Swedish media covers election tools. Valkompassen gets massive coverage — a data-driven accountability tool would too.
- **Funnel:** Every voter who lands on the site sees the intelligence product. Free civic tool feeds the paid B2B product.

The data already exists (votes, speeches, promise scores). The `/val` route is already stubbed. This is a high-impact, moderate-effort project with a hard deadline (election date) that creates urgency.

**US parallel:** GovTrack is a $5–100/yr hobby project as a dashboard, but it generates 15M visits during elections. We don't need to monetize the Valguide directly — it's the top of funnel.

**Swedish nuance:** Party discipline means the guide should emphasize *party* voting patterns and promise fulfillment, not individual MP scorecards. Frame it as "Vad har partierna faktiskt gjort?" rather than individual gotchas.

### 4. Keep the promise tracker as the free, open growth engine

Don't kill it. Don't try to monetize it directly. It's the equivalent of OpenSecrets or GovTrack — a civic good that drives traffic, builds brand, and creates SEO surface area. The Valguide (above) is its natural election-year extension.

### 5. Target in-house PA/GR as the buyer, not PR agencies

The next round of outreach should go to:
- Industry associations (Fastighetsägarna, Energiföretagen, Svenskt Näringsliv)
- In-house GR/PA leads at large companies (Vattenfall, Fortum, JM, Skanska)
- Political journalists (DN, SvD, Ekot) — for distribution, not revenue

### 6. Build the social content flywheel

Auto-generated "löfte vs. handling" shareable cards posted to X/LinkedIn. Low effort, high distribution. Every card links back to the site. This is the growth channel that PolitiFact used to build brand, adapted for Swedish political Twitter.

---

## Open Questions

- **Pricing:** Is the Swedish market big enough for a $500/mo product with 50 customers ($300k ARR), or does it need to be $5k/mo with 10 customers? Archon.se's pricing would answer this — worth investigating.
- **Municipal data:** When (not if) to expand beyond Riksdag. The data engineering is significant but it's where Archon competes and where real estate/energy decisions actually happen.
- **Nordic expansion:** The same model (parliamentary data + LLM analysis) could work for Denmark (Folketinget), Norway (Stortinget), Finland (Eduskunta). Similar political systems, similar market sizes. Could 4x the TAM.
- **White-label:** Could PA agencies resell intelligence reports under their own brand? This turns the "they don't need our tool" objection into "they need our engine."
