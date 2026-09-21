import { Check } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { RichTitle, SectionHeader } from '@/components/ui/heading';
import { Grid, Stack } from '@/components/ui/layout';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { Badge, Card } from '@/components/ui/surface';
import { PRICING } from '@/content/home';
import { formatMoney, formatPercent } from '@/lib/format';
import { ANCHORS, signupHref } from '@/lib/routes';
import type { HomePlan } from '@/modules/home/data';
import { monthsFree, yearlySaving } from '@/modules/home/fee-split';

function Features() {
  return (
    <Stack as="ul" gap="sm">
      {PRICING.features.map((feature) => (
        <li key={feature} className="type-body flex items-start gap-3 text-fg">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-pill bg-accent/30 text-accent-text">
            <Check className="size-3" aria-hidden />
          </span>
          {feature}
        </li>
      ))}
    </Stack>
  );
}

function PlanBody({ plan, saving, footnote }: { plan: HomePlan; saving?: string; footnote?: string }) {
  return (
    <Stack gap="xl" className="h-full">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="type-h3 text-fg">{plan.name}</h3>
          {saving && <Badge variant="accent">{saving}</Badge>}
        </div>
        <p className="mt-6 flex items-baseline gap-2">
          <span className="type-stat text-fg">{formatMoney(plan.price_cents)}</span>
          <span className="type-small text-fg-muted">per {plan.interval}</span>
        </p>
      </div>
      <Features />
      <ButtonLink href={signupHref(plan.code)} size="lg" arrow className="mt-auto w-full">
        {PRICING.cta} {plan.name.toLowerCase()}
      </ButtonLink>
      {footnote && <p className="type-small -mt-3 text-center text-fg-muted">{footnote}</p>}
    </Stack>
  );
}

export function Pricing({ plans }: { plans: HomePlan[] }) {
  const monthly = plans.find((p) => p.code === 'monthly');
  const yearly = plans.find((p) => p.code === 'yearly');
  const saving =
    monthly && yearly ? `${PRICING.best} · ${formatPercent(yearlySaving(monthly.price_cents, yearly.price_cents))} off` : PRICING.best;
  const free = monthly && yearly ? monthsFree(monthly.price_cents, yearly.price_cents) : 0;

  return (
    <Section
      id={ANCHORS.pricing.slice(1)}
      tone="alt"
      header={
        <Reveal>
          <SectionHeader eyebrow={PRICING.eyebrow} title={<RichTitle {...PRICING.title} />} lead={PRICING.lead} align="center" />
        </Reveal>
      }
    >
      <Grid cols={2} className="mx-auto max-w-content">
        {monthly && (
          <Reveal>
            <Card className="h-full">
              <PlanBody plan={monthly} />
            </Card>
          </Reveal>
        )}
        {yearly && (
          <Reveal delay={120}>
            <div data-theme="dark" className="h-full rounded-xl bg-canvas p-card text-fg shadow-lift">
              <PlanBody plan={yearly} saving={saving} footnote={free > 0 ? `About ${free} months free compared with paying monthly.` : undefined} />
            </div>
          </Reveal>
        )}
      </Grid>
    </Section>
  );
}
