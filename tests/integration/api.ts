/** Call a Next.js route handler directly, the way the framework would, with an optional bearer token. */
type Handler = (req: Request, ctx: { params: Promise<never> }) => Promise<Response>;

export interface ApiResult {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper: bodies are asserted field by field
  body: any;
}

export async function call(
  handler: unknown,
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; params?: Record<string, string>; headers?: Record<string, string>; rawBody?: string } = {},
): Promise<ApiResult> {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;

  const req = new Request(`http://localhost:3000${path}`, {
    method,
    headers,
    body: opts.rawBody ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
  });
  const res = await (handler as Handler)(req, { params: Promise.resolve((opts.params ?? {}) as never) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
