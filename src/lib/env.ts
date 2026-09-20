import { z } from 'zod';

/**
 * Environment access is lazy and grouped: a route that only needs Supabase
 * never fails because a Stripe key is missing, and `next build` succeeds
 * without secrets. Each group validates once, then is cached.
 */
function group<T extends z.ZodRawShape>(shape: T) {
  let cached: z.infer<z.ZodObject<T>> | undefined;
  return () => {
    if (cached) return cached;
    const parsed = z.object(shape).safeParse(process.env);
    if (!parsed.success) {
      const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new Error(`Invalid environment configuration (${problems}). See .env.example.`);
    }
    cached = parsed.data;
    return cached;
  };
}

export const appEnv = group({
  APP_URL: z.url().default('http://localhost:3000'),
});

export const supabaseEnv = group({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const serviceEnv = group({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export const stripeEnv = group({
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
});
