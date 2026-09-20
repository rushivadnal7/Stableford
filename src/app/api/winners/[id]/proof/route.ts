import { authenticate } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { submitProof, submitProofSchema } from '@/modules/winners/service';

/** Step 2: register the uploaded file. The win moves to "submitted" for the admin to review. */
export const POST = api(async (req, { params }: { params: { id: string } }) => {
  const ctx = await authenticate(req);
  const { path } = await readBody(req, submitProofSchema);
  return { winner: await submitProof(ctx, params.id, path) };
});
