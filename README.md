---
title: "Theophysics Layers Plugin — Build Spec"
version: "1.0"
date: 2026-03-23
author: David Lowe + Claude (Opus)
target: Obsidian Plugin (TypeScript)
builder: Codex / Claude Code
repo: github.com/DavidLoweOKC/theophysics-layers
---

# THEOPHYSICS LAYERS PLUGIN — BUILD SPECIFICATION

## THE PROBLEM (Three Audiences, One Document)

Every Theophysics paper serves three readers simultaneously:

| Audience | Needs | Current Solution | Gap |
|----------|-------|-----------------|-----|
| **Reader** | Clean prose, no clutter | Papers are clean | ✓ Solved |
| **Physicist** | Formal backbone on demand | Callouts exist but manual | Needs toggle + auto-render |
| **Machine** | Parseable JSON for pipeline | `%%{...}%%` blocks | Needs visual render layer |

**This plugin bridges all three with ONE data source and THREE render modes.**

---

## FEATURE 1: MATH INTERLINEAR DISPLAY

### What It Does
Renders equations with a word-for-word English translation stacked directly underneath each symbol — like an interlinear Bible but for math.

### Three Layers Per Equation

```
LAYER 1 — THE EQUATION (LaTeX rendered)
E_{final} = PS × CF = PS × (0.5 + 0.5 · ED) × (0.5 + 0.5 · EC)

LAYER 2 — THE TERM STACK (English under each symbol)
E_final    =   PS              ×   CF
Evidence       Phenomenon          Completeness
Score          Strength            Factor

LAYER 3 — THE PLAIN ENGLISH
"Evidence score equals what you observed times how complete
your explanation is. No explanation = half credit max."
```

### Markdown Syntax (Author writes this)


````markdown
> [!math-interlinear]
> ```equation
> E_{final} = PS \times CF
> ```
> ```terms
> E_final  | Evidence Score (the final number)
> PS       | Phenomenon Strength (what you observed)
> CF       | Completeness Factor (how well you explained it)
> ```
> ```english
> Evidence score equals what you observed times how complete
> your explanation is. No explanation = half credit max.
> ```
````

### Render Behavior

**Reading View (default):** Shows all three layers stacked:
- Equation in a styled box (use existing `[!math-display]` CSS)
- Term stack in monospace, aligned columns, muted color
- Plain English in italic below

**Compact Mode (toggle):** Shows only the equation. Click to expand terms + English.

**The term stack uses CSS grid alignment:**
```
| Symbol Column (mono, bold) | = | English Column (regular, muted) |
```

Each term in the stack is individually hoverable — hover shows the full definition tooltip.

### CSS Classes

```css
.math-interlinear-container { /* outer wrapper */ }
.math-interlinear-equation  { /* LaTeX render zone */ }
.math-interlinear-terms     { /* term grid */ }
.math-interlinear-term      { /* single term row */ }
.math-interlinear-symbol    { /* left column: symbol */ }
.math-interlinear-meaning   { /* right column: English */ }
.math-interlinear-english   { /* plain statement below */ }
```

---

## FEATURE 2: EXPANDABLE PARAGRAPH ANNOTATIONS

### What It Does
After any paragraph, hidden content can be expanded/collapsed by clicking.
Like a `<details>` tag but rendered from `%%{...}%%` JSON blocks OR from
explicit `> [!expand]` callouts. Can hold 1 line or 50 lines. Rolls back up
and nobody's the wiser.

### Two Input Formats (both render the same way)

**Format A: Machine-written JSON (from OpenAI pipeline)**
```markdown
God designed a universe where you cannot exist without experiencing grace.
%%{"law":["L01"],"axioms":["D9.1","BC2"],"direction":"P↔S","note":"Five structural properties map to ISO-001."}%%
```

