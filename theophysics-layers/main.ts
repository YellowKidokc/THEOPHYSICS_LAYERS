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

import { Plugin, MarkdownPostProcessorContext, PluginSettingTab, App, Setting } from "obsidian";

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
      // TODO: Re-render all active markdown views
      // TODO: Update ribbon icon state (active/inactive)
      console.log(`Theophysics Layers: ${this.physicistMode ? "PHYSICIST" : "READER"} mode`);
    });

    // KEYBOARD SHORTCUT — Ctrl+Shift+L
    this.addCommand({
      id: "toggle-layers",
      name: "Toggle Reader/Physicist Mode",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "l" }],
      callback: () => {
        this.physicistMode = !this.physicistMode;
        // TODO: Re-render
      },
    });

    // MARKDOWN POST-PROCESSORS
    // These run on every markdown block in Reading View

    // 1. Parse %%{...}%% inline JSON annotations
    this.registerMarkdownPostProcessor((el, ctx) => {
      if (!this.physicistMode || !this.settings.parseInlineJson) return;
      // TODO: Implement — see README.md Feature 2
      // - Find text nodes containing %%{...}%%
      // - Parse JSON
      // - Replace with colored badge elements
      // - Add click handler → expand/collapse panel below
    });

    // 2. Parse %%[expand-ID]...%%] deep drill blocks
    this.registerMarkdownPostProcessor((el, ctx) => {
      if (!this.physicistMode || !this.settings.parseExpandBlocks) return;
      // TODO: Implement — see README.md Feature 3
      // - Find %%{ref:"expand-ID"}%% markers
      // - Find matching %%[expand-ID]...%%] blocks
      // - Render ▶ icon at marker position
      // - Click ▶ → render expand block content as styled panel
    });

    // 3. Render [!math-stack] and [!math-interlinear] callouts
    this.registerMarkdownPostProcessor((el, ctx) => {
      // TODO: Implement — see README.md Features 1 & 4
      // - Find callout elements with data-callout="math-stack" or "math-interlinear"
      // - Parse the term grid (| symbol | = | translation |)
      // - Render as CSS grid with aligned columns
      // - Add collapse toggle if settings.showMathInterlinear === "equation-only"
    });

    // SETTINGS TAB
    this.addSettingTab(new LayersSettingTab(this.app, this));
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
