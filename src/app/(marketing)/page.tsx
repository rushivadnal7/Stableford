import { Charities } from '@/components/home/charities';
import { Faq } from '@/components/home/faq';
import { FeeSplitSection } from '@/components/home/fee-split-section';
import { FinalCta } from '@/components/home/final-cta';
import { Hero } from '@/components/home/hero';
import { HowItWorks } from '@/components/home/how-it-works';
import { Pricing } from '@/components/home/pricing';
import { Prizes } from '@/components/home/prizes';
import { getHomeData } from '@/modules/home/data';

/** Prices and charities change rarely: rebuild this page in the background every five minutes. */
export const revalidate = 300;

export default async function HomePage() {
  const { plans, charities } = await getHomeData();
  const monthly = plans.find((p) => p.code === 'monthly') ?? plans[0]!;

  return (
    <>
      <Hero />
      <HowItWorks />
      <FeeSplitSection plan={monthly} />
      <Prizes />
      <Charities charities={charities} />
      <Pricing plans={plans} />
      <Faq />
      <FinalCta />
    </>
  );
}
