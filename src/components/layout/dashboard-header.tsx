import Link from 'next/link';
import { SignOutButton } from '@/components/layout/sign-out-button';
import { Wordmark } from '@/components/ui/logo';
import { ROUTES } from '@/lib/routes';

/**
 * The dashboard's own, much simpler header: no marketing nav (Sign in / Subscribe do not make sense
 * to someone already signed in), just the mark and a way out. The public header stays fully static
 * and cacheable; only this small area needs to know who is signed in.
 */
export function DashboardHeader({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-header border-b border-line bg-canvas/85 pt-safe backdrop-blur-lg">
      <div className="container-page flex h-header items-center justify-between gap-3">
        <Link href={ROUTES.home} aria-label="Stableford, home" className="group flex min-h-touch items-center">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-4">
          <span className="type-small hidden text-fg-muted sm:inline">{name}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
