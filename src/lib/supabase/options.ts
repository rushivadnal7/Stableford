import ws from 'ws';

/**
 * supabase-js builds a realtime client whenever a client is created, and it needs a WebSocket
 * implementation up front. Node 22+ has one built in; Node 20 does not, so fall back to `ws`.
 * We never use realtime, so this only has to exist, not to connect.
 */
export const realtimeOptions = {
  realtime: { transport: (globalThis.WebSocket ?? ws) as unknown as typeof WebSocket },
};
