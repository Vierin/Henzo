'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { SettingsSubpageShell } from '@/components/owner/settingsSubpageShell';
import { OwnerLocationField } from '@/components/owner/ownerLocationField';
import { OwnerTrainingLocationsModal } from '@/components/owner/ownerTrainingLocationsModal';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { resolveStudioPublicSlug } from '@/utils/slug';
import { ownerTheme } from '@/lib/owner/owner-theme';
import {
  listStudioPhotoAssets,
  STUDIO_GALLERY_MAX,
  studioPhotoAssetToJson,
  type StudioPhotoAsset,
} from '@/lib/owner/studio-photo-assets';
import {
  socialPlatformHint,
  socialPlatformIconSrc,
  socialPlatformLabel,
  STUDIO_SOCIAL_PLATFORMS,
  studioSocialLinksFromStudio,
  studioSocialLinksSnapshot,
  studioSocialLinksToPayload,
  type StudioSocialLink,
} from '@/lib/owner/studio-social';
import {
  extraLocationsToJson,
  listTrainingLocations,
  type TrainingLocationItem,
} from '@/lib/owner/training-locations';
import {
  uploadStudioGalleryAsset,
  uploadStudioLogo,
} from '@/lib/owner/upload-studio-media';

const DESCRIPTION_MAX = 250;

function SectionLabel({
  children,
  hint,
  action,
}: {
  children: React.ReactNode;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-5 first:mt-0">
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-[13px] font-medium uppercase tracking-wide"
          style={{ color: ownerTheme.textSecondary }}
        >
          {children}
        </p>
        {action}
      </div>
      {hint ? (
        <p className="mt-1 text-sm" style={{ color: ownerTheme.textSecondary }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function FieldInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength,
  rows,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  maxLength?: number;
  rows?: number;
}) {
  const className =
    'w-full rounded-[14px] bg-white px-3.5 py-3.5 text-[15px] outline-none';
  const style = { color: ownerTheme.text } as const;

  if (rows) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className={`${className} resize-none`}
        style={style}
      />
    );
  }

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className={className}
      style={style}
    />
  );
}

function hasEmbeddedLink(text: string): boolean {
  return /https?:\/\/|www\./i.test(text);
}

