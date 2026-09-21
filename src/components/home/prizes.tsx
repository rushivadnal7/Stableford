import { Ball } from '@/components/ui/ball';
import { RichTitle, SectionHeader } from '@/components/ui/heading';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { Badge, Card } from '@/components/ui/surface';
import { matchesOf, PRIZES, SAMPLE } from '@/content/home';
import { ANCHORS } from '@/lib/routes';

export function Prizes() {
  const hits = matchesOf(SAMPLE.scores, SAMPLE.drawn);

  return (
    <Section id={ANCHORS.prizes.slice(1)} tone="dark">
      <Reveal>
        <SectionHeader eyebrow={PRIZES.eyebrow} title={<RichTitle {...PRIZES.title} />} lead={PRIZES.lead} />
      </Reveal>

      <div className="mt-14 grid items-start gap-6 lg:grid-cols-12">
        <ul className="flex flex-col gap-4 lg:col-span-7">
          {PRIZES.tiers.map((tier, i) => (
            <Reveal as="li" key={tier.tier} delay={i * 90}>
              <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                <p className="type-stat w-40 shrink-0 text-fg">
                  {tier.share}
                  <span className="text-fg-muted">%</span>
                </p>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="accent">{tier.label}</Badge>
                    <h3 className="type-h4 text-fg">{tier.name}</h3>
                  </div>
                  <p className="type-small mt-2 text-fg-muted">{tier.note}</p>
                </div>
                <span aria-hidden="true" className="hidden gap-1.5 sm:flex">
                  {Array.from({ length: tier.tier }, (_, dot) => (
                    <span key={dot} className="size-2.5 rounded-pill bg-accent" />
                  ))}
                </span>
              </Card>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={180} className="lg:col-span-5">
          <Card variant="flat" className="flex flex-col gap-6 border-line bg-surface">
            <h3 className="type-h3 text-fg">{PRIZES.exampleTitle}</h3>

            <div>
              <p className="type-small mb-3 text-fg-muted">{PRIZES.exampleYours}</p>
              <ol className="flex flex-wrap gap-2">
                {SAMPLE.scores.map((n) => (
                  <li key={n}>
                    <Ball n={n} tone={hits.includes(n) ? 'accent' : 'outline'} />
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <p className="type-small mb-3 text-fg-muted">{PRIZES.exampleDrawn}</p>
              <ol className="flex flex-wrap gap-2">
                {SAMPLE.drawn.map((n) => (
                  <li key={n}>
                    <Ball n={n} tone={hits.includes(n) ? 'accent' : 'outline'} />
                  </li>
                ))}
              </ol>
            </div>

            <p className="type-body border-t border-line pt-5 text-fg">
              <strong className="font-semibold text-accent-text">{hits.length} numbers</strong> are in both, so this entry wins a share of the{' '}
              {hits.length === 3 ? 'three' : hits.length === 4 ? 'four' : 'five'}-number prize.
            </p>
          </Card>
        </Reveal>
      </div>
    </Section>
  );
}
