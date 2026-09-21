import { RichTitle, SectionHeader } from '@/components/ui/heading';
import { Split } from '@/components/ui/layout';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { FEE_SPLIT } from '@/content/home';
import { ANCHORS } from '@/lib/routes';
import type { HomePlan } from '@/modules/home/data';
import { FeeSplitCard } from './fee-split-card';

export function FeeSplitSection({ plan }: { plan: HomePlan }) {
  return (
    <Section id={ANCHORS.split.slice(1)} tone="alt">
      <Split
        ratio="6-6"
        first={
          <Reveal>
            <SectionHeader eyebrow={FEE_SPLIT.eyebrow} title={<RichTitle {...FEE_SPLIT.title} />} lead={FEE_SPLIT.lead} />
          </Reveal>
        }
        second={
          <Reveal delay={120}>
            <FeeSplitCard priceCents={plan.price_cents} planName={plan.name} interval={plan.interval} />
          </Reveal>
        }
      />
    </Section>
  );
}
