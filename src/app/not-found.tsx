import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/button';
import { Accent, Eyebrow } from '@/components/ui/heading';
import { Section } from '@/components/ui/section';
import { ROUTES } from '@/lib/routes';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main id="main">
      <Section className="flex min-h-svh items-center">
        <div className="flex flex-col items-start gap-6">
          <Eyebrow>404</Eyebrow>
          <h1 className="type-h1 max-w-narrow text-fg">
            This page is <Accent>not here</Accent> yet.
          </h1>
          <p className="type-lead max-w-copy">The link may be out of date, or the page may still be on its way.</p>
          <ButtonLink href={ROUTES.home} size="lg" arrow>
            Back to the home page
          </ButtonLink>
        </div>
      </Section>
    </main>
  );
}
