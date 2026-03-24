import {
  App,
  MarkdownPostProcessorContext,
  MarkdownRenderer,
  MarkdownRenderChild,
  MarkdownView,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
} from "obsidian";

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

const INLINE_JSON_REGEX = /%%\{([\s\S]*?)\}%%/g;
const REF_REGEX = /%%\{\s*ref\s*:\s*"([^"]+)"\s*\}%%/;
const EXPAND_BLOCK_REGEX = /%%\[([^\]]+)\]\n?([\s\S]*?)%%\]/g;

export default class TheophysicsLayersPlugin extends Plugin {
  settings!: LayersSettings;
  physicistMode = false;
  private ribbonIconEl?: HTMLElement;

  async onload() {
    await this.loadSettings();
    this.physicistMode = this.settings.defaultMode === "physicist";

    this.ribbonIconEl = this.addRibbonIcon("microscope", "Toggle Layers (Reader/Physicist)", async () => {
      await this.toggleMode();
    });

    this.addCommand({
      id: "toggle-layers",
      name: "Toggle Reader/Physicist Mode",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "l" }],
      callback: async () => {
        await this.toggleMode();
      },
    });

    this.registerMarkdownPostProcessor(async (el, ctx) => {
      await this.processMathCallouts(el, ctx);

      if (!this.settings.parseInlineJson && !this.settings.parseExpandBlocks) {
        return;
      }

      const sectionInfo = ctx.getSectionInfo(el);
      if (!sectionInfo) {
        return;
      }

      const normalizedText = normalizeCalloutSection(sectionInfo.text);

      if (this.settings.parseInlineJson) {
        this.processInlineAnnotationSection(el, normalizedText);
      }

      if (this.settings.parseExpandBlocks) {
        await this.processExpandReferences(el, ctx, normalizedText);
      }
    });

    this.addSettingTab(new LayersSettingTab(this.app, this));
    this.applyModeState();
  }

  onunload() {
    document.body.removeClass("theophysics-reader-mode", "theophysics-physicist-mode");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.applyModeState();
  }

  private async toggleMode() {
    this.physicistMode = !this.physicistMode;
    this.applyModeState();
    await this.saveData({ ...this.settings, defaultMode: this.physicistMode ? "physicist" : "reader" });
    this.rerenderMarkdownViews();
  }

  private applyModeState() {
    document.body.toggleClass("theophysics-reader-mode", !this.physicistMode);
    document.body.toggleClass("theophysics-physicist-mode", this.physicistMode);
    document.body.style.setProperty("--theo-expand-ms", `${this.settings.expandAnimationMs}ms`);
    document.body.setAttribute("data-theo-badge-size", this.settings.badgeSize);
    this.ribbonIconEl?.toggleClass("is-active", this.physicistMode);
    this.ribbonIconEl?.setAttribute(
      "aria-label",
      `Toggle Layers (${this.physicistMode ? "Physicist" : "Reader"} mode active)`
    );
  }

  rerenderMarkdownViews() {
    this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
      const view = leaf.view;
      if (view instanceof MarkdownView) {
        view.previewMode.rerender(true);
      }
    });
  }

  private processInlineAnnotationSection(el: HTMLElement, sectionText: string) {
    const annotations = extractInlineAnnotations(sectionText).filter((annotation) => !annotation.ref);
    if (!annotations.length) {
      return;
    }

    const anchor = findAnnotationAnchor(el);
    if (!anchor) {
      return;
    }

    const inlineContainer = anchor.createSpan({ cls: "theo-inline-annotations" });
    const panel = createAnnotationPanel(anchor, this.settings.expandAnimationMs);

    annotations.forEach((annotation) => {
      annotation.law.forEach((law) => {
        inlineContainer.appendChild(
          this.createBadge(`Law ${law}`, law, "theo-badge-law", panel, () => {
            panel.innerHTML = "";
            renderAnnotationContent(panel, annotation);
          })
        );
      });

      annotation.axioms.forEach((axiom) => {
        inlineContainer.appendChild(
          this.createBadge(`Axiom ${axiom}`, axiom, "theo-badge-axiom", panel, () => {
            panel.innerHTML = "";
            renderAnnotationContent(panel, annotation);
          })
        );
      });

      if (annotation.direction) {
        inlineContainer.appendChild(
          this.createBadge(`Direction ${annotation.direction}`, annotation.direction, "theo-badge-direction", panel, () => {
            panel.innerHTML = "";
            renderAnnotationContent(panel, annotation);
          })
        );
      }
    });
  }

  private async processExpandReferences(el: HTMLElement, ctx: MarkdownPostProcessorContext, sectionText: string) {
    const match = REF_REGEX.exec(sectionText);
    if (!match) {
      return;
    }

    const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!(file instanceof TFile)) {
      return;
    }

    const source = await this.app.vault.cachedRead(file);
    const expandBlocks = extractExpandBlocks(source);
    const expandBlock = expandBlocks.get(match[1]);
    if (!expandBlock) {
      return;
    }

    const anchor = findAnnotationAnchor(el);
    if (!anchor) {
      return;
    }

    const trigger = anchor.createSpan({ cls: "theo-expand-trigger", text: "▶" });
    trigger.setAttribute("aria-label", `Expand annotation ${expandBlock.id}`);

    const panel = createAnnotationPanel(anchor, this.settings.expandAnimationMs, "theo-annotation-panel theo-annotation-panel-markdown");
    const child = new MarkdownRenderChild(panel);
    ctx.addChild(child);

    let rendered = false;
    trigger.addEventListener("click", async () => {
      if (!rendered) {
        panel.empty();
        await MarkdownRenderer.render(this.app, expandBlock.content.trim(), panel, ctx.sourcePath, child);
        rendered = true;
      }

      const nextState = !panel.hasClass("expanded");
      panel.toggleClass("expanded", nextState);
      trigger.toggleClass("expanded", nextState);
    });
  }

  private async processMathCallouts(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    const sectionInfo = ctx.getSectionInfo(el);
    if (!sectionInfo) {
      return;
    }

    const callouts = Array.from(el.querySelectorAll<HTMLElement>(".callout[data-callout='math-interlinear'], .callout[data-callout='math-stack']"));
    if (!callouts.length) {
      return;
    }

    const normalized = normalizeCalloutSection(sectionInfo.text);

    callouts.forEach((callout) => {
      const calloutType = callout.dataset.callout;
      if (calloutType === "math-interlinear") {
        const parsed = parseMathInterlinear(normalized);
        if (!parsed) {
          return;
        }
        callout.replaceWith(this.renderMathInterlinear(parsed.equation, parsed.terms, parsed.english));
        return;
      }

      if (calloutType === "math-stack") {
        const parsed = parseMathStack(normalized);
        if (!parsed) {
          return;
        }
        callout.replaceWith(this.renderMathStack(parsed.equationCells, parsed.termCells, parsed.english));
      }
    });
  }

  private renderMathInterlinear(equation: string, terms: MathTerm[], english: string) {
    const container = createDiv({ cls: "math-interlinear-container" });
    if (this.settings.showMathInterlinear === "equation-only") {
      container.addClass("compact");
      container.setAttribute("role", "button");
      container.setAttribute("tabindex", "0");
      container.setAttribute("aria-expanded", "false");

      const toggleExpanded = () => {
        const expanded = !container.hasClass("expanded");
        container.toggleClass("expanded", expanded);
        container.setAttribute("aria-expanded", String(expanded));
      };

      container.addEventListener("click", toggleExpanded);
      container.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleExpanded();
        }
      });
    }

    container.createDiv({ cls: "math-interlinear-equation", text: equation });

    const termsEl = container.createDiv({ cls: "math-interlinear-terms" });
    terms.forEach((term) => {
      const termEl = termsEl.createDiv({ cls: "math-interlinear-term" });
      termEl.setAttribute("title", term.meaning);
      termEl.createDiv({ cls: "math-interlinear-symbol", text: term.symbol });
      termEl.createDiv({ cls: "math-interlinear-meaning", text: term.meaning });
    });

    container.createDiv({ cls: "math-interlinear-english", text: english });
    return container;
  }

  private renderMathStack(equationCells: string[], termCells: string[], english: string) {
    const container = createDiv({ cls: "math-stack-container" });
    const grid = container.createDiv({ cls: "math-stack-grid" });

    const equationRow = grid.createDiv({ cls: "math-stack-row-equation" });
    equationCells.forEach((cell) => {
      equationRow.createDiv({ cls: "math-stack-cell", text: cell });
    });

    const termRow = grid.createDiv({ cls: "math-stack-row-terms" });
    termCells.forEach((cell) => {
      termRow.createDiv({ cls: "math-stack-cell", text: cell });
    });

    container.createEl("hr", { cls: "math-stack-divider" });
    container.createDiv({ cls: "math-stack-english", text: english });

    return container;
  }

  private createBadge(
    ariaLabel: string,
    text: string,
    cls: string,
    panel: HTMLElement,
    fillPanel: () => void
  ) {
    const badge = createSpan({ cls: `theo-badge ${cls}`, text });
    badge.setAttribute("aria-label", ariaLabel);
    badge.addEventListener("click", () => {
      fillPanel();
      const nextState = !panel.hasClass("expanded");
      panel.toggleClass("expanded", nextState);
      badge.toggleClass("expanded", nextState);
    });
    return badge;
  }
}

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
            this.plugin.physicistMode = value === "physicist";
            await this.plugin.saveSettings();
            this.plugin.rerenderMarkdownViews();
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
            this.plugin.rerenderMarkdownViews();
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
            this.plugin.rerenderMarkdownViews();
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

