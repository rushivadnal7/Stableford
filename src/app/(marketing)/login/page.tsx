import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { Eyebrow, RichTitle } from '@/components/ui/heading';
import { Split, Stack } from '@/components/ui/layout';
import { Section } from '@/components/ui/section';
import { LOGIN } from '@/content/auth';
import { pageUser } from '@/lib/auth-page';
import { ROUTES } from '@/lib/routes';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : ROUTES.dashboard;

  // Already signed in with a plain cookie session (not just arriving via an email link): skip the form.
  if (await pageUser()) redirect(safeNext);

  return (
    <Section contained className="flex min-h-svh items-center py-block">
      <Split
        ratio="5-7"
        first={
          <Stack gap="lg">
            <Eyebrow className="flex items-center gap-3">
              <span aria-hidden="true" className="size-2 rounded-pill bg-accent" />
              {LOGIN.eyebrow}
            </Eyebrow>
            <h1 className="type-h1 max-w-narrow text-fg">
              <RichTitle {...LOGIN.title} />
            </h1>
            <p className="type-lead max-w-copy">{LOGIN.lead}</p>
          </Stack>
        }
        second={<LoginForm next={safeNext} />}
      />
    </Section>
  );
}
