import { z } from 'zod';

/** Public directory: search and filter (PRD section 08.2). */
export const charityListQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(50).optional(),
  featured: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// No defaults here on purpose: the database supplies them on insert, and a PATCH built from the
// same shape must not overwrite fields the caller did not send.
export const createCharitySchema = z.object({
  slug: z.string().max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens.'),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(50).optional(),
  summary: z.string().trim().max(300).optional(),
  description: z.string().trim().max(5000).optional(),
  image_path: z.string().max(300).nullable().optional(),
  is_featured: z.boolean().optional(),
  is_active: z.boolean().optional(),
});
export const updateCharitySchema = createCharitySchema.partial().refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update.' });

export const createEventSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(200).nullable().optional(),
  event_date: z.iso.date(),
});
export const updateEventSchema = createEventSchema.partial().refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update.' });

export const mediaUploadSchema = z.object({ filename: z.string().trim().min(1).max(200) });

export type CharityListQuery = z.output<typeof charityListQuery>;
export type CreateCharityInput = z.output<typeof createCharitySchema>;
export type UpdateCharityInput = z.output<typeof updateCharitySchema>;
export type CreateEventInput = z.output<typeof createEventSchema>;
export type UpdateEventInput = z.output<typeof updateEventSchema>;