function extractInlineAnnotations(sectionText: string): InlineAnnotation[] {
  const annotations: InlineAnnotation[] = [];

  for (const match of sectionText.matchAll(INLINE_JSON_REGEX)) {
    const raw = match[1].trim();

    const refMatch = raw.match(/^ref\s*:\s*"([^"]+)"$/);
    if (refMatch) {
      annotations.push({ law: [], axioms: [], direction: "", note: "", ref: refMatch[1] });
      continue;
    }

    const jsonText = `{${raw}}`;

    try {
      const parsed = JSON.parse(jsonText) as Partial<InlineAnnotation>;
      annotations.push({
        law: Array.isArray(parsed.law) ? parsed.law.map(String) : [],
        axioms: Array.isArray(parsed.axioms) ? parsed.axioms.map(String) : [],
        direction: typeof parsed.direction === "string" ? parsed.direction : "",
        note: typeof parsed.note === "string" ? parsed.note : "",
        ref: typeof parsed.ref === "string" ? parsed.ref : undefined,
      });
    } catch {
      continue;
    }
  }

  return annotations;
}

function extractExpandBlocks(source: string) {
  const blocks = new Map<string, ExpandBlock>();

  for (const match of source.matchAll(EXPAND_BLOCK_REGEX)) {
    const id = match[1].trim();
    const content = match[2].trim();
    blocks.set(id, { id, content });
  }

  return blocks;
}

