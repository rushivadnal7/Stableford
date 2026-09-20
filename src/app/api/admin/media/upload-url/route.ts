import { adminContext } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { mediaUploadSchema } from '@/modules/charities/schema';
import { createMediaUploadUrl } from '@/modules/charities/service';

/** Admin: a signed URL to upload a charity image straight to Storage. Save the returned `path` on the charity. */
export const POST = api(async (req) => {
  const { admin } = await adminContext(req);
  const { filename } = await readBody(req, mediaUploadSchema);
  return createMediaUploadUrl(admin, filename);
});
