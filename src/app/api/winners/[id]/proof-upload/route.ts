import { authenticate } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { proofUploadSchema, requestProofUpload } from '@/modules/winners/service';

/** Step 1 of proof upload: returns a signed URL the browser uploads the screenshot to directly. */
export const POST = api(async (req, { params }: { params: { id: string } }) => {
  const ctx = await authenticate(req);
  const { filename } = await readBody(req, proofUploadSchema);
  return requestProofUpload(ctx, params.id, filename);
});
