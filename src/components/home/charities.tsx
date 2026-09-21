import { GraduationCap, Heart, HeartPulse, Leaf, Smile, Users, type LucideIcon } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { RichTitle, SectionHeader } from '@/components/ui/heading';
import { Grid } from '@/components/ui/layout';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { Badge, Card } from '@/components/ui/surface';
import { CHARITIES } from '@/content/home';
import { ANCHORS, ROUTES } from '@/lib/routes';
import type { HomeCharity } from '@/modules/home/data';

/** A tint and icon per category, so cards without a photo still look considered. */
const ART: Record<string, { icon: LucideIcon; tint: string }> = {
  education: { icon: GraduationCap, tint: 'bg-accent/25' },
  environment: { icon: Leaf, tint: 'bg-accent/25' },
  health: { icon: HeartPulse, tint: 'bg-warm/25' },
  community: { icon: Users, tint: 'bg-accent/40' },
  youth: { icon: Smile, tint: 'bg-warm/25' },
};
const DEFAULT_ART = { icon: Heart, tint: 'bg-canvas-alt' };

export function Charities({ charities }: { charities: HomeCharity[] }) {
  return (
    <Section
      id={ANCHORS.charities.slice(1)}
      header={
        <Reveal>
          <SectionHeader eyebrow={CHARITIES.eyebrow} title={<RichTitle {...CHARITIES.title} />} lead={CHARITIES.lead} />
        </Reveal>
      }
    >
      <Grid as="ul" cols={3}>
        {charities.map((charity, i) => {
          const { icon: Icon, tint } = ART[charity.category] ?? DEFAULT_ART;
          return (
            <Reveal as="li" key={charity.id} delay={(i % 3) * 90} className="h-full">
              <Card interactive className="flex h-full flex-col gap-5 p-4">
                <div className={`relative grid h-36 place-items-center rounded-lg ${tint}`}>
                  <Icon className="size-10 text-action" aria-hidden />
                  {charity.is_featured && (
                    <Badge variant="accent" className="absolute top-3 left-3 bg-canvas">
                      Featured
                    </Badge>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-3 px-2 pb-2">
                  <Badge className="self-start capitalize">{charity.category}</Badge>
                  <h3 className="type-h3 text-fg">{charity.name}</h3>
                  <p className="type-body text-fg-muted">{charity.summary}</p>
                </div>
              </Card>
            </Reveal>
          );
        })}
      </Grid>

      <Reveal className="mt-block flex justify-center">
        <ButtonLink href={ROUTES.charities} variant="secondary" size="lg" arrow>
          {CHARITIES.browse}
        </ButtonLink>
      </Reveal>
    </Section>
  );
}
