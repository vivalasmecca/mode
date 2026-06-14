import type { ComponentSlots } from "@/lib/types";
import { NavigationHeader } from "./NavigationHeader";
import { HeroPrimary } from "./HeroPrimary";
import { SocialProofBar } from "./SocialProofBar";
import { FeatureGrid } from "./FeatureGrid";
import { TestimonialSingle } from "./TestimonialSingle";
import { PricingCard } from "./PricingCard";
import { CTABanner } from "./CTABanner";
import { FooterMinimal } from "./FooterMinimal";
import { StatBlock } from "./StatBlock";

export type ModuleComponent = React.ComponentType<{
  slots: ComponentSlots;
  variant: string | null;
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
};
