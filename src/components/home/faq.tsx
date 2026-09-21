import { ChevronDown } from 'lucide-react';
import { RichTitle, SectionHeader } from '@/components/ui/heading';
import { Split } from '@/components/ui/layout';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { FAQ } from '@/content/home';
import { ANCHORS } from '@/lib/routes';

/** Native <details>: keyboard and screen-reader friendly with no JavaScript. `name` makes it an accordion. */
export function Faq() {
  return (
    <Section id={ANCHORS.faq.slice(1)}>
      <Split
        ratio="4-8"
        align="start"
        first={
          <Reveal>
            <SectionHeader eyebrow={FAQ.eyebrow} title={<RichTitle {...FAQ.title} />} lead={FAQ.lead} />
          </Reveal>
        }
        second={
          <Reveal delay={120}>
            <div className="border-t border-line">
              {FAQ.items.map((item) => (
                <details key={item.q} name="faq" className="group border-b border-line">
                  <summary className="type-h4 flex min-h-touch list-none items-center justify-between gap-6 py-6 text-fg transition-colors hover:text-accent-text [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown className="size-5 shrink-0 transition-transform motion-base group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="type-body max-w-copy pb-6 text-fg-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
          
        }
      />
    </Section>
  );
}
