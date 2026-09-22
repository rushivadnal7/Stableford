import { Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CharityCard } from '@/components/charities/charity-card';
import { ButtonLink } from '@/components/ui/button';
import { RichTitle, SectionHeader } from '@/components/ui/heading';
import { Grid } from '@/components/ui/layout';
import { Section } from '@/components/ui/section';
import { CHARITIES_PAGE } from '@/content/charities-page';
import { FALLBACK_CHARITIES } from '@/content/fallback';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/lib/routes';
import { anonClient } from '@/lib/supabase/user';
import { listCategories, listCharities } from '@/modules/charities/service';

export const metadata: Metadata = { title: 'Charities' };
export const revalidate = 300;

const PAGE_SIZE = 12;

async function getDirectory(q: string | undefined, category: string | undefined, page: number) {
  try {
    const db = anonClient();
    const [list, categories] = await Promise.all([
      listCharities(db, { q, category, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
      listCategories(db),
    ]);
    return { ...list, categories, live: true };
  } catch {
    return { items: FALLBACK_CHARITIES, total: FALLBACK_CHARITIES.length, categories: [...new Set(FALLBACK_CHARITIES.map((c) => c.category))], live: false };
  }
}

/** Builds `/charities?q=...&category=...&page=...`, dropping anything empty. */
function directoryHref(params: { q?: string; category?: string; page?: number }) {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.category) search.set('category', params.category);
  if (params.page) search.set('page', String(params.page));
  const qs = search.toString();
  return qs ? `${ROUTES.charities}?${qs}` : ROUTES.charities;
}

export default async function CharitiesDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const { q, category, page: pageParam } = await searchParams;
  const page = Math.max(0, Number(pageParam) || 0);
  const { items, total, categories } = await getDirectory(q, category, page);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Section
      header={
        <SectionHeader eyebrow={CHARITIES_PAGE.eyebrow} title={<RichTitle {...CHARITIES_PAGE.title} />} lead={CHARITIES_PAGE.lead} />
      }
    >
      {/* A plain GET form: search works with no JavaScript, and the results page is shareable/bookmarkable. */}
      <form method="get" className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-muted" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={CHARITIES_PAGE.searchPlaceholder}
            aria-label={CHARITIES_PAGE.searchPlaceholder}
            className="h-12 w-full rounded-lg border border-line bg-surface pr-4 pl-11 type-body text-fg outline-none transition-colors motion-base placeholder:text-fg-muted focus:border-action"
          />
        </div>
        {category && <input type="hidden" name="category" value={category} />}
      </form>

      <div className="mt-block flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <Link
          href={directoryHref({ q })}
          className={cn(
            'inline-flex min-h-touch items-center rounded-pill border px-4 type-label transition-colors motion-base',
            !category ? 'border-action bg-action text-on-action' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
          )}
        >
          {CHARITIES_PAGE.allCategories}
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={directoryHref({ q, category: c })}
            className={cn(
              'inline-flex min-h-touch items-center rounded-pill border px-4 type-label capitalize transition-colors motion-base',
              category === c ? 'border-action bg-action text-on-action' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
            )}
          >
            {c}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="type-body mt-block text-fg-muted">{CHARITIES_PAGE.empty}</p>
      ) : (
        <Grid as="ul" cols={3} className="mt-block">
          {items.map((charity, i) => (
            <li key={charity.id} className="h-full">
              <CharityCard charity={charity} priority={i < 3} />
            </li>
          ))}
        </Grid>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-block flex items-center justify-center gap-3">
          <ButtonLink
            href={directoryHref({ q, category, page: page - 1 })}
            variant="secondary"
            size="sm"
            aria-disabled={page === 0}
            className={page === 0 ? 'pointer-events-none opacity-40' : undefined}
          >
            Previous
          </ButtonLink>
          <span className="type-num text-fg-muted">
            {page + 1} / {totalPages}
          </span>
          <ButtonLink
            href={directoryHref({ q, category, page: page + 1 })}
            variant="secondary"
            size="sm"
            aria-disabled={page >= totalPages - 1}
            className={page >= totalPages - 1 ? 'pointer-events-none opacity-40' : undefined}
          >
            Next
          </ButtonLink>
        </nav>
      )}
    </Section>
  );
}
