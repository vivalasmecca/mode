// Schema contract between agent JSON output and the preview UI.
// Must stay in sync with the output schema in agent/page-builder.js.

export type PaletteMode = "light" | "neutral" | "dark";

export interface CTAButtonSlot {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export interface ImageSlot {
  src: string;
  alt: string;
}

export interface NavLink {
  label: string;
  href: string;
  children?: NavLink[] | null;
}

export interface NavColumn {
  heading: string;
  links: Array<{ label: string; href: string }>;
}

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export interface Stat {
  value: string;
  label: string;
  source?: string | null;
}

export type ComponentSlots = Record<string, unknown>;

export interface PageBrief {
  audience: string;
  archetype: string;
  funnel_stage: string;
  goal: string;
  context_mode: string;
  content_notes?: string;
}

export interface IABeat {
  name: string;
  rationale: string;
}

export interface IASection {
  name: string;
  beat: string;
  rationale: string;
  candidate_components: string[];
}

export interface PageSection {
  section: string;
  beat?: string;
  component: string;
  variant: string | null;
  reasoning: string | null;
  slots: ComponentSlots;
  palette?: PaletteMode;
}

export interface BehavioralTokens {
  require_trust_signal: boolean;
  allow_secondary_cta: boolean;
  subhead_policy: "always" | "optional" | "never";
  copy_density: "low" | "medium" | "high";
  evidence_density: "low" | "medium" | "high";
}

export interface AccentVariant {
  bg: string;
  text: string;
}

export interface AccentTokens {
  on_light: AccentVariant;
  on_dark: AccentVariant;
}

export interface SitePage {
  label: string;
  filename: string;
  previewUrl: string;
  siteUrl: string;
}

export interface SiteManifest {
  schema_version: string;
  built_at: string;
  ts: string;
  preset: string;
  palette_driver: string;
  brief: Record<string, string>;
  pages: SitePage[];
}

export interface PageOutput {
  schema_version: string;
  generated_at: string;
  variant?: string;
  preset?: string;
  preset_description?: string;
  palette_driver?: string;
  brief: PageBrief;
  behavioral_tokens?: BehavioralTokens;
  accent_tokens?: AccentTokens;
  ia: { beats: IABeat[]; sections: IASection[] };
  page: PageSection[];
  preview_url: string;
}
