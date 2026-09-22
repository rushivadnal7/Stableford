import { GraduationCap, Heart, HeartPulse, Leaf, Smile, Users, type LucideIcon } from 'lucide-react';

/** A tint and icon per category, so a charity card without a photo still looks considered. */
export const CATEGORY_ART: Record<string, { icon: LucideIcon; tint: string }> = {
  education: { icon: GraduationCap, tint: 'bg-accent/25' },
  environment: { icon: Leaf, tint: 'bg-accent/25' },
  health: { icon: HeartPulse, tint: 'bg-warm/25' },
  community: { icon: Users, tint: 'bg-accent/40' },
  youth: { icon: Smile, tint: 'bg-warm/25' },
};

export const DEFAULT_CATEGORY_ART = { icon: Heart, tint: 'bg-canvas-alt' };
