---
title: "Theophysics Layers Plugin â€” Build Spec"
version: "1.0"
date: 2026-03-23
author: David Lowe + Claude (Opus)
target: Obsidian Plugin (TypeScript)
builder: Codex / Claude Code
repo: github.com/DavidLoweOKC/theophysics-layers
---

# THEOPHYSICS LAYERS PLUGIN â€” BUILD SPECIFICATION

## THE PROBLEM (Three Audiences, One Document)

Every Theophysics paper serves three readers simultaneously:

| Audience | Needs | Current Solution | Gap |
|----------|-------|-----------------|-----|
| **Reader** | Clean prose, no clutter | Papers are clean | âœ“ Solved |
| **Physicist** | Formal backbone on demand | Callouts exist but manual | Needs toggle + auto-render |
| **Machine** | Parseable JSON for pipeline | `%%{...}%%` blocks | Needs visual render layer |

**This plugin bridges all three with ONE data source and THREE render modes.**

---

## FEATURE 1: MATH INTERLINEAR DISPLAY

### What It Does
Renders equations with a word-for-word English translation stacked directly underneath each symbol â€” like an interlinear Bible but for math.

### Three Layers Per Equation

```
LAYER 1 â€” THE EQUATION (LaTeX rendered)
E_{final} = PS Ã— CF = PS Ã— (0.5 + 0.5 Â· ED) Ã— (0.5 + 0.5 Â· EC)

LAYER 2 â€” THE TERM STACK (English under each symbol)
E_final    =   PS              Ã—   CF
Evidence       Phenomenon          Completeness
Score          Strength            Factor

LAYER 3 â€” THE PLAIN ENGLISH
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

Each term in the stack is individually hoverable â€” hover shows the full definition tooltip.

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
%%{"law":["L01"],"axioms":["D9.1","BC2"],"direction":"Pâ†”S","note":"Five structural properties map to ISO-001."}%%
```

**Format B: Human-written expandable callout**
```markdown
God designed a universe where you cannot exist without experiencing grace.

> [!expand]- L01 Â· D9.1, BC2 Â· Pâ†”S
> Five structural properties of gravity map 1:1 to grace (ISO-001):
> 1. Universal â€” acts on every mass / every soul
> 2. Unshieldable â€” no material blocks it / no sin blocks grace
> 3. Distance-dependent â€” weakens but never zero
> 4. Always attractive â€” never repulsive
> 5. Conservative â€” defines a potential well
>
> **Scripture:** John 12:32 â€” "I will draw all people to myself"
> **Equation:** F = Gmâ‚mâ‚‚/rÂ² â†” G(d) = Gâ‚€/(1+(d/dâ‚€)Â²)
> **Gap:** Modified form not derived from Ï‡-field Lagrangian
```

### Render Behavior


---

## FEATURE 2: EXPANDABLE PARAGRAPH ANNOTATIONS (continued)

### Render Behavior

**Reader Mode (default â€” toggle OFF):**
- `%%{...}%%` blocks are invisible (Obsidian default)
- `> [!expand]-` callouts collapse to a single thin line with colored badge
- Paper reads as clean prose

**Physicist Mode (toggle ON via ribbon button):**
- `%%{...}%%` blocks render as tiny colored inline badges AFTER the paragraph:
  - Law tags: blue pill badges (L01, L05, etc.)
  - Axiom codes: gold pill badges (D9.1, BC2, etc.)  
  - Direction arrow: gray arrow badge (Pâ†”S, Sâ†’P, etc.)
- Click ANY badge â†’ expands the full annotation below the paragraph
- Click again â†’ collapses back to badge
- Multiple paragraphs can be expanded simultaneously

**Machine Mode (no render â€” Python reads raw):**
- `%%{...}%%` blocks parsed by SemanticBlockManager (already exists)
- Feeds into scoring engine, Postgres, knowledge graph

### The Ribbon Toggle

Single button in the left ribbon: ðŸ”¬ (microscope icon)
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
Any sentence or paragraph can have an annotation chain that drills DOWN through layers. Like David's Bible app where clicking ">" on a verse reveals commentary, cross-references, and analysis underneath â€” and each of THOSE can expand further.

### Syntax

