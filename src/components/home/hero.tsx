import { Check } from 'lucide-react';
import { Ball } from '@/components/ui/ball';
import { ButtonLink } from '@/components/ui/button';
import { Eyebrow, RichTitle } from '@/components/ui/heading';
import { Cluster, Split, Stack } from '@/components/ui/layout';
import { Panel } from '@/components/ui/section';
import { HERO } from '@/content/home';
import { ANCHORS, ROUTES, signupHref } from '@/lib/routes';
import { HeroVisual } from './hero-visual';

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="pt-inset">
      <Panel background="hero">
        {/* Decorative draw balls drifting in the corners. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <Ball n={12} tone="glass" size="lg" className="absolute top-10 right-16 hidden animate-float md:inline-flex" />
          <Ball n={27} tone="accent" size="md" className="absolute right-24 bottom-8 hidden animate-float-slow opacity-80 lg:inline-flex" />
          <Ball n={44} tone="warm" size="sm" className="absolute right-2/5 bottom-10 hidden animate-float opacity-70 lg:inline-flex" />
        </div>

        <Split
          ratio="7-5"
          first={
            <Stack gap="lg" className="items-start">
              <Eyebrow className="flex animate-fade-up items-center gap-3">
                <span aria-hidden="true" className="size-2 rounded-pill bg-accent" />
                {HERO.eyebrow}
              </Eyebrow>

              <h1 id="hero-title" className="type-display max-w-narrow animate-fade-up text-fg stagger-1">
                <RichTitle {...HERO.title} />
              </h1>

              <p className="type-lead max-w-copy animate-fade-up stagger-2">{HERO.lead}</p>

              <Cluster className="mt-4 animate-fade-up stagger-3">
                <ButtonLink href={signupHref()} size="lg" arrow>
                  {HERO.primary}
                </ButtonLink>
                <ButtonLink href={`${ROUTES.home}${ANCHORS.how}`} size="lg" variant="secondary">
                  {HERO.secondary}
                </ButtonLink>
              </Cluster>

              <Cluster as="ul" gap="sm" className="type-small mt-4 animate-fade-up gap-x-6 text-fg-muted stagger-4">
                {HERO.assurances.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="size-4 text-accent-text" aria-hidden />
                    {item}
                  </li>
                ))}
              </Cluster>
            </Stack>
          }
          second={
            <div className="animate-fade-up stagger-3">
              <HeroVisual />
            </div>
          }
        />
      </Panel>
    </section>
  );
}
