'use client';

export function AdminAddressMapPicker({
  latitude,
  longitude,
  onPick,
}: {
  latitude: number;
  longitude: number;
  onPick: (coords: { lat: number; lon: number }) => void;
}) {
  const nudge = (dLat: number, dLon: number) => {
    onPick({ lat: latitude + dLat, lon: longitude + dLon });
  };
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${
    longitude - 0.01
  }%2C${latitude - 0.01}%2C${longitude + 0.01}%2C${
    latitude + 0.01
  }&layer=mapnik&marker=${latitude}%2C${longitude}`;

  return (
    <div className="space-y-2">
      <iframe
        title="Address marker preview"
        src={mapSrc}
        className="h-[220px] w-full rounded-xl border border-zinc-200"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => nudge(0.0005, 0)}
          className="rounded border border-zinc-200 px-2 py-1 text-xs"
        >
          N
        </button>
        <button
          type="button"
          onClick={() => nudge(-0.0005, 0)}
          className="rounded border border-zinc-200 px-2 py-1 text-xs"
        >
          S
        </button>
        <button
          type="button"
          onClick={() => nudge(0, 0.0005)}
          className="rounded border border-zinc-200 px-2 py-1 text-xs"
        >
          E
        </button>
        <button
          type="button"
          onClick={() => nudge(0, -0.0005)}
          className="rounded border border-zinc-200 px-2 py-1 text-xs"
        >
          W
        </button>
      </div>
    </div>
  );
}