function createAnnotationPanel(anchor: HTMLElement, animationMs: number, cls = "theo-annotation-panel") {
  const panel = createDiv({ cls });
  panel.style.setProperty("--theo-expand-ms", `${animationMs}ms`);
  anchor.parentElement?.insertBefore(panel, anchor.nextSibling);
  return panel;
}

function renderAnnotationContent(panel: HTMLElement, annotation: InlineAnnotation) {
  const meta = panel.createDiv({ cls: "theo-annotation-meta" });

  if (annotation.law.length) {
    meta.createDiv({ text: `Law: ${annotation.law.join(", ")}` });
  }

  if (annotation.axioms.length) {
    meta.createDiv({ text: `Axioms: ${annotation.axioms.join(", ")}` });
  }

  if (annotation.direction) {
    meta.createDiv({ text: `Direction: ${annotation.direction}` });
  }

  if (annotation.note) {
    panel.createDiv({ cls: "theo-annotation-note", text: annotation.note });
  }
}

function findAnnotationAnchor(el: HTMLElement) {
  return el.querySelector<HTMLElement>("p, li, blockquote, .callout-content") ?? el;
}

function normalizeCalloutSection(sectionText: string) {
  return sectionText
    .split("\n")
    .map((line) => line.replace(/^\s*>\s?/, ""))
    .join("\n");
}

function parseMathInterlinear(sectionText: string) {
  const equation = extractFencedBlock(sectionText, "equation");
  const termsBlock = extractFencedBlock(sectionText, "terms");
  const english = extractFencedBlock(sectionText, "english");

  if (!equation || !termsBlock || !english) {
    return null;
  }

  const terms = termsBlock
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [symbol, meaning] = line.split("|").map((part) => part.trim());
      if (!symbol || !meaning) {
        return null;
      }
      return { symbol, meaning };
    })
    .filter((term): term is MathTerm => term !== null);

  if (!terms.length) {
    return null;
  }

  return { equation: equation.trim(), terms, english: english.replace(/\n+/g, " ").trim() };
}

function parseMathStack(sectionText: string) {
  const lines = sectionText.split("\n").map((line) => line.trim());
  const tableLines = lines.filter((line) => line.startsWith("|") && line.endsWith("|"));
  if (tableLines.length < 2) {
    return null;
  }

  const englishIndex = lines.findIndex((line) => line === "---");
  const english = englishIndex >= 0 ? lines.slice(englishIndex + 1).join(" ").trim() : "";
  if (!english) {
    return null;
  }

  return {
    equationCells: splitPipeRow(tableLines[0]),
    termCells: splitPipeRow(tableLines[1]),
    english,
  };
}

function splitPipeRow(row: string) {
  return row
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
}

function extractFencedBlock(source: string, fenceName: string) {
  const match = source.match(new RegExp("```" + fenceName + "\\n([\\s\\S]*?)\\n```"));
  return match?.[1] ?? null;
}
