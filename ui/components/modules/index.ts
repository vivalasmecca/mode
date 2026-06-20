import type { ComponentSlots, PaletteMode } from "@/lib/types";
import { NavigationHeader } from "./NavigationHeader";
import { HeroPrimary } from "./HeroPrimary";
import { SocialProofBar } from "./SocialProofBar";
import { FeatureGrid } from "./FeatureGrid";
import { TestimonialSingle } from "./TestimonialSingle";
import { PricingCard } from "./PricingCard";
import { CTABanner } from "./CTABanner";
import { FooterMinimal } from "./FooterMinimal";
import { StatBlock } from "./StatBlock";
import { ContentSection } from "./ContentSection";
import { HeroStatement } from "./HeroStatement";

export type ModuleComponent = React.ComponentType<{
  slots: ComponentSlots;
  variant: string | null;
  palette?: PaletteMode;
  slotVisibility?: Record<string, boolean>;
  layout?: { align?: "left" | "center" };
}>;

export const MODULE_REGISTRY: Record<string, ModuleComponent> = {
  NavigationHeader,
  HeroPrimary,
  SocialProofBar,
  FeatureGrid,
  TestimonialSingle,
  PricingCard,
  CTABanner,
  FooterMinimal,
  StatBlock,
  ContentSection,
  HeroStatement,
};