```markdown
Some claim about gravity and grace being structurally identical.%%{ref:"expand-001"}%%

%%[expand-001]
> **Law:** L01 (Grace â†” Gravity)
> **Axioms:** D9.1, BC2, A9.1, ISO-001
> **Direction:** Pâ†”S (bidirectional isomorphism)
> **Strength:** STRONG â€” four preservation criteria met
>
> > [!deeper]- Formal Proof (click to expand)
> > Theorem 1: Ï€: grace â†’ gravity preserves:
> > (i) Mathematical form: both inverse-square
> > (ii) Boundary behavior: max at dâ†’0, zero at dâ†’âˆž
> > (iii) Symmetry: both isotropic, time-independent
> > (iv) Conservation: both define potential wells
>
> > [!scripture]- Biblical Anchor
> > John 12:32 â€” "I, when I am lifted up, will draw all people to myself"
> > Romans 1:20 â€” "invisible qualities clearly seen from what has been made"
>
> > [!gap]- Known Gap
> > Modified inverse-square form G(d) = Gâ‚€/(1+(d/dâ‚€)Â²) not derived 
> > from Ï‡-field Lagrangian. Needs formal treatment in FT-018.
%%]
```

### Render Behavior
- The `%%{ref:"expand-001"}%%` is invisible in reading view
- In Physicist Mode: a tiny "â–¶" icon appears at end of sentence
- Click â–¶ â†’ the `%%[expand-001]...%%]` block renders below as a styled panel
- Inside that panel, nested callouts work normally (deeper, scripture, gap all collapse independently)
- Click â–¶ again â†’ everything rolls back up
- The sentence above doesn't move â€” content inserts BELOW

### Nesting Depth
- Level 0: The sentence (always visible)
- Level 1: The annotation panel (click â–¶ to reveal)
- Level 2: Nested callouts inside the panel (click individually)
- Level 3: Further nesting if needed (Obsidian supports 3+ levels)
- No limit enforced but recommend max 3 levels for readability

---

## FEATURE 4: MATH TRANSLATION LAYER (The Missing Piece)

### What It Does
Bridges the equation and the English by showing WHICH WORDS map to WHICH SYMBOLS. The equation sits on top. Below it, each symbol gets its English translation aligned directly underneath. Then the plain English statement uses those SAME English words in a coherent sentence.

### Example: Evidence Completeness Factor

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  E_final  =  PS  Ã—  (0.5 + 0.5Â·ED)  Ã—  (0.5 + 0.5Â·EC)    â”‚  â† EQUATION
â”‚  â”€â”€â”€â”€â”€â”€â”€     â”€â”€     â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€      â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€      â”‚
â”‚  Evidence    What   Explanation          Experience          â”‚  â† TERM STACK
â”‚  Score       You    Depth                Coherence           â”‚
â”‚              Saw    Penalty              Penalty             â”‚
â”‚                                                             â”‚
â”‚  "Your evidence score is what you observed, penalized by    â”‚  â† PLAIN ENGLISH
â”‚   how well you can explain it AND how well it holds up      â”‚
â”‚   in lived reality. Can't explain it? Half credit max.      â”‚
â”‚   Never tested outside a lab? Penalized again."             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Syntax (in markdown)

```markdown
> [!math-stack]
> | E_final | = | PS | Ã— | (0.5 + 0.5Â·ED) | Ã— | (0.5 + 0.5Â·EC) |
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

## ARCHITECTURE

### Plugin Structure

```
theophysics-layers/
â”œâ”€â”€ main.ts                    # Plugin entry, registers views + commands
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ toggle.ts              # Ribbon button + mode state (reader/physicist)
â”‚   â”œâ”€â”€ parsers/
â”‚   â”‚   â”œâ”€â”€ json-annotation.ts # Parses %%{...}%% blocks
â”‚   â”‚   â”œâ”€â”€ expand-block.ts    # Parses %%[expand-ID]...%%] blocks
â”‚   â”‚   â””â”€â”€ math-stack.ts      # Parses [!math-stack] and [!math-interlinear]
â”‚   â”œâ”€â”€ renderers/
â”‚   â”‚   â”œâ”€â”€ badge-renderer.ts  # Renders law/axiom/direction badges inline
â”‚   â”‚   â”œâ”€â”€ expand-renderer.ts # Renders expandable panels below paragraphs
â”‚   â”‚   â”œâ”€â”€ math-renderer.ts   # Renders interlinear equation display
â”‚   â”‚   â””â”€â”€ animation.ts       # Shared expand/collapse animation
â”‚   â”œâ”€â”€ css/
â”‚   â”‚   â”œâ”€â”€ badges.css         # Inline badge styles (reuse axiom-inline-callouts.css)
â”‚   â”‚   â”œâ”€â”€ expand.css         # Expandable panel styles
â”‚   â”‚   â””â”€â”€ math-stack.css     # Math interlinear grid styles
â”‚   â””â”€â”€ types.ts               # Shared types (Annotation, MathTerm, ExpandBlock)
â”œâ”€â”€ manifest.json
â”œâ”€â”€ package.json
â””â”€â”€ styles.css                 # Main stylesheet (imports from src/css/)
```

### Dependencies
- Obsidian API (MarkdownPostProcessor, Plugin, Setting)
- No external dependencies â€” pure TypeScript + CSS
- MathJax (already bundled with Obsidian for LaTeX rendering)

### Data Flow

```
Author writes paper
    â†“
