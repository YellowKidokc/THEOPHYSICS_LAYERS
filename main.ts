/**
 * THEOPHYSICS LAYERS PLUGIN
 * =========================
 * Three-audience document system for Obsidian.
 *
 * BUILD INSTRUCTIONS: See README.md for full specification.
 *
 * TWO TOGGLES:
 *   1. Ribbon button (🔬) = Reader mode ↔ Physicist mode (global)
 *   2. Per-annotation ▶ = expand/collapse individual annotations
 *
 * FOUR FEATURES:
 *   1. Math Interlinear — equation + term stack + plain English
 *   2. Expandable Annotations — %%{...}%% JSON → colored badges → expand panel
 *   3. Bible App Deep Drill — %%[expand-ID]...%%] → nested expandable sections
 *   4. Math Translation Layer — [!math-stack] callout with aligned term grid
 *
 * DATA FORMAT:
 *   - %%{"law":["L01"],"axioms":["D9.1"],"direction":"P↔S","note":"..."}%%
 *   - %%{ref:"expand-001"}%%  →  %%[expand-001] ... %%]
 *   - > [!math-stack] with | symbol | = | translation | grid
 */

import { Plugin, PluginSettingTab, App, Setting, MarkdownView, MarkdownPostProcessorContext } from "obsidian";

// ============================================================
// TYPES
// ============================================================

interface InlineAnnotation {
  law: string[];
  axioms: string[];
  direction: string;
  note: string;
  ref?: string;
}

interface ExpandBlock {
  id: string;
  content: string;
}

interface MathTerm {
  symbol: string;
  meaning: string;
}

interface LayersSettings {
  defaultMode: "reader" | "physicist";
  showMathInterlinear: "expanded" | "equation-only";
  badgeSize: "small" | "medium" | "hidden";
  expandAnimationMs: number;
  parseInlineJson: boolean;
  parseExpandBlocks: boolean;
}

const DEFAULT_SETTINGS: LayersSettings = {
  defaultMode: "reader",
  showMathInterlinear: "expanded",
  badgeSize: "small",
  expandAnimationMs: 150,
  parseInlineJson: true,
  parseExpandBlocks: true,
};

// ============================================================
// PARSING HELPERS
// ============================================================

/** Extract raw markdown source for a section from ctx. */
function getSectionSource(el: HTMLElement, ctx: MarkdownPostProcessorContext): string | null {
  const info = ctx.getSectionInfo(el);
  if (!info) return null;
  const lines = info.text.split("\n");
  return lines.slice(info.lineStart, info.lineEnd + 1).join("\n");
}

/** Parse %%{...}%% JSON annotations from raw markdown source. */
function parseInlineAnnotations(source: string): InlineAnnotation[] {
  const results: InlineAnnotation[] = [];
  const regex = /%%\{(.+?)\}%%/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    try {
      const raw = match[1];
      // Handle both strict JSON and relaxed (unquoted keys) formats
      const jsonStr = "{" + raw.replace(/(\w+)\s*:/g, '"$1":').replace(/'/g, '"') + "}";
      const parsed = JSON.parse(jsonStr);
      results.push({
        law: parsed.law || [],
        axioms: parsed.axioms || [],
        direction: parsed.direction || "",
        note: parsed.note || "",
        ref: parsed.ref || undefined,
      });
    } catch {
      // If relaxed parse fails, try direct parse
      try {
        const parsed = JSON.parse("{" + match[1] + "}");
        results.push({
          law: parsed.law || [],
          axioms: parsed.axioms || [],
          direction: parsed.direction || "",
          note: parsed.note || "",
          ref: parsed.ref || undefined,
        });
      } catch {
        // Skip malformed annotations
      }
    }
  }
  return results;
}

/** Parse %%[expand-ID]...%%] blocks from the full document source. */
function parseExpandBlocks(fullSource: string): Map<string, string> {
  const blocks = new Map<string, string>();
  const regex = /%%\[([^\]]+)\]\s*\n([\s\S]*?)%%\]/g;
  let match;
  while ((match = regex.exec(fullSource)) !== null) {
    blocks.set(match[1], match[2].trim());
  }
  return blocks;
}