**Format B: Human-written expandable callout**
```markdown
God designed a universe where you cannot exist without experiencing grace.

> [!expand]- L01 · D9.1, BC2 · P↔S
> Five structural properties of gravity map 1:1 to grace (ISO-001):
> 1. Universal — acts on every mass / every soul
> 2. Unshieldable — no material blocks it / no sin blocks grace
> 3. Distance-dependent — weakens but never zero
> 4. Always attractive — never repulsive
> 5. Conservative — defines a potential well
>
> **Scripture:** John 12:32 — "I will draw all people to myself"
> **Equation:** F = Gm₁m₂/r² ↔ G(d) = G₀/(1+(d/d₀)²)
> **Gap:** Modified form not derived from χ-field Lagrangian
```

### Render Behavior

**Reader Mode (default — toggle OFF):**
- `%%{...}%%` blocks are invisible (Obsidian default)
- `> [!expand]-` callouts collapse to a single thin line with colored badge
- Paper reads as clean prose

**Physicist Mode (toggle ON via ribbon button):**
- `%%{...}%%` blocks render as tiny colored inline badges AFTER the paragraph:
  - Law tags: blue pill badges (L01, L05, etc.)
  - Axiom codes: gold pill badges (D9.1, BC2, etc.)
  - Direction arrow: gray arrow badge (P↔S, S→P, etc.)
- Click ANY badge → expands the full annotation below the paragraph
- Click again → collapses back to badge
- Multiple paragraphs can be expanded simultaneously

**Machine Mode (no render — Python reads raw):**
- `%%{...}%%` blocks parsed by SemanticBlockManager (already exists)
- Feeds into scoring engine, Postgres, knowledge graph

### The Ribbon Toggle

Single button in the left ribbon: 🔬 (microscope icon)
- OFF = Reader mode (clean)
- ON = Physicist mode (badges visible)
- Keyboard shortcut: Ctrl+Shift+L (Layers)

### Expand Animation
- Duration: 150ms ease-out
- Max-height transition from 0 to auto
- Content fades in as it expands
- Collapse: same in reverse
- NO layout shift above the expansion point

---

## FEATURE 3: PER-SENTENCE ISOLATION (Bible App Pattern)

### What It Does
Any sentence or paragraph can have an annotation chain that drills DOWN through layers. Like David's Bible app where clicking ">" on a verse reveals commentary, cross-references, and analysis underneath — and each of THOSE can expand further.

### Syntax

```markdown
Some claim about gravity and grace being structurally identical.%%{ref:"expand-001"}%%

%%[expand-001]
> **Law:** L01 (Grace ↔ Gravity)
> **Axioms:** D9.1, BC2, A9.1, ISO-001
> **Direction:** P↔S (bidirectional isomorphism)
> **Strength:** STRONG — four preservation criteria met
>
> > [!deeper]- Formal Proof (click to expand)
> > Theorem 1: π: grace → gravity preserves:
> > (i) Mathematical form: both inverse-square
> > (ii) Boundary behavior: max at d→0, zero at d→∞
> > (iii) Symmetry: both isotropic, time-independent
> > (iv) Conservation: both define potential wells
>
> > [!scripture]- Biblical Anchor
> > John 12:32 — "I, when I am lifted up, will draw all people to myself"
> > Romans 1:20 — "invisible qualities clearly seen from what has been made"
>
> > [!gap]- Known Gap
> > Modified inverse-square form G(d) = G₀/(1+(d/d₀)²) not derived
> > from χ-field Lagrangian. Needs formal treatment in FT-018.
%%]
```

### Render Behavior
- The `%%{ref:"expand-001"}%%` is invisible in reading view
- In Physicist Mode: a tiny "▶" icon appears at end of sentence
- Click ▶ → the `%%[expand-001]...%%]` block renders below as a styled panel
- Inside that panel, nested callouts work normally (deeper, scripture, gap all collapse independently)
- Click ▶ again → everything rolls back up
- The sentence above doesn't move — content inserts BELOW

### Nesting Depth
- Level 0: The sentence (always visible)
- Level 1: The annotation panel (click ▶ to reveal)
- Level 2: Nested callouts inside the panel (click individually)
- Level 3: Further nesting if needed (Obsidian supports 3+ levels)
- No limit enforced but recommend max 3 levels for readability

