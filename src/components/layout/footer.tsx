import Link from 'next/link';
import { Panel } from '@/components/ui/section';
import { Wordmark } from '@/components/ui/logo';
import { FOOTER } from '@/content/home';
import { ROUTES } from '@/lib/routes';
import { SITE } from '@/lib/site';

export function Footer() {
  return (
    <footer className="pb-inset">
      <Panel background="solid" className="px-gutter py-14 md:py-16">
        <div className="container-page grid gap-12 lg:grid-cols-12">
          <div className="flex flex-col gap-5 lg:col-span-6">
            <Wordmark />
            <p className="type-body max-w-copy text-fg-muted">{FOOTER.blurb}</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:col-span-6">
            {FOOTER.groups.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <p className="type-eyebrow">{group.title}</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link href={`${ROUTES.home}${link.href}`} className="type-small text-fg-muted transition-colors hover:text-fg">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <nav aria-label="Account">
              <p className="type-eyebrow">Account</p>
              <ul className="mt-4 flex flex-col gap-3">
                <li>
                  <Link href={ROUTES.login} className="type-small text-fg-muted transition-colors hover:text-fg">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link href={ROUTES.signup} className="type-small text-fg-muted transition-colors hover:text-fg">
                    Subscribe
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="container-page mt-12 flex flex-col gap-2 border-t border-line pt-6 type-caption text-fg-muted sm:flex-row sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {SITE.name}
          </p>
          <p>{FOOTER.note}</p>
        </div>
      </Panel>
    </footer>
  );
}
