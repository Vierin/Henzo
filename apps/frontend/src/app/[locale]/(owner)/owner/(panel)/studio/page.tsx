'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  createCurrentStudio,
  fetchCurrentStudio,
  updateCurrentStudio,
} from '@/lib/owner/api';
import { uploadOwnerPhoto } from '@/lib/owner/photo-storage';
import type { Studio } from '@/lib/owner/types';

export default function OwnerStudioPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const [studio, setStudio] = useState<Studio | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchCurrentStudio();
      setStudio(s);
      if (s) {
        setName(s.name ?? '');
        setDescription(s.description ?? '');
        setAddress(s.address ?? '');
        setPhone(s.phone ?? '');
        setEmail(s.email ?? '');
        setWebsite(s.website ?? '');
        setInstagram(s.instagram ?? '');
        setLogoUrl(s.logoUrl ?? '');
        setPhotos(s.photos ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const buildPayload = () => ({
    name: name.trim(),
    description: description.trim() || undefined,
    address: address.trim() || undefined,
    phone: phone.trim() || undefined,
    email: email.trim() || undefined,
    website: website.trim() || undefined,
    instagram: instagram.trim() || undefined,
    logoUrl: logoUrl || undefined,
    photos: photos.length ? photos : undefined,
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payload = buildPayload();
      if (studio?.id) {
        await updateCurrentStudio(payload);
      } else {
        await createCurrentStudio(payload);
      }
      setSuccess(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const onLogoUpload = async (file: File) => {
    const url = await uploadOwnerPhoto(file, `logo-${Date.now()}.webp`);
    setLogoUrl(url);
  };

  const onGalleryUpload = async (file: File) => {
    const url = await uploadOwnerPhoto(file, `gallery-${Date.now()}.webp`);
    setPhotos((prev) => [...prev, url]);
  };

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-[#3F3F3F]">Studio settings</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Profile, contacts, and photos for your public page.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-zinc-700">
          Studio name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Address
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-zinc-700">
            Phone
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-zinc-700">
            Website
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Instagram
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
            />
          </label>
        </div>

        <div className="border-t border-zinc-100 pt-4">
          <p className="text-sm font-semibold text-zinc-700">Photos</p>
          <div className="mt-3 flex flex-wrap gap-4">
            <div>
              <p className="mb-2 text-xs text-zinc-500">Logo</p>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : null}
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onLogoUpload(f);
                }}
              />
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                className="mt-2 text-sm text-[#3F3287]"
              >
                Upload logo
              </button>
            </div>
            <div>
              <p className="mb-2 text-xs text-zinc-500">Gallery</p>
              <div className="flex flex-wrap gap-2">
                {photos.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="h-16 w-16 rounded-xl object-cover"
                  />
                ))}
              </div>
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onGalleryUpload(f);
                }}
              />
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="mt-2 text-sm text-[#3F3287]"
              >
                Add photo
              </button>
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? (
          <p className="text-sm text-green-600">Saved successfully.</p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#3F3287] px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save studio'}
        </button>
      </form>

      {studio?.slug ? (
        <p className="mt-6 text-sm text-zinc-500">
          Public page:{' '}
          <a
            href={`/${locale}/studio/${studio.slug}`}
            className="text-[#3F3287] hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            /studio/{studio.slug}
          </a>
        </p>
      ) : null}
    </div>
  );
}