---

## FEATURE 4: MATH TRANSLATION LAYER (The Missing Piece)

### What It Does
Bridges the equation and the English by showing WHICH WORDS map to WHICH SYMBOLS. The equation sits on top. Below it, each symbol gets its English translation aligned directly underneath. Then the plain English statement uses those SAME English words in a coherent sentence.

### Example: Evidence Completeness Factor

```
┌─────────────────────────────────────────────────────────────┐
│  E_final  =  PS  ×  (0.5 + 0.5·ED)  ×  (0.5 + 0.5·EC)    │  ← EQUATION
│  ───────     ──     ──────────────      ──────────────      │
│  Evidence    What   Explanation          Experience          │  ← TERM STACK
│  Score       You    Depth                Coherence           │
│              Saw    Penalty              Penalty             │
│                                                             │
│  "Your evidence score is what you observed, penalized by    │  ← PLAIN ENGLISH
│   how well you can explain it AND how well it holds up      │
│   in lived reality. Can't explain it? Half credit max.      │
│   Never tested outside a lab? Penalized again."             │
└─────────────────────────────────────────────────────────────┘
```

### Syntax (in markdown)

```markdown
> [!math-stack]
> | E_final | = | PS | × | (0.5 + 0.5·ED) | × | (0.5 + 0.5·EC) |
> | Evidence Score | | What You Saw | | Explanation Penalty | | Experience Penalty |
> ---
> Your evidence score is what you observed, penalized by how well
> you can explain it AND how well it holds up in lived reality.
```

### Render Rules
1. Row 1 (equation): monospace, bold, larger font, centered
2. Row 2 (terms): regular weight, muted color, smaller font, each cell centered under its symbol
3. Divider: thin rule
4. Row 3 (English): italic, normal size, full-width paragraph
5. Lines connect each term-word to its symbol above (thin vertical hairlines, very subtle)
6. Entire block is collapsible (default: expanded, can toggle to show only equation)

---

## FEATURE 5: MATH TRANSLATION TOGGLE (The Non-Math Reader Layer)

### What It Does
A separate toggle (independent of Reader/Physicist mode) that makes equations accessible to anyone. When OFF, equations display clean LaTeX. When ON, English word translations appear stacked directly above each symbol in the equation. The words won't form a grammatically correct sentence on their own, but when the reader sees the plain English summary below, every word clicks because they just saw where it came from.

### The Three States

**Math Mode (default):** Clean equation only.
```
chi = integral (G * M * E * S * T * K * R * Q * F * C) dx dy dt
```

**Translation Mode (toggle ON):** Word stack appears ABOVE each symbol.
```
Coherence   across all  Grace  Mind  Entropy  Spirit  Time  Knowledge  Relational  Quantum  Faith  Curvature   over space+time
   chi    =   integral  ( G   * M   *  E     *  S    * T   *   K      *    R      *   Q    *  F   *    C    )  dx dy dt
```

**Full Mode (both toggles ON):** Word stack + plain English + collapsible legend.
```
Coherence   across all  Grace  Mind  Entropy  Spirit  Time  Knowledge  Relational  Quantum  Faith  Curvature   over space+time
   chi    =   integral  ( G   * M   *  E     *  S    * T   *   K      *    R      *   Q    *  F   *    C    )  dx dy dt
-----
"Reality is the product of ten interlocking variables -- physical and spiritual -- integrated across all space and time.
 If any single variable goes to zero, the entire coherence field collapses. Everything depends on everything."
```

