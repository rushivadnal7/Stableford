import { vi } from 'vitest';

// Route handlers read the session cookie through next/headers, which only works inside a real Next.js
// request. Tests authenticate with a bearer token, and a request with neither has an empty cookie jar.
vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));
