import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { Wordmark } from '@/components/ui/logo';
import { NAV } from '@/content/home';
import { ROUTES, signupHref } from '@/lib/routes';
import { SITE } from '@/lib/site';
import { MobileNav } from './mobile-nav';

export function Header() {
  return (
    <header className="sticky top-0 z-header border-b border-line bg-canvas/85 backdrop-blur-lg">
      <div className="container-page flex h-header items-center justify-between gap-6">
        <Link href={ROUTES.home} aria-label={`${SITE.name}, home`}>
          <Wordmark />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
          {NAV.map((link) => (
            <Link
              key={link.href}
              href={`${ROUTES.home}${link.href}`}
              className="type-small relative py-1 text-fg-muted transition-colors hover:text-fg after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform motion-base hover:after:scale-x-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink href={ROUTES.login} variant="ghost" size="sm" className="hidden sm:inline-flex">
            Sign in
          </ButtonLink>
          <ButtonLink href={signupHref()} size="sm">
            Subscribe
          </ButtonLink>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