/** Parse a | col1 | col2 | col3 | pipe-delimited row into cells. */
function parsePipeRow(line: string): string[] {
  return line
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

// ============================================================
// MAIN PLUGIN
// ============================================================

export default class TheophysicsLayersPlugin extends Plugin {
  settings: LayersSettings;
  physicistMode: boolean = false;

  async onload() {
    await this.loadSettings();
    this.physicistMode = this.settings.defaultMode === "physicist";

    // RIBBON TOGGLE — 🔬 Microscope icon
    this.addRibbonIcon("microscope", "Toggle Layers (Reader/Physicist)", () => {
      this.physicistMode = !this.physicistMode;
      this.rerenderAllMarkdownViews();
      console.log(`Theophysics Layers: ${this.physicistMode ? "PHYSICIST" : "READER"} mode`);
    });

    // KEYBOARD SHORTCUT — Mod+Shift+L
    this.addCommand({
      id: "toggle-layers",
      name: "Toggle Reader/Physicist Mode",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "l" }],
      callback: () => {
        this.physicistMode = !this.physicistMode;
        this.rerenderAllMarkdownViews();
      },
    });

    // MARKDOWN POST-PROCESSORS
    // These run on every markdown block in Reading View

    // 1. Parse %%{...}%% inline JSON annotations
    this.registerMarkdownPostProcessor((el, ctx) => {
      if (!this.physicistMode || !this.settings.parseInlineJson) return;
      this.processInlineAnnotations(el, ctx);
    });

    // 2. Parse %%[expand-ID]...%%] deep drill blocks
    this.registerMarkdownPostProcessor((el, ctx) => {
      if (!this.physicistMode || !this.settings.parseExpandBlocks) return;
      this.processExpandBlocks(el, ctx);
    });

    // 3. Render [!math-stack] and [!math-interlinear] callouts
    this.registerMarkdownPostProcessor((el, ctx) => {
      this.processMathCallouts(el, ctx);
    });

    // SETTINGS TAB
    this.addSettingTab(new LayersSettingTab(this.app, this));
  }

  // ============================================================
  // FEATURE 2: Inline JSON Annotations → Colored Badges
  // ============================================================

  private processInlineAnnotations(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    const source = getSectionSource(el, ctx);
    if (!source) return;

    const annotations = parseInlineAnnotations(source);
    if (annotations.length === 0) return;

    // Find the last paragraph or block element to append badges to
    const target = el.querySelector("p:last-of-type") || el.lastElementChild;
    if (!target) return;

    for (const annotation of annotations) {
      // Skip ref-only annotations (handled by expand block processor)
      if (annotation.ref && !annotation.law.length && !annotation.axioms.length) continue;

      const badgeContainer = document.createElement("span");
      badgeContainer.className = "theo-badge-group";

      // Create law badges (blue)
      for (const law of annotation.law) {
        if (this.settings.badgeSize === "hidden") continue;
        const badge = document.createElement("span");
        badge.className = `theo-badge theo-badge-law ${this.settings.badgeSize === "medium" ? "theo-badge-medium" : ""}`;
        badge.textContent = law;
        badge.addEventListener("click", () => this.toggleAnnotationPanel(badge, annotation));
        badgeContainer.appendChild(badge);
      }

      // Create axiom badges (gold)
      for (const axiom of annotation.axioms) {
        if (this.settings.badgeSize === "hidden") continue;
        const badge = document.createElement("span");
        badge.className = `theo-badge theo-badge-axiom ${this.settings.badgeSize === "medium" ? "theo-badge-medium" : ""}`;
        badge.textContent = axiom;
        badge.addEventListener("click", () => this.toggleAnnotationPanel(badge, annotation));
        badgeContainer.appendChild(badge);
      }

      // Create direction badge (gray)
      if (annotation.direction && this.settings.badgeSize !== "hidden") {
        const badge = document.createElement("span");
        badge.className = `theo-badge theo-badge-direction ${this.settings.badgeSize === "medium" ? "theo-badge-medium" : ""}`;
        badge.textContent = annotation.direction;
        badge.addEventListener("click", () => this.toggleAnnotationPanel(badge, annotation));
        badgeContainer.appendChild(badge);
      }

      target.appendChild(badgeContainer);
    }
  }

  /** Toggle the annotation detail panel below a badge. */
  private toggleAnnotationPanel(badge: HTMLElement, annotation: InlineAnnotation) {
    // Check if panel already exists as next sibling of the badge group's parent
    const parent = badge.closest("p") || badge.parentElement?.parentElement;
    if (!parent) return;

    let panel = parent.nextElementSibling;
    if (panel && panel.classList.contains("theo-annotation-panel")) {
      // Toggle existing panel
      panel.classList.toggle("expanded");
      return;
    }

    // Create new panel
    panel = document.createElement("div");
    panel.className = "theo-annotation-panel";
    panel.style.setProperty("--theo-expand-ms", `${this.settings.expandAnimationMs}ms`);

    const content: string[] = [];
    if (annotation.law.length) content.push(`<strong>Laws:</strong> ${annotation.law.join(", ")}`);
    if (annotation.axioms.length) content.push(`<strong>Axioms:</strong> ${annotation.axioms.join(", ")}`);
    if (annotation.direction) content.push(`<strong>Direction:</strong> ${annotation.direction}`);
    if (annotation.note) content.push(`<strong>Note:</strong> ${annotation.note}`);
    panel.innerHTML = content.join("<br>");

    parent.insertAdjacentElement("afterend", panel);

    // Trigger expand on next frame for animation
    requestAnimationFrame(() => panel!.classList.add("expanded"));
  }

  // ============================================================
  // FEATURE 3: Deep Drill Expand Blocks (%%[expand-ID]...%%])
  // ============================================================

  private processExpandBlocks(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    const source = getSectionSource(el, ctx);
    if (!source) return;

    // Look for %%{ref:"expand-ID"}%% markers in this section's source
    const refRegex = /%%\{[^}]*ref\s*:\s*"([^"]+)"[^}]*\}%%/g;
    let match;
    const refs: string[] = [];
    while ((match = refRegex.exec(source)) !== null) {
      refs.push(match[1]);
    }
    if (refs.length === 0) return;

    // Get the full document source to find the expand block content
    const info = ctx.getSectionInfo(el);
    if (!info) return;
    const expandBlocks = parseExpandBlocks(info.text);

    // Find the last element in this section to attach the trigger
    const target = el.querySelector("p:last-of-type") || el.lastElementChild;
    if (!target) return;

    for (const refId of refs) {
      const blockContent = expandBlocks.get(refId);
      if (!blockContent) continue;

      // Create ▶ trigger icon
      const trigger = document.createElement("span");
      trigger.className = "theo-expand-trigger";
      trigger.textContent = "▶";
      trigger.setAttribute("aria-label", "Expand annotation");

      trigger.addEventListener("click", () => {
        trigger.classList.toggle("expanded");

        let panel = trigger.closest("p")?.nextElementSibling;
        if (panel && panel.classList.contains("theo-annotation-panel") &&
            panel.getAttribute("data-expand-id") === refId) {
          panel.classList.toggle("expanded");
          return;
        }

        // Create the expand panel
        panel = document.createElement("div");
        panel.className = "theo-annotation-panel";
        panel.setAttribute("data-expand-id", refId);
        panel.style.setProperty("--theo-expand-ms", `${this.settings.expandAnimationMs}ms`);

        // Render the block content — convert > quoted lines to clean HTML
        const rendered = this.renderExpandContent(blockContent);
        panel.innerHTML = rendered;

        const insertAfter = trigger.closest("p") || target;
        insertAfter.insertAdjacentElement("afterend", panel);
        requestAnimationFrame(() => panel!.classList.add("expanded"));
      });

      target.appendChild(trigger);
    }
  }

  /** Convert expand block content (blockquoted markdown) to simple HTML. */
  private renderExpandContent(content: string): string {
    const lines = content.split("\n");
    const htmlParts: string[] = [];

    for (const line of lines) {
      // Strip leading > markers
      let cleaned = line.replace(/^>\s?/, "").replace(/^>\s?/, "");
      if (!cleaned.trim()) {
        htmlParts.push("<br>");
        continue;
      }
      // Bold markers
      cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      // Italic markers
      cleaned = cleaned.replace(/\*(.+?)\*/g, "<em>$1</em>");
      // Inline code
      cleaned = cleaned.replace(/`(.+?)`/g, "<code>$1</code>");
      htmlParts.push(cleaned);
    }

    return htmlParts.join("<br>");
  }

  // ============================================================
  // FEATURES 1 & 4: Math Interlinear & Math Stack Callouts
  // ============================================================

  private processMathCallouts(el: HTMLElement, _ctx: MarkdownPostProcessorContext) {
    // Find callout elements rendered by Obsidian
    const callouts = el.querySelectorAll<HTMLElement>(
      '.callout[data-callout="math-interlinear"], .callout[data-callout="math-stack"]'
    );

    for (const callout of Array.from(callouts)) {
      const calloutType = callout.getAttribute("data-callout");
      const contentEl = callout.querySelector(".callout-content");
      if (!contentEl) continue;

      if (calloutType === "math-interlinear") {
        this.renderMathInterlinear(callout, contentEl as HTMLElement);
      } else if (calloutType === "math-stack") {
        this.renderMathStack(callout, contentEl as HTMLElement);
      }
    }
  }

  /**
   * Render [!math-interlinear] callout.
   * Expected content: ```equation```, ```terms```, ```english``` code blocks.
   */
  private renderMathInterlinear(callout: HTMLElement, contentEl: HTMLElement) {
    const codeBlocks = contentEl.querySelectorAll("pre > code");
    let equation = "";
    const terms: MathTerm[] = [];
    let english = "";

    for (const block of Array.from(codeBlocks)) {
      const pre = block.parentElement;
      if (!pre) continue;
      const text = block.textContent || "";

      // Determine block type from the class or preceding context
      const lang = block.className.match(/language-(\w+)/)?.[1] || "";

      if (lang === "equation") {
        equation = text.trim();
      } else if (lang === "terms") {
        for (const line of text.trim().split("\n")) {
          const parts = line.split("|").map((s) => s.trim());
          if (parts.length >= 2) {
            terms.push({ symbol: parts[0], meaning: parts[1] });
          }
        }
      } else if (lang === "english") {
        english = text.trim();
      }
    }

    if (!equation && terms.length === 0) return;

    // Build the interlinear container
    const container = document.createElement("div");
    container.className = "math-interlinear-container";

    if (this.settings.showMathInterlinear === "equation-only") {
      container.classList.add("compact");
      container.addEventListener("click", () => container.classList.toggle("expanded"));
    }

    // Equation row
    if (equation) {
      const eqEl = document.createElement("div");
      eqEl.className = "math-interlinear-equation";
      eqEl.textContent = equation;
      container.appendChild(eqEl);
    }

    // Terms grid
    if (terms.length > 0) {
      const termsEl = document.createElement("div");
      termsEl.className = "math-interlinear-terms";
      for (const term of terms) {
        const termEl = document.createElement("div");
        termEl.className = "math-interlinear-term";

        const symbolEl = document.createElement("span");
        symbolEl.className = "math-interlinear-symbol";
        symbolEl.textContent = term.symbol;
        symbolEl.setAttribute("title", term.meaning);

        const meaningEl = document.createElement("span");
        meaningEl.className = "math-interlinear-meaning";
        meaningEl.textContent = term.meaning;

        termEl.appendChild(symbolEl);
        termEl.appendChild(meaningEl);
        termsEl.appendChild(termEl);
      }
      container.appendChild(termsEl);
    }

    // English row
    if (english) {
      const engEl = document.createElement("div");
      engEl.className = "math-interlinear-english";
      engEl.textContent = english;
      container.appendChild(engEl);
    }

    // Replace the callout content
    callout.replaceWith(container);
  }

  /**
   * Render [!math-stack] callout.
   * Expected content: | sym | = | sym | pipe rows, ---, english paragraph.
   */
  private renderMathStack(callout: HTMLElement, contentEl: HTMLElement) {
    const rawText = contentEl.textContent || "";
    const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    if (lines.length < 2) return;

    // Parse: Row 1 = equation symbols, Row 2 = term labels, "---" divider, rest = english
    let equationCells: string[] = [];
    let termCells: string[] = [];
    let english = "";
    let dividerFound = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("|")) {
        if (equationCells.length === 0) {
          equationCells = parsePipeRow(line);
        } else if (termCells.length === 0) {
          termCells = parsePipeRow(line);
        }
      } else if (line === "---" || line === "—" || line.match(/^-{2,}$/)) {
        dividerFound = true;
      } else if (dividerFound || (equationCells.length > 0 && termCells.length > 0)) {
        english += (english ? " " : "") + line;
        dividerFound = true;
      }
    }

    if (equationCells.length === 0) return;

    // Build the math-stack container
    const container = document.createElement("div");
    container.className = "math-stack-container";

    const grid = document.createElement("div");
    grid.className = "math-stack-grid";

    // Equation row
    const eqRow = document.createElement("div");
    eqRow.className = "math-stack-row-equation";
    for (const cell of equationCells) {
      const cellEl = document.createElement("span");
      cellEl.className = "math-stack-cell";
      cellEl.textContent = cell;
      eqRow.appendChild(cellEl);
    }
    grid.appendChild(eqRow);

    // Terms row
    if (termCells.length > 0) {
      const termRow = document.createElement("div");
      termRow.className = "math-stack-row-terms";
      for (let i = 0; i < equationCells.length; i++) {
        const cellEl = document.createElement("span");
        cellEl.className = "math-stack-cell";
        cellEl.textContent = termCells[i] || "";
        termRow.appendChild(cellEl);
      }
      grid.appendChild(termRow);
    }

    container.appendChild(grid);

    // Divider
    if (english) {
      const divider = document.createElement("hr");
      divider.className = "math-stack-divider";
      container.appendChild(divider);

      const engEl = document.createElement("div");
      engEl.className = "math-stack-english";
      engEl.textContent = english;
      container.appendChild(engEl);
    }

    // Replace the callout content
    callout.replaceWith(container);
  }

  /** Force all open markdown views to re-render so mode change takes effect. */
  private rerenderAllMarkdownViews() {
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof MarkdownView) {
        leaf.view.previewMode.rerender(true);
      }
    });
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

