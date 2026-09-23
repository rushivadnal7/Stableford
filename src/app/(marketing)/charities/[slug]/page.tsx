import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATEGORY_ART, DEFAULT_CATEGORY_ART } from '@/components/charities/category-art';
import { DonateForm } from '@/components/charities/donate-form';
import { ButtonLink } from '@/components/ui/button';
import { Accent, Eyebrow } from '@/components/ui/heading';
import { Grid, Stack } from '@/components/ui/layout';
import { Section } from '@/components/ui/section';
import { Badge, Card } from '@/components/ui/surface';
import { CHARITY_DETAIL } from '@/content/charities-page';
import { pageUser } from '@/lib/auth-page';
import { charityHref, ROUTES, signupHref } from '@/lib/routes';
import { anonClient } from '@/lib/supabase/user';
import { getCharity } from '@/modules/charities/service';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const charity = await getCharity(anonClient(), slug);
    return { title: charity.name, description: charity.summary };
  } catch {
    return { title: 'Charity' };
  }
}

function formatEventDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default async function CharityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [charity, user] = await Promise.all([getCharity(anonClient(), slug).catch(() => null), pageUser()]);
  if (!charity) notFound();

  const { icon: Icon, tint } = CATEGORY_ART[charity.category] ?? DEFAULT_CATEGORY_ART;

  return (
    <Section contained>
      <Link href={ROUTES.charities} className="type-small mb-block inline-flex items-center gap-2 text-fg-muted transition-colors motion-base hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        {CHARITY_DETAIL.back}
      </Link>

      <Grid cols={2} className="items-start">
        <div className={`relative aspect-4/3 overflow-hidden rounded-3xl ${tint}`}>
          {charity.image_url ? (
            <Image src={charity.image_url} alt="" fill sizes="(min-width: 48rem) 50vw, 100vw" className="object-cover" priority />
          ) : (
            <div className="grid h-full place-items-center">
              <Icon className="size-20 text-action" aria-hidden />
            </div>
          )}
          {charity.is_featured && (
            <Badge variant="accent" className="absolute top-4 left-4 bg-canvas">
              {CHARITY_DETAIL.featured}
            </Badge>
          )}
        </div>

        <Stack gap="lg">
          <Stack gap="sm">
            <Eyebrow>{charity.category}</Eyebrow>
            <h1 className="type-h1 text-fg">
              <Accent>{charity.name}</Accent>
            </h1>
            <p className="type-lead max-w-copy">{charity.summary}</p>
          </Stack>
          {charity.description && <p className="type-body max-w-copy text-fg-muted whitespace-pre-line">{charity.description}</p>}
          <ButtonLink href={signupHref(undefined, charity.slug)} size="lg" arrow>
            {CHARITY_DETAIL.cta}
          </ButtonLink>
        </Stack>
      </Grid>

      <div className="mt-block">
        <h2 className="type-h3 text-fg">{CHARITY_DETAIL.eventsTitle}</h2>
        {charity.events.length === 0 ? (
          <p className="type-body mt-4 text-fg-muted">{CHARITY_DETAIL.noEvents}</p>
        ) : (
          <Grid cols={3} className="mt-block">
            {charity.events.map((event) => (
              <Card key={event.id} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-fg-muted">
                  <Calendar className="size-4 shrink-0" aria-hidden />
                  <span className="type-small">{formatEventDate(event.event_date)}</span>
                </div>
                <h3 className="type-h4 text-fg">{event.title}</h3>
                {event.description && <p className="type-body text-fg-muted">{event.description}</p>}
                {event.location && (
                  <div className="mt-auto flex items-center gap-2 text-fg-muted">
                    <MapPin className="size-4 shrink-0" aria-hidden />
                    <span className="type-small">{event.location}</span>
                  </div>
                )}
              </Card>
            ))}
          </Grid>
        )}
      </div>

      <div className="mt-block max-w-copy">
        <DonateForm
          charityId={charity.id}
          charityName={charity.name}
          signedIn={!!user}
          loginHref={`${ROUTES.login}?next=${encodeURIComponent(charityHref(charity.slug))}`}
        />
      </div>
    </Section>
  );
}
