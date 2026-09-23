'use client';

import { Loader2, Upload } from 'lucide-react';
import { useId, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, FormNotice, Select, TextInput, Textarea } from '@/components/ui/field';
import { Stack } from '@/components/ui/layout';
import { useToast } from '@/components/ui/toast';
import { ADMIN_CHARITIES } from '@/content/admin';
import { apiPatch, apiPost, ApiClientError } from '@/lib/api-client';
import { browserClient } from '@/lib/supabase/browser';
import type { Charity } from '@/lib/types';
import { CATEGORY_ART } from '@/components/charities/category-art';

const T = ADMIN_CHARITIES.form;
const CATEGORIES = Object.keys(CATEGORY_ART);

export interface CharityWithImage extends Charity {
  image_url: string | null;
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Create or edit a charity. The image uploads straight to Storage (see requestProofUpload's comment
 * on why: server route bodies are size-limited), then its path is saved with the rest of the form. */
export function CharityForm({ charity, onSaved, onCancel }: { charity?: CharityWithImage; onSaved: (charity: CharityWithImage) => void; onCancel: () => void }) {
  const ids = { name: useId(), slug: useId(), category: useId(), summary: useId(), description: useId() };
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = !!charity;

  const [name, setName] = useState(charity?.name ?? '');
  const [slug, setSlug] = useState(charity?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(isEdit);
  const [category, setCategory] = useState(charity?.category ?? CATEGORIES[0]);
  const [summary, setSummary] = useState(charity?.summary ?? '');
  const [description, setDescription] = useState(charity?.description ?? '');
  const [imagePath, setImagePath] = useState(charity?.image_path ?? null);
  const [imagePreview, setImagePreview] = useState(charity?.image_url ?? null);
  const [featured, setFeatured] = useState(charity?.is_featured ?? false);
  const [active, setActive] = useState(charity?.is_active ?? true);

  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { path, token, public_url } = await apiPost<{ path: string; token: string; public_url: string }>('/api/admin/media/upload-url', {
        filename: file.name,
      });
      const { error: uploadError } = await browserClient().storage.from('charity-media').uploadToSignedUrl(path, token, file);
      if (uploadError) throw uploadError;
      setImagePath(path);
      setImagePreview(public_url);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : 'Could not upload that image.');
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const body = { name, slug, category, summary, description, image_path: imagePath, is_featured: featured, is_active: active };
    try {
      const result = isEdit
        ? await apiPatch<{ charity: CharityWithImage }>(`/api/admin/charities/${charity.id}`, body)
        : await apiPost<{ charity: CharityWithImage }>('/api/admin/charities', body);
      onSaved(result.charity);
      toast({ title: isEdit ? 'Charity updated.' : 'Charity created.', tone: 'success' });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save that charity.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-line bg-canvas-alt p-card">
      <Stack gap="lg">
        <Field label={T.nameLabel} htmlFor={ids.name} required>
          <TextInput
            id={ids.name}
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
          />
        </Field>
        <Field label={T.slugLabel} htmlFor={ids.slug} hint={T.slugHint} required>
          <TextInput
            id={ids.slug}
            required
            pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
          />
        </Field>
        <Field label={T.categoryLabel} htmlFor={ids.category}>
          <Select id={ids.category} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={T.summaryLabel} htmlFor={ids.summary}>
          <TextInput id={ids.summary} maxLength={300} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </Field>
        <Field label={T.descriptionLabel} htmlFor={ids.description}>
          <Textarea id={ids.description} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div>
          <span className="type-label text-fg">{T.imageLabel}</span>
          <div className="mt-2 flex items-center gap-4">
            {imagePreview && (
              // eslint-disable-next-line @next/next/no-img-element -- a short-lived preview of an already-uploaded file
              <img src={imagePreview} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              id="charity-image"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
              }}
            />
            <label
              htmlFor="charity-image"
              className="inline-flex min-h-touch w-fit cursor-pointer items-center gap-2 rounded-pill border border-line-strong px-4 type-label text-fg transition-colors motion-base hover:border-fg"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
              {uploading ? T.uploading : T.imageLabel}
            </label>
          </div>
        </div>

        <Checkbox label={T.featuredLabel} checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        <Checkbox label={T.activeLabel} checked={active} onChange={(e) => setActive(e.target.checked)} />

        {error && <FormNotice>{error}</FormNotice>}

        <div className="flex gap-3">
          <Button type="submit" disabled={busy || uploading}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : T.save}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            {T.cancel}
          </Button>
        </div>
      </Stack>
    </form>
  );
}
