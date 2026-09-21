import { Heart, PencilLine, Sparkles, Trophy } from 'lucide-react';
import { RichTitle, SectionHeader } from '@/components/ui/heading';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { Card } from '@/components/ui/surface';
import { HOW, STEPS } from '@/content/home';
import { ANCHORS } from '@/lib/routes';

const ICONS = { heart: Heart, pencil: PencilLine, sparkles: Sparkles, trophy: Trophy } as const;

export function HowItWorks() {
  return (
    <Section id={ANCHORS.how.slice(1)}>
      <Reveal>
        <SectionHeader eyebrow={HOW.eyebrow} title={<RichTitle {...HOW.title} />} lead={HOW.lead} />
      </Reveal>

      <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => {
          const Icon = ICONS[step.icon];
          return (
            <Reveal as="li" key={step.title} delay={i * 90} className="h-full">
              <Card interactive className="flex h-full flex-col gap-5">
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-pill bg-canvas-alt text-action">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="type-num text-sm text-fg-muted">0{i + 1}</span>
                </div>
                <h3 className="type-h3 text-fg">{step.title}</h3>
                <p className="type-body text-fg-muted">{step.text}</p>
              </Card>
            </Reveal>
          );
        })}
      </ol>
    </Section>
  );
}