OpenAI pipeline injects %%{...}%% JSON after each paragraph
    â†“
Plugin parses in Reading View:
    â”œâ”€â”€ Reader Mode: %%{...}%% invisible, callouts collapsed â†’ clean prose
    â”œâ”€â”€ Physicist Mode: %%{...}%% â†’ colored badges â†’ click â†’ expand panel
    â””â”€â”€ Machine Mode: Python reads raw %% blocks â†’ Postgres/scoring engine
    â†“
Math equations rendered with interlinear stack
    â†“
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

1. **Ribbon toggle** (reader/physicist mode switch) â€” 2 hours
2. **%%{...}%% badge renderer** (parse JSON, render badges) â€” 4 hours  
3. **Expand/collapse animation** (click badge â†’ panel opens) â€” 3 hours
4. **Math interlinear renderer** ([!math-stack] callout) â€” 4 hours
5. **%%[expand-ID]%% deep drill** (per-sentence expandable) â€” 4 hours
6. **Settings panel** â€” 2 hours
7. **Polish + testing** â€” 3 hours

**Total estimate: ~22 hours of focused build time**

---

## EXAMPLE: FULL PAPER WITH ALL FEATURES

```markdown
---
title: "FT-001: The Truth Measurement Method"
---

> [!math-stack]
> | E_final | = | PS | Ã— | CF |
> | Evidence Score | | Phenomenon Strength | | Completeness Factor |
> ---
> Your evidence score is what you observed times how complete your explanation is.

God designed a universe where you cannot exist without experiencing grace.
%%{"law":["L01"],"axioms":["D9.1","BC2"],"direction":"Pâ†”S","note":"ISO-001 fully activated"}%%

Every step you take, gravity holds you to the earth.%%{ref:"expand-grav-001"}%%

%%[expand-grav-001]
> **ISO-001:** Grace â†” Gravity â€” five structural properties preserved
> > [!deeper]- The Five Properties
> > 1. Universal â€” acts on all mass / all souls
> > 2. Unshieldable â€” no barrier blocks it
> > 3. Distance-dependent â€” weakens, never zero
> > 4. Always attractive â€” never repulsive  
> > 5. Conservative â€” defines potential well
>
> > [!scripture]- John 12:32
> > "I, when I am lifted up from the earth, will draw all people to myself."
%%]

That is grace. Grace is the spiritual gravity of God.
%%{"law":["L01","L10"],"axioms":["D9.1","BC2","ISO-001"],"direction":"Sâ†’P","note":"STRONG. Both sides stated."}%%
```

**Reader sees:** Clean prose. Three paragraphs. One equation box at top.

**Physicist sees:** Clean prose + tiny colored badges after each paragraph + equation with term stack. Click any badge â†’ full annotation unfolds. Click the "â–¶" after "gravity holds you" â†’ five properties, scripture anchor, and gap analysis appear. Click again â†’ gone.


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
- - Keyboard shortcut: Ctrl+Shift+M (Math translation)
  - - Can be ON while Reader mode is ON (they're independent)
    - - Settings: Default ON or OFF per user preference
     
      - ### Render Rules
      - 1. Word row sits DIRECTLY ABOVE the equation row, same grid columns
        2. 2. Words are muted color, smaller font, centered under their symbol
           3. 3. Subtle vertical hairlines connect each word to its symbol below
              4. 4. Word row has very light background shading (barely there, just enough to distinguish)
                 5. 5. Thin border around the entire math block when translation is active
                    6. 6. Animation: words fade in/out on toggle (100ms)
                      
                       7. ### Why This Matters
                       8. A physicist reads chi = integral(G*M*E*S*T*K*R*Q*F*C) and thinks "ten-variable coherence integral."
                       9. A non-physicist reads the SAME equation and sees: "Coherence equals Grace times Mind times Entropy..." and gets the conceptual architecture without needing the math. Same page. Same document. No dumbing down. Just a layer that reveals what the symbols mean in human words.
                      
                       10. ### Markdown Syntax
                       11. Uses the same `[!math-stack]` callout from Feature 4. The plugin reads the term grid and renders it as the word-above-symbol overlay when the toggle is ON.
                      
                       12. ```markdown
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

                           *Updated: March 23, 2026 -- Added Feature 5 (Math Translation Toggle)*
                           
**Machine sees:** Raw `%%{...}%%` JSON blocks for every paragraph. Feeds scoring engine.

---

*Theophysics Layers Plugin v1.0 Spec*
*David Lowe Â· POF 2828 Â· March 23, 2026*
*Send to: Codex or Claude Code for build*
