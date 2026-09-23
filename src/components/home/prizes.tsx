import { Ball } from '@/components/ui/ball';
import { RichTitle, SectionHeader } from '@/components/ui/heading';
import { Split, Stack } from '@/components/ui/layout';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { Badge, Card } from '@/components/ui/surface';
import { matchesOf, PRIZES, SAMPLE } from '@/content/home';
import { ANCHORS } from '@/lib/routes';

export function Prizes() {
  const hits = matchesOf(SAMPLE.scores, SAMPLE.drawn);

  return (
    <Section
      id={ANCHORS.prizes.slice(1)}
      tone="dark"
      header={
        <Reveal>
          <SectionHeader eyebrow={PRIZES.eyebrow} title={<RichTitle {...PRIZES.title} />} lead={PRIZES.lead} />
        </Reveal>
      }
    >
      <Split
        ratio="7-5"
        align="start"
        first={
          <Stack as="ul" gap="md">
            {PRIZES.tiers.map((tier, i) => (
              <Reveal as="li" key={tier.tier} delay={i * 90}>
                <Card className="group flex flex-col gap-4 transition-colors motion-slow hover:border-line-strong sm:flex-row sm:items-center sm:gap-8">
                  <p className="type-stat shrink-0 text-fg transition-colors motion-base group-hover:text-accent-text sm:w-40">
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
                      <span
                        key={dot}
                        className="size-2.5 rounded-pill bg-accent opacity-50 transition-opacity motion-base group-hover:opacity-100"
                        style={{ transitionDelay: `${dot * 40}ms` }}
                      />
                    ))}
                  </span>
                </Card>
              </Reveal>
            ))}
          </Stack>
        }
        second={
          <Reveal delay={180}>
            <Card variant="flat" className="border-line bg-surface">
              <Stack gap="lg">
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
              </Stack>
            </Card>
          </Reveal>
        }
      />
    </Section>
  );
}
