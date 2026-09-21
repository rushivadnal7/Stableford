import { RichTitle, SectionHeader } from '@/components/ui/heading';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { FEE_SPLIT } from '@/content/home';
import { ANCHORS } from '@/lib/routes';
import type { HomePlan } from '@/modules/home/data';
import { FeeSplitCard } from './fee-split-card';

export function FeeSplitSection({ plan }: { plan: HomePlan }) {
  return (
    <Section id={ANCHORS.split.slice(1)} tone="alt">
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-6">
          <SectionHeader eyebrow={FEE_SPLIT.eyebrow} title={<RichTitle {...FEE_SPLIT.title} />} lead={FEE_SPLIT.lead} />
        </Reveal>
        <Reveal delay={120} className="lg:col-span-6">
          <FeeSplitCard priceCents={plan.price_cents} planName={plan.name} interval={plan.interval} />
        </Reveal>
      </div>
    </Section>
  );
}
