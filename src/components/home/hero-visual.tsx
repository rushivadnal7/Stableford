import { Ball } from '@/components/ui/ball';
import { Badge, Card } from '@/components/ui/surface';
import { matchesOf, SAMPLE } from '@/content/home';

/**
 * A small preview of the product for the hero: five scores, a drawn set of numbers with the matches
 * lit, and the charity share. Pure presentation, marked as a sample and hidden from assistive tech.
 */
export function HeroVisual() {
  const hits = matchesOf(SAMPLE.scores, SAMPLE.drawn);

  return (
    <div aria-hidden="true" className="relative mx-auto grid max-w-md gap-4 sm:max-w-lg lg:max-w-none">
      <Card variant="glass" className="animate-float p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="type-small text-fg-muted">Your latest five scores</p>
          <Badge variant="glass">Sample</Badge>
        </div>
        <ol className="mt-4 flex gap-2">
          {SAMPLE.scores.map((score, i) => (
            <li
              key={`${score}-${i}`}
              className="type-num flex h-12 flex-1 items-center justify-center rounded-lg border border-glass-line bg-glass text-lg"
            >
              {score}
            </li>
          ))}
        </ol>
        <p className="type-caption mt-3 text-fg-muted">Newest first · Stableford points</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-5">
        <Card variant="glass" className="animate-float-slow p-5 sm:col-span-3 md:p-6">
          <p className="type-small text-fg-muted">This month&rsquo;s draw</p>
          <ol className="mt-4 flex flex-wrap gap-2">
            {SAMPLE.drawn.map((n) => (
              <li key={n}>
                <Ball n={n} size="sm" tone={hits.includes(n) ? 'accent' : 'glass'} />
              </li>
            ))}
          </ol>
          <p className="type-caption mt-3 text-fg-muted">
            {hits.length} of {SAMPLE.drawn.length} numbers match your scores
          </p>
        </Card>

        <Card variant="glass" className="animate-float p-5 sm:col-span-2 sm:mt-8 md:p-6">
          <div className="relative size-20">
            <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
              <circle cx="18" cy="18" r="16" fill="none" strokeWidth="3.5" className="stroke-glass-line" />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                strokeWidth="3.5"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${SAMPLE.charityPercent} 100`}
                className="stroke-accent"
              />
            </svg>
            <span className="type-num absolute inset-0 grid place-items-center text-lg">{SAMPLE.charityPercent}%</span>
          </div>
          <p className="type-caption mt-3 text-fg-muted">of each payment goes to the charity you choose</p>
        </Card>
      </div>
    </div>
  );
}
