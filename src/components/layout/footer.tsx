import Link from 'next/link';
import { Grid, Split, Stack } from '@/components/ui/layout';
import { Wordmark } from '@/components/ui/logo';
import { Panel } from '@/components/ui/section';
import { FOOTER } from '@/content/home';
import { ROUTES } from '@/lib/routes';
import { SITE } from '@/lib/site';

/** A link with a comfortable tap height. Nudges right on hover, the same small "go" gesture as a button's arrow. */
const LINK =
  'type-small inline-flex min-h-touch items-center text-fg-muted transition-[color,transform] motion-base hover:translate-x-1 hover:text-fg';

export function Footer() {
  return (
    <footer className="pb-safe">
      <div className="pb-inset">
        <Panel background="solid">
          <Split
            ratio="6-6"
            align="start"
            first={
              <Stack gap="lg">
                <Wordmark />
                <p className="type-body max-w-copy text-fg-muted">{FOOTER.blurb}</p>
              </Stack>
            }
            second={
              <Grid cols={2}>
                {FOOTER.groups.map((group) => (
                  <nav key={group.title} aria-label={group.title}>
                    <p className="type-eyebrow">{group.title}</p>
                    <ul className="mt-2 flex flex-col">
                      {group.links.map((link) => (
                        <li key={link.href}>
                          <Link href={`${ROUTES.home}${link.href}`} className={LINK}>
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                ))}
                <nav aria-label="Account">
                  <p className="type-eyebrow">Account</p>
                  <ul className="mt-2 flex flex-col">
                    <li>
                      <Link href={ROUTES.login} className={LINK}>
                        Sign in
                      </Link>
                    </li>
                    <li>
                      <Link href={ROUTES.signup} className={LINK}>
                        Subscribe
                      </Link>
                    </li>
                  </ul>
                </nav>
              </Grid>
            }
          />

          <div className="type-caption mt-block flex flex-col gap-2 border-t border-line pt-6 text-fg-muted sm:flex-row sm:justify-between">
            <p>
              &copy; {new Date().getFullYear()} {SITE.name}
            </p>
            <p>{FOOTER.note}</p>
          </div>
        </Panel>
      </div>
    </footer>
  );
}
