import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseEnv } from '@/lib/env';

/**
 * Refreshes the Supabase session cookie on every navigation. A Server Component can read cookies
 * but not reliably write them (see `cookieClient()`'s comment), so without this, a session nearing
 * expiry would go stale: pages would keep reading an old access token until the visitor happened to
 * hit a route handler, which can write cookies. Middleware runs before every request and can.
 *
 * This only keeps the session current; it does not gate any route. Each page decides for itself
 * whether it needs a signed-in user (see `requireUser()` in lib/auth-page.ts).
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = supabaseEnv();

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // The call itself is what triggers a refresh when the access token is expired; the result is unused.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    // Every route except static assets, images and files with an extension (fonts, the icon, models).
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|webp|glb|ico)$).*)',
  ],
};
