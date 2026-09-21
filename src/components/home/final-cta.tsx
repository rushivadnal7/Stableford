import { Ball } from '@/components/ui/ball';
import { ButtonLink } from '@/components/ui/button';
import { RichTitle } from '@/components/ui/heading';
import { Cluster, Stack } from '@/components/ui/layout';
import { Reveal } from '@/components/ui/reveal';
import { Panel } from '@/components/ui/section';
import { FINAL_CTA } from '@/content/home';
import { ROUTES, signupHref } from '@/lib/routes';

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="pb-inset">
      <Panel background="cta" className="text-center">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <Ball n={31} tone="glass" size="lg" className="absolute top-12 left-10 hidden animate-float-slow md:inline-flex" />
          <Ball n={18} tone="accent" size="md" className="absolute right-16 bottom-14 hidden animate-float opacity-80 md:inline-flex" />
        </div>

        <Reveal>
          <Stack gap="lg" className="mx-auto max-w-content items-center">
            <h2 id="cta-title" className="type-h1 max-w-narrow text-fg">
              <RichTitle {...FINAL_CTA.title} />
            </h2>
            <p className="type-lead max-w-copy">{FINAL_CTA.text}</p>
            <Cluster justify="center" className="mt-4">
              <ButtonLink href={signupHref()} size="lg" arrow>
                {FINAL_CTA.primary}
              </ButtonLink>
              <ButtonLink href={ROUTES.charities} size="lg" variant="secondary">
                {FINAL_CTA.secondary}
              </ButtonLink>
            </Cluster>
          </Stack>
        </Reveal>
      </Panel>
    </section>
  );
}
