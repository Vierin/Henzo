'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  OwnerAddressPickerModal,
  type OwnerAddressPickerResult,
} from '@/components/owner/ownerAddressPickerModal';
import { OwnerPinIcon } from '@/components/owner/ownerPinIcon';
import {
  newLocationId,
  swapDefaultTrainingLocation,
  type TrainingLocationItem,
} from '@/lib/owner/training-locations';
import { ownerTheme } from '@/lib/owner/owner-theme';

export function OwnerTrainingLocationsModal({
  open,
  locations,
  mainStudioName,
  onClose,
  onChange,
  mode = 'manage',
  selectedId,
  onSelect,
}: {
  open: boolean;
  locations: TrainingLocationItem[];
  mainStudioName: string;
  onClose: () => void;
  onChange: (next: {
    locations: TrainingLocationItem[];
    address: string;
    locationName: string;
    lat: number | null;
    lon: number | null;
  }) => void;
  /** manage = studio profile default; pick = choose location for a class */
  mode?: 'manage' | 'pick';
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const [draft, setDraft] = useState<TrainingLocationItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(locations.map((l) => ({ ...l })));
  }, [open, locations]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pickerOpen) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, pickerOpen]);

  if (!open) return null;

  const primary = draft.find((l) => l.isDefault) ?? draft[0];
  const isPick = mode === 'pick';

  const commitDraft = (next: TrainingLocationItem[]) => {
    setDraft(next);
    const def = next.find((l) => l.isDefault) ?? next[0];
    if (!def) return;
    onChange({
      locations: next,
      address: def.address,
      locationName: def.name,
      lat: def.latitude ?? null,
      lon: def.longitude ?? null,
    });
  };

  const onRowClick = (id: string) => {
    if (isPick) {
      onSelect?.(id);
      onClose();
      return;
    }
    if (id === 'default' || primary?.id === id) return;
    const swapped = swapDefaultTrainingLocation({
      locations: draft,
      newDefaultId: id,
      mainStudioName,
      currentAddress: primary?.address ?? '',
      currentLat: primary?.latitude ?? null,
      currentLon: primary?.longitude ?? null,
    });
    if (!swapped) return;
    commitDraft(swapped.locations);
  };

  const onAddressResult = (result: OwnerAddressPickerResult) => {
    if (editingId === 'default' || editingId == null) {
      const next = draft.map((l) =>
        l.isDefault
          ? {
              ...l,
              name: result.locationName,
              address: result.address,
              latitude: result.lat,
              longitude: result.lon,
            }
          : l,
      );
      if (!next.some((l) => l.isDefault)) {
        next.unshift({
          id: 'default',
          name: result.locationName,
          address: result.address,
          isDefault: true,
          latitude: result.lat,
          longitude: result.lon,
        });
      }
      commitDraft(next);
    } else if (editingId === '__new__') {
      const id = newLocationId();
      commitDraft([
        ...draft,
        {
          id,
          name: result.locationName,
          address: result.address,
          isDefault: false,
          latitude: result.lat,
          longitude: result.lon,
        },
      ]);
      if (isPick) {
        onSelect?.(id);
        onClose();
      }
    } else {
      commitDraft(
        draft.map((l) =>
          l.id === editingId
            ? {
                ...l,
                name: result.locationName,
                address: result.address,
                latitude: result.lat,
                longitude: result.lon,
              }
            : l,
        ),
      );
    }
    setEditingId(null);
    setPickerOpen(false);
  };

  const editingLoc =
    editingId && editingId !== '__new__'
      ? draft.find((l) => l.id === editingId)
      : editingId === 'default'
        ? primary
        : null;

  return (
    <>
      <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
        />
        <div
          className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col rounded-t-[20px] bg-white shadow-xl sm:rounded-[20px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-5 pt-5">
            <h2
              className="text-lg font-bold"
              style={{ color: ownerTheme.text }}
            >
              Locations
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
          <p
            className="px-5 pt-1 text-sm"
            style={{ color: ownerTheme.textSecondary }}
          >
            {isPick
              ? 'Tap a location for this class.'
              : 'Tap a location to set it as default. First is used on your public page.'}
          </p>

          <div className="mt-3 flex-1 space-y-2 overflow-y-auto px-5 pb-3">
            {draft.map((loc) => {
              const highlighted = isPick
                ? loc.id === (selectedId || primary?.id)
                : loc.isDefault;
              return (
                <div
                  key={loc.id}
                  className="flex items-start gap-2 rounded-[14px] px-3 py-3"
                  style={{
                    backgroundColor: highlighted
                      ? 'rgba(241, 89, 66, 0.08)'
                      : ownerTheme.bg,
                  }}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    onClick={() => onRowClick(loc.id)}
                  >
                    <OwnerPinIcon
                      className="mt-0.5 shrink-0"
                      width={15}
                      height={18}
                    />
                    <span className="min-w-0">
                      <span
                        className="block text-[15px] font-bold"
                        style={{ color: ownerTheme.text }}
                      >
                        {loc.name || 'Location'}
                        {!isPick && loc.isDefault ? (
                          <span
                            className="ml-1.5 text-xs font-semibold"
                            style={{ color: ownerTheme.accent }}
                          >
                            Default
                          </span>
                        ) : null}
                      </span>
                      <span
                        className="mt-0.5 block text-sm"
                        style={{ color: ownerTheme.textSecondary }}
                      >
                        {loc.address || 'No address'}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2"
                    aria-label="Edit location"
                    onClick={() => {
                      setEditingId(loc.isDefault ? 'default' : loc.id);
                      setPickerOpen(true);
                    }}
                  >
                    <Pencil
                      className="h-4 w-4"
                      style={{ color: ownerTheme.textSecondary }}
                    />
                  </button>
                  {!loc.isDefault ? (
                    <button
                      type="button"
                      className="rounded-lg p-2"
                      aria-label="Delete location"
                      onClick={() =>
                        commitDraft(draft.filter((l) => l.id !== loc.id))
                      }
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div
            className="border-t px-5 py-4"
            style={{ borderColor: ownerTheme.borderSoft }}
          >
            <button
              type="button"
              onClick={() => {
                setEditingId('__new__');
                setPickerOpen(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] border-2 py-3 text-sm font-semibold"
              style={{
                borderColor: ownerTheme.accent,
                color: ownerTheme.accent,
              }}
            >
              <Plus className="h-4 w-4" />
              Add location
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full rounded-[14px] py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: ownerTheme.accent }}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      <OwnerAddressPickerModal
        open={pickerOpen}
        initialLocationName={
          editingId === '__new__' ? '' : editingLoc?.name || primary?.name || ''
        }
        initialAddress={
          editingId === '__new__' ? '' : editingLoc?.address || ''
        }
        initialLat={
          editingId === '__new__' ? null : (editingLoc?.latitude ?? null)
        }
        initialLon={
          editingId === '__new__' ? null : (editingLoc?.longitude ?? null)
        }
        onClose={() => {
          setPickerOpen(false);
          setEditingId(null);
        }}
        onSelect={onAddressResult}
      />
    </>
  );
}