// ============================================================
// SETTINGS TAB
// ============================================================

class LayersSettingTab extends PluginSettingTab {
  plugin: TheophysicsLayersPlugin;

  constructor(app: App, plugin: TheophysicsLayersPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Theophysics Layers" });

    new Setting(containerEl)
      .setName("Default mode")
      .setDesc("Reader = clean prose. Physicist = annotations visible.")
      .addDropdown((drop) =>
        drop
          .addOption("reader", "Reader")
          .addOption("physicist", "Physicist")
          .setValue(this.plugin.settings.defaultMode)
          .onChange(async (value: "reader" | "physicist") => {
            this.plugin.settings.defaultMode = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Math interlinear display")
      .setDesc("Show full term stack or equation only (click to expand)")
      .addDropdown((drop) =>
        drop
          .addOption("expanded", "Full (equation + terms + English)")
          .addOption("equation-only", "Equation only (click to expand)")
          .setValue(this.plugin.settings.showMathInterlinear)
          .onChange(async (value: "expanded" | "equation-only") => {
            this.plugin.settings.showMathInterlinear = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Badge size")
      .setDesc("Size of law/axiom badges in Physicist mode")
      .addDropdown((drop) =>
        drop
          .addOption("small", "Small")
          .addOption("medium", "Medium")
          .addOption("hidden", "Hidden")
          .setValue(this.plugin.settings.badgeSize)
          .onChange(async (value: "small" | "medium" | "hidden") => {
            this.plugin.settings.badgeSize = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Expand animation (ms)")
      .setDesc("Duration of expand/collapse animation")
      .addSlider((slider) =>
        slider
          .setLimits(0, 500, 50)
          .setValue(this.plugin.settings.expandAnimationMs)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.expandAnimationMs = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
