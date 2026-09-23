import { Heart, PencilLine, Sparkles, Trophy } from 'lucide-react';
import { RichTitle, SectionHeader } from '@/components/ui/heading';
import { Grid } from '@/components/ui/layout';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { Card } from '@/components/ui/surface';
import { HOW, STEPS } from '@/content/home';
import { ANCHORS } from '@/lib/routes';

const ICONS = { heart: Heart, pencil: PencilLine, sparkles: Sparkles, trophy: Trophy } as const;

export function HowItWorks() {
  return (
    <Section
      id={ANCHORS.how.slice(1)}
      header={
        <Reveal>
          <SectionHeader eyebrow={HOW.eyebrow} title={<RichTitle {...HOW.title} />} lead={HOW.lead} />
        </Reveal>
      }
    >
      <Grid as="ol" cols={4}>
        {STEPS.map((step, i) => {
          const Icon = ICONS[step.icon];
          return (
            <Reveal as="li" key={step.title} delay={i * 90} className="h-full">
              <Card interactive className="group flex h-full flex-col gap-5">
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-pill bg-canvas-alt transition-colors motion-slow group-hover:bg-accent/25 text-action">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="type-num text-sm text-fg-muted transition-colors motion-base group-hover:text-accent-text">0{i + 1}</span>
                </div>
                <h3 className="type-h3 text-fg">{step.title}</h3>
                <p className="type-body text-fg-muted">{step.text}</p>
              </Card>
            </Reveal>
          );
        })}
      </Grid>
    </Section>
  );
}
