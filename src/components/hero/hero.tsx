import { ArrowDown, Check } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Eyebrow, RichTitle } from '@/components/ui/heading';
import { Cluster } from '@/components/ui/layout';
import { HERO, STORY } from '@/content/home';
import { ANCHORS, ROUTES, signupHref } from '@/lib/routes';
import { StoryLoader } from './story-loader';

/** The `lg` breakpoint (64rem, see tokens.css) as media queries for the poster, which HTML cannot take from a CSS variable. */
const LAPTOP_UP = '(min-width: 64em)';
const BELOW_LAPTOP = '(max-width: 63.99em)';

/**
 * The opening of the home page: a headline, and a picture that turns into a scroll-driven story.
 *
 * Everything here is server-rendered and complete without scripts: the headline, the calls to action, a
 * still poster of the 3D scene, and the four captions. The layout (a tall runway with a pinned screen, the
 * capsule cut-out) is pure CSS in styles/hero.css. <StoryLoader> then adds motion after the page has loaded.
 * The headline carries no entrance animation on purpose: it is the largest paint, and it must not wait.
 */
export function Hero() {
  return (
    <section data-hero data-scene="idle" aria-labelledby="hero-title" className="hero">
      {/* Fetch only the poster this screen will show, before anything else asks for it. */}
      <link rel="preload" as="image" href={STORY.poster.wide} media={LAPTOP_UP} fetchPriority="high" />
      <link rel="preload" as="image" href={STORY.poster.tall} media={BELOW_LAPTOP} fetchPriority="high" />

      <div className="hero-copy" data-hero-copy>
        <div className="hero-copy-inner">
          <Eyebrow className="flex items-center gap-3">
            <span aria-hidden="true" className="size-2 rounded-pill bg-accent" />
            {HERO.eyebrow}
          </Eyebrow>

          <h1 id="hero-title" className="type-hero max-w-narrow text-fg">
            <RichTitle {...HERO.title} />
          </h1>

          <p className="type-lead max-w-copy">{HERO.lead}</p>

          <Cluster className="mt-2">
            <ButtonLink href={signupHref()} size="lg" arrow>
              {HERO.primary}
            </ButtonLink>
            <ButtonLink href={`${ROUTES.home}${ANCHORS.how}`} size="lg" variant="secondary">
              {HERO.secondary}
            </ButtonLink>
          </Cluster>

          <Cluster as="ul" gap="sm" className="type-small gap-x-6 text-fg-muted">
            {HERO.assurances.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="size-4 text-accent-text" aria-hidden />
                {item}
              </li>
            ))}
          </Cluster>
        </div>
      </div>

      <div className="hero-runway" data-hero-runway>
        <div className="hero-pin" data-hero-pin>
          <div className="hero-stage" data-hero-stage>
            <picture>
              <source media={LAPTOP_UP} srcSet={STORY.poster.wide} />
              {/* A pre-rendered still of the same scene, so the picture is there instantly and for anyone without WebGL. */}
              <img
                className="hero-poster"
                src={STORY.poster.tall}
                alt={STORY.poster.alt}
                width={900}
                height={1400}
                fetchPriority="high"
                decoding="async"
              />
            </picture>
            <div className="hero-canvas-host" data-hero-canvas />
          </div>

          <ol className="hero-chapters" aria-label={STORY.label}>
            {STORY.chapters.map((chapter) => (
              <li key={chapter.kicker} className="hero-chapter" data-hero-chapter>
                <span className="type-eyebrow">{chapter.kicker}</span>
                <p className="type-h3">{chapter.title}</p>
                <p className="type-small text-fg-muted">{chapter.text}</p>
              </li>
            ))}
          </ol>

          <div className="hero-rail type-eyebrow" aria-hidden="true">
            <span className="hero-rail-track">
              <span className="hero-rail-fill" data-hero-rail-fill />
            </span>
            {STORY.chapters.map((chapter) => (
              <span key={chapter.kicker} className="hero-rail-tick" data-hero-tick>
                {chapter.kicker}
              </span>
            ))}
          </div>

          <div className="hero-hint type-eyebrow" data-hero-hint aria-hidden="true">
            {STORY.scroll}
            <ArrowDown className="size-4" />
          </div>
        </div>
      </div>

      <StoryLoader />
    </section>
  );
}
