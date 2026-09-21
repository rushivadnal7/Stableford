import { Ball } from '@/components/ui/ball';
import { ButtonLink } from '@/components/ui/button';
import { RichTitle } from '@/components/ui/heading';
import { Reveal } from '@/components/ui/reveal';
import { Panel } from '@/components/ui/section';
import { FINAL_CTA } from '@/content/home';
import { ROUTES, signupHref } from '@/lib/routes';

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="pb-inset">
      <Panel background="cta" className="px-gutter py-20 text-center md:py-28">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <Ball n={31} tone="glass" size="lg" className="absolute top-12 left-10 hidden animate-float-slow md:inline-flex" />
          <Ball n={18} tone="accent" size="md" className="absolute right-16 bottom-14 hidden animate-float opacity-80 md:inline-flex" />
        </div>

        <Reveal className="container-content flex flex-col items-center gap-6">
          <h2 id="cta-title" className="type-h1 max-w-narrow text-fg">
            <RichTitle {...FINAL_CTA.title} />
          </h2>
          <p className="type-lead max-w-copy">{FINAL_CTA.text}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href={signupHref()} size="lg" arrow>
              {FINAL_CTA.primary}
            </ButtonLink>
            <ButtonLink href={ROUTES.charities} size="lg" variant="secondary">
              {FINAL_CTA.secondary}
            </ButtonLink>
          </div>
        </Reveal>
      </Panel>
    </section>
  );
}
