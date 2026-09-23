import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge, Card } from '@/components/ui/surface';
import { charityHref } from '@/lib/routes';
import { CATEGORY_ART, DEFAULT_CATEGORY_ART } from './category-art';

export interface CharityCardData {
  id: string;
  slug: string;
  name: string;
  category: string;
  summary: string;
  is_featured: boolean;
  image_url: string | null;
}

/** The same card used on the home page and the directory: an image if there is one, else a tinted icon. */
export function CharityCard({ charity, priority = false }: { charity: CharityCardData; priority?: boolean }) {
  const { icon: Icon, tint } = CATEGORY_ART[charity.category] ?? DEFAULT_CATEGORY_ART;
  const IconComp: LucideIcon = Icon;

  return (
    <Link href={charityHref(charity.slug)} className="group block h-full">
      <Card interactive className="flex h-full flex-col gap-5 p-4">
        <div className={`relative grid h-36 place-items-center overflow-hidden rounded-lg ${tint}`}>
          {charity.image_url ? (
            <Image
              src={charity.image_url}
              alt=""
              fill
              sizes="(min-width: 64rem) 25vw, (min-width: 40rem) 50vw, 100vw"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <IconComp className="size-10 text-action" aria-hidden />
          )}
          {charity.is_featured && (
            <Badge variant="accent" className="absolute top-3 left-3 bg-canvas">
              Featured
            </Badge>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3 px-2 pb-2">
          <Badge className="self-start capitalize">{charity.category}</Badge>
          <h3 className="type-h3 text-fg transition-colors motion-base group-hover:text-accent-text">{charity.name}</h3>
          <p className="type-body text-fg-muted">{charity.summary}</p>
        </div>
      </Card>
    </Link>
  );
}
