import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Record an admin action (ADM-08). Best effort: a failure to write the log is reported but must not
 * undo or block the action that already happened.
 */
export async function audit(
  admin: SupabaseClient,
  actorId: string,
  action: string,
  entity: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await admin.from('audit_log').insert({ actor_id: actorId, action, entity, entity_id: entityId, details });
  if (error) console.error('Could not write audit log', { action, entity, entityId, error });
}