function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-t-[20px] bg-white p-5 shadow-xl sm:rounded-[20px]"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold" style={{ color: ownerTheme.text }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: ownerTheme.bgSoft }}
            aria-label="Close"
          >
            <X
              className="h-4 w-4"
              style={{ color: ownerTheme.textSecondary }}
            />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function StudioProfileSettingsPage() {
  const { studio, patchStudio } = useOwnerStudio();
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;

  const logoInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<StudioPhotoAsset[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locations, setLocations] = useState<TrainingLocationItem[]>([]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [socialLinks, setSocialLinks] = useState<StudioSocialLink[]>([]);

  const [locationsOpen, setLocationsOpen] = useState(false);
  const [platformPickerOpen, setPlatformPickerOpen] = useState(false);
  const [editingSocial, setEditingSocial] = useState<StudioSocialLink | null>(
    null,
  );
  const [socialDraft, setSocialDraft] = useState('');

  const [logoUploading, setLogoUploading] = useState(false);
  const [photosProcessing, setPhotosProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!studio) return;
    setLogoUrl(studio.logoUrl?.trim() || null);
    setPhotos(listStudioPhotoAssets(studio));
    setName(studio.name ?? '');
    setDescription(studio.description ?? '');
    setLocations(listTrainingLocations(studio));
    setPhone(studio.phone ?? '');
    setEmail(studio.email ?? '');
    setSocialLinks(studioSocialLinksFromStudio(studio));
  }, [studio]);

  const primary = locations.find((l) => l.isDefault) ?? locations[0];
  const address = primary?.address ?? '';
  const locationName = primary?.name ?? '';
  const lat = primary?.latitude ?? null;
  const lon = primary?.longitude ?? null;

  const dirty = useMemo(() => {
    if (!studio) return false;
    const basePhotos = listStudioPhotoAssets(studio);
    const photosChanged =
      photos.length !== basePhotos.length ||
      photos.some((p, i) => p.id !== basePhotos[i]?.id);
    const baseLocs = listTrainingLocations(studio);
    const locsChanged =
      JSON.stringify(extraLocationsToJson(locations)) !==
        JSON.stringify(extraLocationsToJson(baseLocs)) ||
      (primary?.name ?? '') !==
        (baseLocs.find((l) => l.isDefault)?.name ?? '') ||
      address !== (studio.address ?? '').trim() ||
      lat !==
        (Number.isFinite(Number(studio.latitude))
          ? Number(studio.latitude)
          : null) ||
      lon !==
        (Number.isFinite(Number(studio.longitude))
          ? Number(studio.longitude)
          : null);

    return (
      (logoUrl || '') !== (studio.logoUrl?.trim() || '') ||
      photosChanged ||
      name.trim() !== (studio.name ?? '').trim() ||
      description.trim() !== (studio.description ?? '').trim() ||
      locsChanged ||
      phone.trim() !== (studio.phone ?? '').trim() ||
      email.trim() !== (studio.email ?? '').trim() ||
      studioSocialLinksSnapshot(socialLinks) !==
        studioSocialLinksSnapshot(studioSocialLinksFromStudio(studio))
    );
  }, [
    studio,
    logoUrl,
    photos,
    name,
    description,
    locations,
    primary,
    address,
    lat,
    lon,
    phone,
    email,
    socialLinks,
  ]);

  const previewHref = studio
    ? withLocale(
        `/studio/${resolveStudioPublicSlug({
          id: studio.id,
          name: studio.name,
          slug: studio.slug,
        })}`,
        locale,
      )
    : null;

  const usedPlatforms = new Set(socialLinks.map((l) => l.platform));
  const availablePlatforms = STUDIO_SOCIAL_PLATFORMS.filter(
    (p) => !usedPlatforms.has(p),
  );

  async function onPickLogo(file: File | null) {
    if (!file || logoUploading || photosProcessing) return;
    setLogoUploading(true);
    setError(null);
    try {
      const url = await uploadStudioLogo(file);
      setLogoUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  }

  async function onPickPhotos(files: FileList | null) {
    if (!files?.length || photosProcessing || logoUploading) return;
    const room = STUDIO_GALLERY_MAX - photos.length;
    if (room <= 0) {
      setError(`Max ${STUDIO_GALLERY_MAX} photos`);
      return;
    }
    const batch = Array.from(files).slice(0, room);
    setPhotosProcessing(true);
    setError(null);
    try {
      const uploaded: StudioPhotoAsset[] = [];
      for (const file of batch) {
        uploaded.push(await uploadStudioGalleryAsset(file));
      }
      setPhotos((prev) => [...prev, ...uploaded].slice(0, STUDIO_GALLERY_MAX));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload photos');
    } finally {
      setPhotosProcessing(false);
    }
  }

  async function onSave() {
    if (!studio || saving || logoUploading || photosProcessing) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Studio name is required');
      return;
    }
    const desc = description.trim();
    if (desc.length > DESCRIPTION_MAX) {
      setError(`Description must be ${DESCRIPTION_MAX} characters or less`);
      return;
    }
    if (hasEmbeddedLink(desc)) {
      setError('Links are not allowed in the description');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const socialPayload = studioSocialLinksToPayload(socialLinks);
      const reminderSettings: NonNullable<typeof studio.reminderSettings> = {
        ...(studio.reminderSettings ?? {}),
        defaultLocationName: locationName.trim() || 'Main studio',
        trainingLocations: extraLocationsToJson(locations),
      };
      if (socialPayload.extras.length > 0) {
        reminderSettings.socialLinks = socialPayload.extras;
      } else {
        delete reminderSettings.socialLinks;
      }

      await patchStudio({
        name: trimmedName,
        description: desc,
        address: address.trim(),
        ...(lat != null && lon != null
          ? { latitude: lat, longitude: lon }
          : {}),
        ...(phone.trim() ? { phone: phone.trim() } : { phone: '' }),
        ...(email.trim() ? { email: email.trim() } : { email: '' }),
        website: socialPayload.website,
        instagram: socialPayload.instagram,
        logoUrl: logoUrl ?? '',
        photos: photos.map((p) => p.heroUrl),
        photoGallery: photos.map(studioPhotoAssetToJson),
        reminderSettings,
      });
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSubpageShell
      title="Studio profile"
      action={
        <button
          type="button"
          disabled={
            !dirty || saving || !studio || logoUploading || photosProcessing
          }
          onClick={() => void onSave()}
          className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: ownerTheme.accent }}
        >
          {saving ? 'Saving…' : savedFlash ? 'Saved' : 'Save'}
        </button>
      }
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p
            className="text-[13px] font-medium uppercase tracking-wide"
            style={{ color: ownerTheme.textSecondary }}
          >
            Studio logo
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: ownerTheme.textSecondary }}
          >
            Square image, up to 3 MB after compression
          </p>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            disabled={logoUploading}
            onClick={() => logoInputRef.current?.click()}
            className="flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-[18px] bg-white md:h-[96px] md:w-[96px]"
            aria-label="Upload studio logo"
          >
            {logoUploading ? (
              <Loader2
                className="h-5 w-5 animate-spin"
                style={{ color: ownerTheme.textSecondary }}
              />
            ) : logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <ImagePlus
                className="h-7 w-7"
                style={{ color: ownerTheme.textSecondary }}
              />
            )}
          </button>
          {logoUrl && !logoUploading ? (
            <button
              type="button"
              onClick={() => setLogoUrl(null)}
              className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow"
              aria-label="Remove logo"
            >
              <X className="h-3 w-3" style={{ color: ownerTheme.text }} />
            </button>
          ) : null}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void onPickLogo(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <SectionLabel
        hint={`Up to ${STUDIO_GALLERY_MAX} photos. First is the cover.`}
      >
        Studio photos
      </SectionLabel>
      <div className="mt-3 rounded-[14px] bg-white p-3">
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="relative h-36 w-36 shrink-0 overflow-hidden rounded-[14px] md:h-40 md:w-40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.cardUrl || photo.heroUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              {index === 0 ? (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Main
                </span>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/50 to-transparent p-1.5">
                <button
                  type="button"
                  className="rounded bg-white/90 p-1"
                  aria-label="Remove photo"
                  onClick={() =>
                    setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
                  }
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                </button>
              </div>
            </div>
          ))}
          {photos.length < STUDIO_GALLERY_MAX ? (
            <button
              type="button"
              disabled={photosProcessing}
              onClick={() => photosInputRef.current?.click()}
              className="flex h-36 w-36 shrink-0 flex-col items-center justify-center gap-1 rounded-[14px] border-2 border-dashed md:h-40 md:w-40"
              style={{
                borderColor: ownerTheme.border,
                color: ownerTheme.textSecondary,
              }}
            >
              {photosProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  <span className="text-xs font-medium">Add</span>
                </>
              )}
            </button>
          ) : null}
        </div>
        <input
          ref={photosInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void onPickPhotos(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <SectionLabel>Main info</SectionLabel>
      <div className="mt-2 space-y-2">
        <FieldInput value={name} onChange={setName} placeholder="Studio name" />
        <div>
          <FieldInput
            value={description}
            onChange={setDescription}
            placeholder="Describe your salon"
            rows={4}
            maxLength={DESCRIPTION_MAX}
          />
          <p
            className="mt-1 text-right text-xs"
            style={{ color: ownerTheme.textSecondary }}
          >
            {description.length}/{DESCRIPTION_MAX}
          </p>
        </div>

        <OwnerLocationField
          name={locationName}
          address={address}
          onClick={() => setLocationsOpen(true)}
        />
      </div>

      <SectionLabel>Contact info</SectionLabel>
      <div className="mt-2 space-y-2">
        <FieldInput
          value={phone}
          onChange={setPhone}
          placeholder="Phone"
          type="tel"
        />
        <FieldInput
          value={email}
          onChange={setEmail}
          placeholder="Email"
          type="email"
        />
      </div>

      <SectionLabel
        action={
          availablePlatforms.length > 0 ? (
            <button
              type="button"
              onClick={() => setPlatformPickerOpen(true)}
              className="inline-flex items-center gap-1 text-sm font-semibold"
              style={{ color: ownerTheme.accent }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add social link
            </button>
          ) : null
        }
      >
        Social links
      </SectionLabel>
      <div className="mt-2 space-y-2">
        {socialLinks.map((link) => (
          <div
            key={link.platform}
            className="flex items-center gap-2.5 rounded-[14px] bg-white px-3.5 py-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={socialPlatformIconSrc(link.platform)}
              alt=""
              className="h-7 w-7 shrink-0 object-contain"
            />
            <span className="min-w-0 flex-1">
              <span
                className="block text-xs font-semibold uppercase tracking-wide"
                style={{ color: ownerTheme.textSecondary }}
              >
                {socialPlatformLabel(link.platform)}
              </span>
              <span
                className="mt-0.5 block truncate text-[15px]"
                style={{ color: ownerTheme.text }}
              >
                {link.value.trim() || '—'}
              </span>
            </span>
            <button
              type="button"
              className="rounded-lg p-2"
              aria-label="Edit link"
              onClick={() => {
                setEditingSocial(link);
                setSocialDraft(link.value);
              }}
            >
              <Pencil
                className="h-4 w-4"
                style={{ color: ownerTheme.textSecondary }}
              />
            </button>
            <button
              type="button"
              className="rounded-lg p-2"
              aria-label="Remove link"
              onClick={() =>
                setSocialLinks((prev) =>
                  prev.filter((l) => l.platform !== link.platform),
                )
              }
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          </div>
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {previewHref ? (
        <Link
          href={previewHref}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex w-full items-center justify-center rounded-full py-3 text-sm font-semibold text-white"
          style={{ backgroundColor: ownerTheme.accent }}
        >
          Salon preview
        </Link>
      ) : null}

      <OwnerTrainingLocationsModal
        open={locationsOpen}
        locations={locations}
        mainStudioName={name.trim() || studio?.name || 'Main studio'}
        onClose={() => setLocationsOpen(false)}
        onChange={(next) => {
          setLocations(next.locations);
        }}
      />

      <Sheet
        open={platformPickerOpen}
        title="Add social link"
        onClose={() => setPlatformPickerOpen(false)}
      >
        <div className="space-y-1">
          {availablePlatforms.map((platform) => (
            <button
              key={platform}
              type="button"
              className="flex w-full items-center gap-3 rounded-[12px] px-3 py-3 text-left text-[15px] font-medium hover:bg-[#FCF3EC]"
              style={{ color: ownerTheme.text }}
              onClick={() => {
                setPlatformPickerOpen(false);
                setEditingSocial({ platform, value: '' });
                setSocialDraft('');
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={socialPlatformIconSrc(platform)}
                alt=""
                className="h-7 w-7 shrink-0 object-contain"
              />
              {socialPlatformLabel(platform)}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet
        open={Boolean(editingSocial)}
        title={
          editingSocial
            ? socialPlatformLabel(editingSocial.platform)
            : 'Social link'
        }
        onClose={() => setEditingSocial(null)}
      >
        <input
          type={editingSocial?.platform === 'whatsApp' ? 'tel' : 'text'}
          value={socialDraft}
          onChange={(e) => setSocialDraft(e.target.value)}
          placeholder={
            editingSocial ? socialPlatformHint(editingSocial.platform) : ''
          }
          className="w-full rounded-[14px] px-3.5 py-3.5 text-[15px] outline-none"
          style={{
            backgroundColor: ownerTheme.bg,
            color: ownerTheme.text,
          }}
          autoFocus
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setEditingSocial(null)}
            className="flex-1 rounded-[14px] bg-[#FCF3EC] py-3 text-sm font-semibold"
            style={{ color: ownerTheme.text }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!editingSocial) return;
              const value = socialDraft.trim();
              if (!value) {
                setSocialLinks((prev) =>
                  prev.filter((l) => l.platform !== editingSocial.platform),
                );
              } else {
                setSocialLinks((prev) => {
                  const exists = prev.some(
                    (l) => l.platform === editingSocial.platform,
                  );
                  if (exists) {
                    return prev.map((l) =>
                      l.platform === editingSocial.platform
                        ? { ...l, value }
                        : l,
                    );
                  }
                  return [...prev, { platform: editingSocial.platform, value }];
                });
              }
              setEditingSocial(null);
            }}
            className="flex-1 rounded-[14px] py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: ownerTheme.accent }}
          >
            Save
          </button>
        </div>
      </Sheet>
    </SettingsSubpageShell>
  );
}