### Toggle Control
- Ribbon button: Greek letter icon or book icon (separate from the microscope toggle)
- Keyboard shortcut: Ctrl+Shift+M (Math translation)
- Can be ON while Reader mode is ON (they're independent)
- Settings: Default ON or OFF per user preference

### Render Rules
1. Word row sits DIRECTLY ABOVE the equation row, same grid columns
2. Words are muted color, smaller font, centered under their symbol
3. Subtle vertical hairlines connect each word to its symbol below
4. Word row has very light background shading (barely there, just enough to distinguish)
5. Thin border around the entire math block when translation is active
6. Animation: words fade in/out on toggle (100ms)

### Why This Matters
A physicist reads chi = integral(G*M*E*S*T*K*R*Q*F*C) and thinks "ten-variable coherence integral." A non-physicist reads the SAME equation and sees: "Coherence equals Grace times Mind times Entropy..." and gets the conceptual architecture without needing the math. Same page. Same document. No dumbing down. Just a layer that reveals what the symbols mean in human words.

### Markdown Syntax
Uses the same `[!math-stack]` callout from Feature 4. The plugin reads the term grid and renders it as the word-above-symbol overlay when the toggle is ON.

```markdown
> [!math-stack]
> | chi | = | integral | ( G | * M | * E | * S | * T | * K | * R | * Q | * F | * C ) | dx dy dt |
> | Coherence | | across all | Grace | Mind | Entropy | Spirit | Time | Knowledge | Relational | Quantum | Faith | Curvature | over space and time |
> ---
> Reality is the product of ten interlocking variables integrated across all space and time.
```

### CSS Classes
```css
.math-translation-row { /* the English words row above equation */ }
.math-translation-word { /* individual word cell */ }
.math-translation-connector { /* subtle hairline connecting word to symbol */ }
.math-translation-active { /* parent class when toggle is ON */ }
.math-translation-shading { /* very light background on word row */ }
```

---

## UPDATED TOGGLE SUMMARY

The plugin has THREE independent toggles:

| Toggle | Icon | Shortcut | What It Controls |
|--------|------|----------|-----------------|
| Reader/Physicist | Microscope | Ctrl+Shift+L | Annotation badges + expand panels |
| Math Translation | Book/Alpha | Ctrl+Shift+M | English words above equation symbols |
| Math Full | (sub-toggle) | Click equation | Expand legend + proof below equation |

All three are independent. Any combination works. Reader mode + Math Translation ON = clean prose with human-readable equations. Physicist mode + Math Translation OFF = annotations visible, equations raw. Everything ON = full disclosure, every layer visible.

---

## ARCHITECTURE

### Plugin Structure

```
theophysics-layers/
├── main.ts                    # Plugin entry, registers views + commands
├── src/
│   ├── toggle.ts              # Ribbon button + mode state (reader/physicist)
│   ├── parsers/
│   │   ├── json-annotation.ts # Parses %%{...}%% blocks
│   │   ├── expand-block.ts    # Parses %%[expand-ID]...%%] blocks
│   │   └── math-stack.ts      # Parses [!math-stack] and [!math-interlinear]
│   ├── renderers/
│   │   ├── badge-renderer.ts  # Renders law/axiom/direction badges inline
│   │   ├── expand-renderer.ts # Renders expandable panels below paragraphs
│   │   ├── math-renderer.ts   # Renders interlinear equation display
│   │   └── animation.ts       # Shared expand/collapse animation
│   ├── css/
│   │   ├── badges.css         # Inline badge styles (reuse axiom-inline-callouts.css)
│   │   ├── expand.css         # Expandable panel styles
│   │   └── math-stack.css     # Math interlinear grid styles
│   └── types.ts               # Shared types (Annotation, MathTerm, ExpandBlock)
├── manifest.json
├── package.json
└── styles.css                 # Main stylesheet (imports from src/css/)
```

### Dependencies
- Obsidian API (MarkdownPostProcessor, Plugin, Setting)
- No external dependencies — pure TypeScript + CSS
- MathJax (already bundled with Obsidian for LaTeX rendering)

### Data Flow

```
Author writes paper
    ↓
OpenAI pipeline injects %%{...}%% JSON after each paragraph
    ↓
Plugin parses in Reading View:
    ├── Reader Mode: %%{...}%% invisible, callouts collapsed → clean prose
    ├── Physicist Mode: %%{...}%% → colored badges → click → expand panel
    └── Machine Mode: Python reads raw %% blocks → Postgres/scoring engine
    ↓
Math equations rendered with interlinear stack
    ↓
Nested expandable sections drill down on demand
```

### Integration with Existing Systems

| System | How This Plugin Connects |
|--------|------------------------|
| SemanticBlockManager | Already parses `%%semantic` blocks. Extend to parse `%%{...}%%` inline blocks |
| Scoring Engine (Python) | Reads `%%{...}%%` for per-paragraph law/axiom classification |
| 7Q Scored Callouts CSS | Expand panels use same color scheme (Q0-Q7 colors) |
| axiom-inline-callouts.css | Badge rendering reuses existing `[!ax]` compact styling |
| Tabbed Callout CSS | Nested expand panels support tabbed sub-sections |
| PostgreSQL (kj) | Annotations sync to `theophysics.classifications` table |

---

## SETTINGS

| Setting | Default | Options |
|---------|---------|---------|
| Default mode | Reader | Reader / Physicist |
| Show math interlinear | Expanded | Expanded / Equation Only |
| Badge size | Small | Small / Medium / Hidden |
| Expand animation | 150ms | 0ms-500ms slider |
| Parse %%{...}%% blocks | ON | ON / OFF |
| Parse %%[expand]%% blocks | ON | ON / OFF |
| Keyboard shortcut | Ctrl+Shift+L | Customizable |

---

## BUILD PRIORITY

1. **Ribbon toggle** (reader/physicist mode switch) — 2 hours
2. **%%{...}%% badge renderer** (parse JSON, render badges) — 4 hours
3. **Expand/collapse animation** (click badge → panel opens) — 3 hours
4. **Math interlinear renderer** ([!math-stack] callout) — 4 hours
5. **%%[expand-ID]%% deep drill** (per-sentence expandable) — 4 hours
6. **Settings panel** — 2 hours
7. **Polish + testing** — 3 hours

**Total estimate: ~22 hours of focused build time**

---

## EXAMPLE: FULL PAPER WITH ALL FEATURES

```markdown
---
title: "FT-001: The Truth Measurement Method"
---

> [!math-stack]
> | E_final | = | PS | × | CF |
> | Evidence Score | | Phenomenon Strength | | Completeness Factor |
> ---
> Your evidence score is what you observed times how complete your explanation is.

God designed a universe where you cannot exist without experiencing grace.
%%{"law":["L01"],"axioms":["D9.1","BC2"],"direction":"P↔S","note":"ISO-001 fully activated"}%%

Every step you take, gravity holds you to the earth.%%{ref:"expand-grav-001"}%%

%%[expand-grav-001]
> **ISO-001:** Grace ↔ Gravity — five structural properties preserved
> > [!deeper]- The Five Properties
> > 1. Universal — acts on all mass / all souls
> > 2. Unshieldable — no barrier blocks it
> > 3. Distance-dependent — weakens, never zero
> > 4. Always attractive — never repulsive
> > 5. Conservative — defines potential well
>
> > [!scripture]- John 12:32
> > "I, when I am lifted up from the earth, will draw all people to myself."
%%]

That is grace. Grace is the spiritual gravity of God.
%%{"law":["L01","L10"],"axioms":["D9.1","BC2","ISO-001"],"direction":"S→P","note":"STRONG. Both sides stated."}%%
```

**Reader sees:** Clean prose. Three paragraphs. One equation box at top.

**Physicist sees:** Clean prose + tiny colored badges after each paragraph + equation with term stack. Click any badge → full annotation unfolds. Click the "▶" after "gravity holds you" → five properties, scripture anchor, and gap analysis appear. Click again → gone.

**Machine sees:** Raw `%%{...}%%` JSON blocks for every paragraph. Feeds scoring engine.

---

*Theophysics Layers Plugin v1.0 Spec*
*David Lowe · POF 2828 · March 23, 2026*
*Send to: Codex or Claude Code for build*
