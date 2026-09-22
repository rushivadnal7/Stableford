import { Ball } from '@/components/ui/ball';
import { Stack } from '@/components/ui/layout';
import { Card } from '@/components/ui/surface';
import { DASHBOARD } from '@/content/dashboard';

const T = DASHBOARD.draws;

export interface RecentEntry {
  period: string;
  your_numbers: number[];
  draw_numbers: number[];
  matches: number | null;
}

export function DrawsPanel({
  upcomingPeriod,
  eligible,
  drawsEntered,
  recent,
}: {
  upcomingPeriod: string;
  eligible: boolean;
  drawsEntered: number;
  recent: RecentEntry[];
}) {
  return (
    <Card>
      <Stack gap="lg">
        <div>
          <h2 className="type-h4 text-fg">{T.title}</h2>
          <p className="type-small mt-1 text-fg-muted">{T.entered(drawsEntered)}</p>
        </div>

        <div className="rounded-lg border border-line bg-canvas-alt p-card">
          <p className="type-label text-fg">{T.upcoming(upcomingPeriod)}</p>
          <p className="type-small mt-1 text-fg-muted">{eligible ? T.eligible : T.notEligible}</p>
        </div>

        {recent.length > 0 && (
          <Stack gap="md">
            <h3 className="type-label text-fg-muted">{T.recentTitle}</h3>
            <Stack as="ul" gap="md">
              {recent.map((entry) => (
                <li key={entry.period} className="flex flex-col gap-2 border-b border-line pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="type-label text-fg">{entry.period}</span>
                    <span className="type-small text-fg-muted">{T.matches(entry.matches ?? 0)}</span>
                  </div>
                  <ol className="flex flex-wrap gap-1.5">
                    {entry.your_numbers.map((n, i) => (
                      <li key={`${n}-${i}`}>
                        <Ball n={n} size="sm" tone={entry.draw_numbers.includes(n) ? 'accent' : 'outline'} />
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </Stack>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
