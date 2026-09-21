'use client';

import { useId, useState } from 'react';
import { Card } from '@/components/ui/surface';
import { FEE_SPLIT, SAMPLE } from '@/content/home';
import { CONFIG } from '@/lib/config';
import { formatMoney } from '@/lib/format';
import { feeSplit } from '@/modules/home/fee-split';

const { minPercent, maxPercent } = CONFIG.charity;

/** Drag the slider to see how one payment divides between the prize pool, a charity and the platform. */
export function FeeSplitCard({ priceCents, planName, interval }: { priceCents: number; planName: string; interval: string }) {
  const [percent, setPercent] = useState(SAMPLE.charityPercent);
  const sliderId = useId();
  const split = feeSplit(priceCents, percent);
  const width = (cents: number) => `${(cents / priceCents) * 100}%`;

  const rows = [
    { key: 'pool', swatch: 'bg-action', cents: split.poolCents, ...FEE_SPLIT.parts.pool },
    { key: 'charity', swatch: 'bg-accent', cents: split.charityCents, ...FEE_SPLIT.parts.charity },
    { key: 'platform', swatch: 'bg-warm', cents: split.platformCents, ...FEE_SPLIT.parts.platform },
  ];

  return (
    <Card className="flex flex-col gap-8">
      <div>
        <p className="type-eyebrow">On the {planName.toLowerCase()} plan</p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="type-stat text-fg">{formatMoney(priceCents)}</span>
          <span className="type-small text-fg-muted">per {interval}</span>
        </p>
      </div>

      <div
        role="img"
        aria-label={rows.map((r) => `${r.label} ${formatMoney(r.cents)}`).join(', ')}
        className="flex h-5 overflow-hidden rounded-pill bg-canvas-alt"
      >
        <span className="bg-action transition-[width] motion-base" style={{ width: width(split.poolCents) }} />
        <span className="bg-accent transition-[width] motion-base" style={{ width: width(split.charityCents) }} />
        <span className="bg-warm transition-[width] motion-base" style={{ width: width(split.platformCents) }} />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor={sliderId} className="type-label text-fg">
            {FEE_SPLIT.sliderLabel}
          </label>
          <output htmlFor={sliderId} className="type-num text-lg text-accent-text">
            {percent}%
          </output>
        </div>
        <input
          id={sliderId}
          type="range"
          min={minPercent}
          max={maxPercent}
          step={1}
          value={percent}
          onChange={(event) => setPercent(Number(event.target.value))}
          className="mt-2 h-touch w-full cursor-pointer accent-action"
        />
        <div className="type-num mt-1 flex justify-between text-xs text-fg-muted">
          <span>{minPercent}%</span>
          <span>{maxPercent}%</span>
        </div>
      </div>

      <ul aria-live="polite" className="flex flex-col divide-y divide-line">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
            <span aria-hidden="true" className={`size-3 shrink-0 rounded-pill ${row.swatch}`} />
            <div className="flex-1">
              <p className="type-label text-fg">{row.label}</p>
              <p className="type-small text-fg-muted">{row.text}</p>
            </div>
            <p className="type-num text-fg">{formatMoney(row.cents)}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
