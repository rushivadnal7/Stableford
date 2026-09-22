import { CharityCard } from '@/components/charities/charity-card';
import { ButtonLink } from '@/components/ui/button';
import { RichTitle, SectionHeader } from '@/components/ui/heading';
import { Grid } from '@/components/ui/layout';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { CHARITIES } from '@/content/home';
import { ANCHORS, ROUTES } from '@/lib/routes';
import type { HomeCharity } from '@/modules/home/data';

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
        {charities.map((charity, i) => (
          <Reveal as="li" key={charity.id} delay={(i % 3) * 90} className="h-full">
            <CharityCard charity={charity} />
          </Reveal>
        ))}
      </Grid>

      <Reveal className="mt-block flex justify-center">
        <ButtonLink href={ROUTES.charities} variant="secondary" size="lg" arrow>
          {CHARITIES.browse}
        </ButtonLink>
      </Reveal>
    </Section>
  );
}
